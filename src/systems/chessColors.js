//======================================================================
//                    CHESS COLOR ASSIGNMENT SYSTEM
//======================================================================

const DataManager = require('../utils/dataManager');
const dataManager = new DataManager();

// Track last colors played by each user
function getPlayerColorHistory(guildId, userId) {
    const colorData = dataManager.loadFile(guildId, 'chess_colors.json');
    
    if (!colorData[userId]) {
        colorData[userId] = {
            lastColors: [], // Last 3 games colors
            totalWhite: 0,
            totalBlack: 0
        };
        dataManager.saveFile(guildId, 'chess_colors.json', colorData);
    }
    
    return colorData[userId];
}

// Update color history after game
function updateColorHistory(guildId, userId, color) {
    const colorData = dataManager.loadFile(guildId, 'chess_colors.json');
    
    if (!colorData[userId]) {
        colorData[userId] = {
            lastColors: [],
            totalWhite: 0,
            totalBlack: 0
        };
    }
    
    // Add to last colors (keep only last 3)
    colorData[userId].lastColors.push(color);
    if (colorData[userId].lastColors.length > 3) {
        colorData[userId].lastColors.shift();
    }
    
    // Update totals
    if (color === 'white') {
        colorData[userId].totalWhite++;
    } else {
        colorData[userId].totalBlack++;
    }
    
    dataManager.saveFile(guildId, 'chess_colors.json', colorData);
}

// Assign colors fairly
function assignColors(guildId, player1Id, player2Id) {
    const p1History = getPlayerColorHistory(guildId, player1Id);
    const p2History = getPlayerColorHistory(guildId, player2Id);
    
    // Check if either player has streak
    const p1LastTwo = p1History.lastColors.slice(-2);
    const p2LastTwo = p2History.lastColors.slice(-2);
    
    const p1HasWhiteStreak = p1LastTwo.length === 2 && p1LastTwo.every(c => c === 'white');
    const p1HasBlackStreak = p1LastTwo.length === 2 && p1LastTwo.every(c => c === 'black');
    const p2HasWhiteStreak = p2LastTwo.length === 2 && p2LastTwo.every(c => c === 'white');
    const p2HasBlackStreak = p2LastTwo.length === 2 && p2LastTwo.every(c => c === 'black');
    
    let whitePlayer, blackPlayer;
    
    // Priority 1: If someone has 2 black games in a row, give them white
    if (p1HasBlackStreak && !p2HasBlackStreak) {
        whitePlayer = player1Id;
        blackPlayer = player2Id;
    } else if (p2HasBlackStreak && !p1HasBlackStreak) {
        whitePlayer = player2Id;
        blackPlayer = player1Id;
    }
    // Priority 2: If someone has 2 white games in a row, give them black
    else if (p1HasWhiteStreak && !p2HasWhiteStreak) {
        whitePlayer = player2Id;
        blackPlayer = player1Id;
    } else if (p2HasWhiteStreak && !p1HasWhiteStreak) {
        whitePlayer = player1Id;
        blackPlayer = player2Id;
    }
    // Priority 3: Balance based on total games
    else if (p1History.totalWhite > p1History.totalBlack + 2) {
        // Player 1 has played white much more
        whitePlayer = player2Id;
        blackPlayer = player1Id;
    } else if (p1History.totalBlack > p1History.totalWhite + 2) {
        // Player 1 has played black much more
        whitePlayer = player1Id;
        blackPlayer = player2Id;
    } else if (p2History.totalWhite > p2History.totalBlack + 2) {
        // Player 2 has played white much more
        whitePlayer = player1Id;
        blackPlayer = player2Id;
    } else if (p2History.totalBlack > p2History.totalWhite + 2) {
        // Player 2 has played black much more
        whitePlayer = player2Id;
        blackPlayer = player1Id;
    }
    // Priority 4: Random
    else {
        const random = Math.random() < 0.5;
        whitePlayer = random ? player1Id : player2Id;
        blackPlayer = random ? player2Id : player1Id;
    }
    
    // Update history
    updateColorHistory(guildId, whitePlayer, 'white');
    updateColorHistory(guildId, blackPlayer, 'black');
    
    return {
        white: whitePlayer,
        black: blackPlayer,
        method: p1HasBlackStreak || p2HasBlackStreak ? 'streak_balance' :
                p1HasWhiteStreak || p2HasWhiteStreak ? 'streak_balance' :
                Math.abs(p1History.totalWhite - p1History.totalBlack) > 2 ? 'total_balance' :
                Math.abs(p2History.totalWhite - p2History.totalBlack) > 2 ? 'total_balance' :
                'random'
    };
}

module.exports = {
    assignColors,
    updateColorHistory
};
