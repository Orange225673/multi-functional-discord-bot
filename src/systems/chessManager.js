//======================================================================
//                    CHESS MANAGER (Game Logic)
//======================================================================

const { Chess } = require('chess.js');
const { EmbedBuilder } = require('discord.js');

const pendingGames = new Map();
const activeGames = new Map();
const timeoutIntervals = new Map(); // Track timeout checkers

/* -------------------- UTILS -------------------- */

function now() {
    return Date.now();
}

function formatTime(ms) {
    if (ms <= 0) return "00:00";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

/* -------------------- PENDING -------------------- */

function createPendingGame(p1, p2, durationMs) {
    pendingGames.set(p2, {
        p1,
        p2,
        durationMs,
        createdAt: now()
    });
}

function confirmGame(p2, p1, channelId, guildId) {
    const pending = pendingGames.get(p2);
    if (!pending || pending.p1 !== p1) return null;

    const { assignColors } = require('./chessColors');
    const colors = assignColors(guildId, p1, p2);

    const gameId = `${colors.white}-${colors.black}`;
    const chess = new Chess();

    const game = {
        id: gameId,
        chess,
        players: {
            white: colors.white,
            black: colors.black
        },
        clocks: {
            white: pending.durationMs,
            black: pending.durationMs
        },
        lastTurnAt: now(),
        lastMove: null,
        drawOffer: null,
        channelId: channelId, // Store channel ID
        colorMethod: colors.method // How colors were assigned
    };

    activeGames.set(gameId, game);
    pendingGames.delete(p2);
    return game;
}

/* -------------------- FIND GAME -------------------- */

function getGameByPlayer(userId) {
    for (const game of activeGames.values()) {
        if (game.players.white === userId || game.players.black === userId) {
            return game;
        }
    }
    return null;
}

/* -------------------- TIME -------------------- */

function updateClock(game) {
    const elapsed = now() - game.lastTurnAt;

    // Subtract time from whoever's turn it is (current player thinking)
    if (game.chess.turn() === "w") {
        game.clocks.white -= elapsed;
    } else {
        game.clocks.black -= elapsed;
    }

    game.lastTurnAt = now();
}

function checkTimeout(game) {
    updateClock(game); // Update clock first

    if (game.clocks.white <= 0) return { loser: "white", winner: "black" };
    if (game.clocks.black <= 0) return { loser: "black", winner: "white" };
    return null;
}

// Start automatic timeout checker for a game
function startTimeoutChecker(client, game) {
    const gameId = game.id;

    // Check every second
    const intervalId = setInterval(async () => {
        const currentGame = activeGames.get(gameId);
        if (!currentGame) {
            // Game ended, clear interval
            clearInterval(intervalId);
            timeoutIntervals.delete(gameId);
            return;
        }

        const timeout = checkTimeout(currentGame);
        if (timeout) {
            // Time's up! End game
            activeGames.delete(gameId);
            clearInterval(intervalId);
            timeoutIntervals.delete(gameId);

            // Send timeout message
            await handleTimeout(client, currentGame, timeout);
        }
    }, 1000); // Check every second

    timeoutIntervals.set(gameId, intervalId);
}

// Handle timeout notification
async function handleTimeout(client, game, timeout) {
    try {
        const channel = await client.channels.fetch(game.channelId);
        if (!channel) return;

        const { updateElo, PROVISIONAL_GAMES } = require('./chessElo');
        const winnerId = timeout.winner === 'white' ? game.players.white : game.players.black;
        const loserId = timeout.loser === 'white' ? game.players.white : game.players.black;

        // Get guild ID from channel
        const guildId = channel.guild.id;

        // Update ELO
        const eloUpdate = updateElo(guildId, winnerId, loserId, false);

        const winnerColor = timeout.winner === 'white' ? '⚪ White' : '⚫ Black';

        const embed = new EmbedBuilder()
            .setTitle('⏱️ Game Over - Timeout')
            .setDescription(`${winnerColor} wins by timeout!`)
            .setColor(0xFF0000)
            .addFields(
                { name: '🏆 Winner', value: `<@${winnerId}>`, inline: true },
                { name: '⏱️ Time Out', value: `<@${loserId}>`, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: '📈 ELO Changes',
                    value: `<@${winnerId}>: **${eloUpdate.winner.oldElo}** → **${eloUpdate.winner.newElo}** (${eloUpdate.winner.change >= 0 ? '+' : ''}${eloUpdate.winner.change})\n<@${loserId}>: **${eloUpdate.loser.oldElo}** → **${eloUpdate.loser.newElo}** (${eloUpdate.loser.change >= 0 ? '+' : ''}${eloUpdate.loser.change})`,
                    inline: false
                }
            );

        if (eloUpdate.winner.games < PROVISIONAL_GAMES || eloUpdate.loser.games < PROVISIONAL_GAMES) {
            embed.setFooter({ text: `Ratings show after ${PROVISIONAL_GAMES} games` });
        }

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error handling timeout:', error);
    }
}

// Stop timeout checker for a game
function stopTimeoutChecker(gameId) {
    const intervalId = timeoutIntervals.get(gameId);
    if (intervalId) {
        clearInterval(intervalId);
        timeoutIntervals.delete(gameId);
    }
}

/* -------------------- DRAW CONDITIONS -------------------- */

function checkDrawConditions(chess) {
    const draws = [];

    // Stalemate
    if (chess.isStalemate()) {
        draws.push('stalemate');
    }

    // Threefold repetition
    if (chess.isThreefoldRepetition()) {
        draws.push('threefold');
    }

    // Insufficient material
    if (chess.isInsufficientMaterial()) {
        draws.push('insufficient');
    }

    // 50-move rule
    const history = chess.history({ verbose: true });
    if (history.length >= 100) {
        // Check last 100 half-moves for captures or pawn moves
        let fiftyMoveCount = 0;
        for (let i = history.length - 1; i >= 0 && i >= history.length - 100; i--) {
            const move = history[i];
            if (move.captured || move.piece === 'p') {
                break;
            }
            fiftyMoveCount++;
        }
        if (fiftyMoveCount >= 100) {
            draws.push('fifty');
        }
    }

    return draws;
}

function getDrawReason(drawType) {
    switch (drawType) {
        case 'stalemate':
            return 'Stalemate - No legal moves available';
        case 'threefold':
            return 'Draw by threefold repetition';
        case 'insufficient':
            return 'Draw by insufficient material';
        case 'fifty':
            return 'Draw by 50-move rule';
        case 'agreement':
            return 'Draw by mutual agreement';
        default:
            return 'Draw';
    }
}

/* -------------------- MOVE -------------------- */

function tryMove(userId, text) {
    const game = getGameByPlayer(userId);
    if (!game) return null;

    const turn = game.chess.turn();
    const correct = (turn === "w" && game.players.white === userId) || (turn === "b" && game.players.black === userId);

    if (!correct) return null;

    updateClock(game);
    const timeout = checkTimeout(game);
    if (timeout) {
        // Game over by timeout - remove from active games
        activeGames.delete(game.id);
        stopTimeoutChecker(game.id);

        return {
            timeout,
            whiteId: game.players.white,
            blackId: game.players.black,
            winnerId: timeout.winner === 'white' ? game.players.white : game.players.black,
            loserId: timeout.winner === 'white' ? game.players.black : game.players.white,
            gameOver: true
        };
    }

    // Try to make the move with error handling
    let move;
    try {
        move = game.chess.move(text, { sloppy: true });
    } catch (error) {
        // Invalid move - chess.js threw an error
        return null;
    }

    if (!move) return null;

    game.lastMove = move;
    game.drawOffer = null;

    // Check for draw conditions
    const drawConditions = checkDrawConditions(game.chess);
    const isDraw = drawConditions.length > 0;

    // Get player IDs for ELO updates
    const whiteId = game.players.white;
    const blackId = game.players.black;
    const winnerId = game.chess.isCheckmate() ? (move.color === 'w' ? whiteId : blackId) : null;
    const loserId = game.chess.isCheckmate() ? (move.color === 'w' ? blackId : whiteId) : null;

    // If game ends in draw, remove it from active games
    if (isDraw) {
        activeGames.delete(game.id);
        stopTimeoutChecker(game.id);
    }

    // If game ends in checkmate, remove it from active games
    if (game.chess.isCheckmate()) {
        activeGames.delete(game.id);
        stopTimeoutChecker(game.id);
    }

    return {
        fen: game.chess.fen(),
        move,
        clocks: {
            white: formatTime(game.clocks.white),
            black: formatTime(game.clocks.black)
        },
        check: game.chess.isCheck(),
        gameOver: game.chess.isGameOver(),
        checkmate: game.chess.isCheckmate(),
        stalemate: game.chess.isStalemate(),
        draw: isDraw,
        drawType: drawConditions[0] || null,
        drawReason: isDraw ? getDrawReason(drawConditions[0]) : null,
        threefoldRepetition: game.chess.isThreefoldRepetition(),
        insufficientMaterial: game.chess.isInsufficientMaterial(),
        // Player info for ELO
        whiteId,
        blackId,
        winnerId,
        loserId,
        channelId: game.channelId
    };
}

/* -------------------- RESIGN -------------------- */

function resign(userId, guildId) {
    const game = getGameByPlayer(userId);
    if (!game) return null;

    const winner = game.players.white === userId ? "black" : "white";
    const winnerId = game.players[winner];
    const loserId = userId;

    activeGames.delete(game.id);
    stopTimeoutChecker(game.id);

    return {
        winner,
        winnerId,
        loserId,
        guildId
    };
}

/* -------------------- DRAW -------------------- */

function offerDraw(userId) {
    const game = getGameByPlayer(userId);
    if (!game) return null;

    game.drawOffer = userId;
    return true;
}

function acceptDraw(userId, guildId) {
    const game = getGameByPlayer(userId);
    if (!game || game.drawOffer === null) return null;

    if (game.drawOffer === userId) return null;

    const player1 = game.players.white;
    const player2 = game.players.black;

    activeGames.delete(game.id);
    stopTimeoutChecker(game.id);

    return {
        drawType: 'agreement',
        drawReason: getDrawReason('agreement'),
        player1,
        player2,
        guildId
    };
}

module.exports = {
    pendingGames,
    activeGames,
    createPendingGame,
    confirmGame,
    getGameByPlayer,
    tryMove,
    resign,
    offerDraw,
    acceptDraw,
    formatTime,
    startTimeoutChecker
};
