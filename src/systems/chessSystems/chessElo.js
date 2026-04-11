//======================================================================
//                    CHESS ELO RATING SYSTEM
//======================================================================

const DataManager = require('../../utils/dataManager');
const dataManager = new DataManager();

// ELO Constants
const BASE_ELO = 400;
const PROVISIONAL_GAMES = 5; // Show rating after 5 games
const K_FACTOR_NEW = 40;      // High volatility for new players
const K_FACTOR_REGULAR = 20;  // Regular players
const K_FACTOR_EXPERT = 10;   // Players above 2000 ELO

// Get or create player ELO data
function getPlayerElo(guildId, userId) {
    const eloData = dataManager.loadFile(guildId, 'chess_elo.json');
    
    if (!eloData[userId]) {
        eloData[userId] = {
            elo: BASE_ELO,
            games: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            provisional: true,
            history: []
        };
        dataManager.saveFile(guildId, 'chess_elo.json', eloData);
    }
    
    return eloData[userId];
}

// Get global ELO (across all servers)
function getGlobalElo(userId) {
    const globalData = dataManager.loadFile('global', 'chess_global_elo.json');
    
    if (!globalData[userId]) {
        globalData[userId] = {
            elo: BASE_ELO,
            games: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            provisional: true,
            servers: {},
            history: []
        };
        dataManager.saveFile('global', 'chess_global_elo.json', globalData);
    }
    
    return globalData[userId];
}

// Calculate K-factor based on player stats
function getKFactor(playerData) {
    // New/provisional players get high K-factor
    if (playerData.provisional || playerData.games < PROVISIONAL_GAMES) {
        return K_FACTOR_NEW;
    }
    
    // Expert players (2000+) get low K-factor
    if (playerData.elo >= 2000) {
        return K_FACTOR_EXPERT;
    }
    
    // Regular players
    return K_FACTOR_REGULAR;
}

// Calculate expected score (probability of winning)
function getExpectedScore(playerElo, opponentElo) {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

// Update ELO after a game
function updateElo(guildId, winnerId, loserId, isDraw = false) {
    const eloData = dataManager.loadFile(guildId, 'chess_elo.json');
    const globalData = dataManager.loadFile('global', 'chess_global_elo.json');
    
    // Get player data
    const winner = getPlayerElo(guildId, winnerId);
    const loser = getPlayerElo(guildId, loserId);
    const globalWinner = getGlobalElo(winnerId);
    const globalLoser = getGlobalElo(loserId);
    
    // Calculate expected scores
    const expectedWinner = getExpectedScore(winner.elo, loser.elo);
    const expectedLoser = getExpectedScore(loser.elo, winner.elo);
    
    // Actual scores (1 = win, 0.5 = draw, 0 = loss)
    const actualWinner = isDraw ? 0.5 : 1;
    const actualLoser = isDraw ? 0.5 : 0;
    
    // Get K-factors
    const kWinner = getKFactor(winner);
    const kLoser = getKFactor(loser);
    
    // Calculate ELO changes
    const winnerChange = Math.round(kWinner * (actualWinner - expectedWinner));
    const loserChange = Math.round(kLoser * (actualLoser - expectedLoser));
    
    // Old ELOs for history
    const oldWinnerElo = winner.elo;
    const oldLoserElo = loser.elo;
    
    // Update server ELOs
    winner.elo += winnerChange;
    loser.elo += loserChange;
    winner.games++;
    loser.games++;
    
    if (isDraw) {
        winner.draws++;
        loser.draws++;
    } else {
        winner.wins++;
        loser.losses++;
    }
    
    // Check if still provisional
    if (winner.games >= PROVISIONAL_GAMES) {
        winner.provisional = false;
    }
    if (loser.games >= PROVISIONAL_GAMES) {
        loser.provisional = false;
    }
    
    // Add to history
    winner.history.push({
        opponent: loserId,
        result: isDraw ? 'draw' : 'win',
        eloChange: winnerChange,
        newElo: winner.elo,
        timestamp: Date.now()
    });
    
    loser.history.push({
        opponent: winnerId,
        result: isDraw ? 'draw' : 'loss',
        eloChange: loserChange,
        newElo: loser.elo,
        timestamp: Date.now()
    });
    
    // Keep only last 20 games in history
    if (winner.history.length > 20) winner.history = winner.history.slice(-20);
    if (loser.history.length > 20) loser.history = loser.history.slice(-20);
    
    // Update server data
    eloData[winnerId] = winner;
    eloData[loserId] = loser;
    dataManager.saveFile(guildId, 'chess_elo.json', eloData);
    
    // Update global ELOs with same logic
    const globalExpectedWinner = getExpectedScore(globalWinner.elo, globalLoser.elo);
    const globalExpectedLoser = getExpectedScore(globalLoser.elo, globalWinner.elo);
    
    const globalKWinner = getKFactor(globalWinner);
    const globalKLoser = getKFactor(globalLoser);
    
    const globalWinnerChange = Math.round(globalKWinner * (actualWinner - globalExpectedWinner));
    const globalLoserChange = Math.round(globalKLoser * (actualLoser - globalExpectedLoser));
    
    globalWinner.elo += globalWinnerChange;
    globalLoser.elo += globalLoserChange;
    globalWinner.games++;
    globalLoser.games++;
    
    if (isDraw) {
        globalWinner.draws++;
        globalLoser.draws++;
    } else {
        globalWinner.wins++;
        globalLoser.losses++;
    }
    
    if (globalWinner.games >= PROVISIONAL_GAMES) {
        globalWinner.provisional = false;
    }
    if (globalLoser.games >= PROVISIONAL_GAMES) {
        globalLoser.provisional = false;
    }
    
    // Track server participation
    if (!globalWinner.servers[guildId]) {
        globalWinner.servers[guildId] = { games: 0, elo: BASE_ELO };
    }
    if (!globalLoser.servers[guildId]) {
        globalLoser.servers[guildId] = { games: 0, elo: BASE_ELO };
    }
    
    globalWinner.servers[guildId].games++;
    globalLoser.servers[guildId].games++;
    globalWinner.servers[guildId].elo = winner.elo;
    globalLoser.servers[guildId].elo = loser.elo;
    
    globalWinner.history.push({
        opponent: loserId,
        server: guildId,
        result: isDraw ? 'draw' : 'win',
        eloChange: globalWinnerChange,
        newElo: globalWinner.elo,
        timestamp: Date.now()
    });
    
    globalLoser.history.push({
        opponent: winnerId,
        server: guildId,
        result: isDraw ? 'draw' : 'loss',
        eloChange: globalLoserChange,
        newElo: globalLoser.elo,
        timestamp: Date.now()
    });
    
    if (globalWinner.history.length > 50) globalWinner.history = globalWinner.history.slice(-50);
    if (globalLoser.history.length > 50) globalLoser.history = globalLoser.history.slice(-50);
    
    globalData[winnerId] = globalWinner;
    globalData[loserId] = globalLoser;
    dataManager.saveFile('global', 'chess_global_elo.json', globalData);
    
    return {
        winner: {
            oldElo: oldWinnerElo,
            newElo: winner.elo,
            change: winnerChange,
            globalChange: globalWinnerChange,
            globalElo: globalWinner.elo,
            provisional: winner.provisional,
            games: winner.games
        },
        loser: {
            oldElo: oldLoserElo,
            newElo: loser.elo,
            change: loserChange,
            globalChange: globalLoserChange,
            globalElo: globalLoser.elo,
            provisional: loser.provisional,
            games: loser.games
        }
    };
}

// Get server leaderboard
function getServerLeaderboard(guildId, limit = 10) {
    const eloData = dataManager.loadFile(guildId, 'chess_elo.json');
    
    const players = Object.entries(eloData)
        .filter(([userId, data]) => data.games >= PROVISIONAL_GAMES)
        .map(([userId, data]) => ({
            userId,
            elo: data.elo,
            games: data.games,
            wins: data.wins,
            losses: data.losses,
            draws: data.draws,
            winRate: data.games > 0 ? ((data.wins / data.games) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.elo - a.elo)
        .slice(0, limit);
    
    return players;
}

// Get global leaderboard
function getGlobalLeaderboard(limit = 10) {
    const globalData = dataManager.loadFile('global', 'chess_global_elo.json');
    
    const players = Object.entries(globalData)
        .filter(([userId, data]) => data.games >= PROVISIONAL_GAMES)
        .map(([userId, data]) => ({
            userId,
            elo: data.elo,
            games: data.games,
            wins: data.wins,
            losses: data.losses,
            draws: data.draws,
            servers: Object.keys(data.servers).length,
            winRate: data.games > 0 ? ((data.wins / data.games) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.elo - a.elo)
        .slice(0, limit);
    
    return players;
}

// Get player stats
function getPlayerStats(guildId, userId) {
    const serverData = getPlayerElo(guildId, userId);
    const globalData = getGlobalElo(userId);
    
    return {
        server: {
            elo: serverData.elo,
            games: serverData.games,
            wins: serverData.wins,
            losses: serverData.losses,
            draws: serverData.draws,
            provisional: serverData.provisional,
            winRate: serverData.games > 0 ? ((serverData.wins / serverData.games) * 100).toFixed(1) : 0,
            recentHistory: serverData.history.slice(-5)
        },
        global: {
            elo: globalData.elo,
            games: globalData.games,
            wins: globalData.wins,
            losses: globalData.losses,
            draws: globalData.draws,
            provisional: globalData.provisional,
            servers: Object.keys(globalData.servers).length,
            winRate: globalData.games > 0 ? ((globalData.wins / globalData.games) * 100).toFixed(1) : 0,
            recentHistory: globalData.history.slice(-5)
        }
    };
}

module.exports = {
    updateElo,
    getPlayerElo,
    getGlobalElo,
    getServerLeaderboard,
    getGlobalLeaderboard,
    getPlayerStats,
    BASE_ELO,
    PROVISIONAL_GAMES
};
