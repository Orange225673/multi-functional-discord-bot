//======================================================================
//                         CHESS COMMANDS
//======================================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
    createPendingGame,
    confirmGame,
    pendingGames,
    tryMove,
    resign,
    offerDraw,
    acceptDraw,
    getGameByPlayer,
    formatTime
} = require('../systems/chessManager');
const { renderBoard } = require('../systems/boardRenderer');
const {
    updateElo,
    getServerLeaderboard,
    getGlobalLeaderboard,
    getPlayerStats,
    PROVISIONAL_GAMES
} = require('../systems/chessElo');

function setup(client) {
    // ============ CHESS START COMMAND ============
    client.commands.set('chess', {
        name: 'chess',
        aliases: ['startchess'],
        description: 'Start a chess game',
        async execute(message, args, client) {
            // Check if confirming a game
            if (args[0] === 'confirm') {
                const p1 = message.mentions.users.first();
                if (!p1) {
                    return message.reply('❌ Please mention the player who challenged you!');
                }

                const game = confirmGame(message.author.id, p1.id, message.channel.id, message.guild.id);
                if (!game) {
                    return message.reply('❌ No pending chess game from that player!');
                }

                // Start automatic timeout checker
                const { startTimeoutChecker } = require('../systems/chessManager');
                startTimeoutChecker(client, game);

                const boardImage = await renderBoard(game.chess.fen(), null, false);

                // Determine color assignment method
                let assignmentNote = '';
                if (game.colorMethod === 'streak_balance') {
                    assignmentNote = '\n*Colors balanced due to recent streak*';
                } else if (game.colorMethod === 'total_balance') {
                    assignmentNote = '\n*Colors balanced based on game history*';
                } else {
                    assignmentNote = '\n*Colors assigned randomly*';
                }

                const embed = new EmbedBuilder()
                    .setTitle('♟️ Chess Game Started!')
                    .setColor(0x000000)
                    .addFields(
                        { name: '⚪ White', value: `<@${game.players.white}>${assignmentNote}`, inline: true },
                        { name: '⚫ Black', value: `<@${game.players.black}>`, inline: true },
                        { name: '⏱️ Time', value: `${formatTime(game.clocks.white)}`, inline: true }
                    )
                    .setImage('attachment://board.png')
                    .setFooter({ text: 'White to move! Use chess notation (e.g., e2e4, e4, Nf3)' });

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('chess_resign')
                            .setLabel('Resign')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('chess_draw')
                            .setLabel('Offer Draw')
                            .setStyle(ButtonStyle.Secondary)
                    );

                return message.channel.send({
                    embeds: [embed],
                    components: [buttons],
                    files: [{ attachment: boardImage, name: 'board.png' }]
                });
            }

            // Start new game
            const p2 = message.mentions.users.first();
            if (!p2) {
                return message.reply('❌ Usage: `%chess @opponent <minutes>` or `%chess confirm @challenger`');
            }

            if (p2.id === message.author.id) {
                return message.reply('❌ You cannot play against yourself!');
            }

            if (p2.bot) {
                return message.reply('❌ You cannot play against bots!');
            }

            const minutes = parseInt(args[1]) || 10;
            if (minutes < 1 || minutes > 60) {
                return message.reply('❌ Time must be between 1-60 minutes!');
            }

            const durationMs = minutes * 60000;
            createPendingGame(message.author.id, p2.id, durationMs);

            return message.reply(`♟️ Chess challenge sent to ${p2}!\nThey should type: \`%chess confirm @${message.author.username}\``);
        }
    });

    client.commands.set('startchess', client.commands.get('chess'));

    // ============ CHESS BOARD COMMAND ============
    client.commands.set('board', {
        name: 'board',
        description: 'Show current chess board',
        async execute(message, args, client) {
            const game = getGameByPlayer(message.author.id);
            if (!game) {
                return message.reply('❌ You are not in an active chess game!');
            }

            // Determine if board should be flipped based on whose turn it is
            const flipped = game.chess.turn() === 'b';
            const boardImage = await renderBoard(game.chess.fen(), game.lastMove, flipped);
            const turn = game.chess.turn() === 'w' ? 'White' : 'Black';
            const currentPlayer = game.chess.turn() === 'w' ? game.players.white : game.players.black;

            const embed = new EmbedBuilder()
                .setTitle('♟️ Current Board')
                .setColor(game.chess.turn() === 'w' ? 0xFFFFFF : 0x000000)
                .addFields(
                    { name: '⚪ White Time', value: formatTime(game.clocks.white), inline: true },
                    { name: '⚫ Black Time', value: formatTime(game.clocks.black), inline: true },
                    { name: '🎯 Turn', value: `${turn} <@${currentPlayer}>`, inline: true }
                )
                .setImage('attachment://board.png');

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('chess_resign')
                        .setLabel('Resign')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('chess_draw')
                        .setLabel('Offer Draw')
                        .setStyle(ButtonStyle.Secondary)
                );

            return message.channel.send({
                embeds: [embed],
                components: [buttons],
                files: [{ attachment: boardImage, name: 'board.png' }]
            });
        }
    });

    // ============ CHESS ELO/STATS COMMANDS ============
    client.commands.set('chesstotal', {
        name: 'chesstotal',
        description: 'Show server chess leaderboard',
        async execute(message, args, client) {
            const leaderboard = getServerLeaderboard(message.guild.id, 10);

            if (leaderboard.length === 0) {
                return message.reply('📊 No rated players yet! Play 5 games to get rated.');
            }

            const embed = new EmbedBuilder()
                .setTitle(`♟️ ${message.guild.name} - Chess Leaderboard`)
                .setColor(0xFFD700)
                .setDescription('*Top 10 players (minimum 5 games)*')
                .setTimestamp();

            leaderboard.forEach((player, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                embed.addFields({
                    name: `${medal} <@${player.userId}>`,
                    value: `**ELO:** ${player.elo} | **W/L/D:** ${player.wins}/${player.losses}/${player.draws} | **WR:** ${player.winRate}%`,
                    inline: false
                });
            });

            return message.channel.send({ embeds: [embed] });
        }
    });

    client.commands.set('chessglobal', {
        name: 'chessglobal',
        description: 'Show global chess leaderboard',
        async execute(message, args, client) {
            const leaderboard = getGlobalLeaderboard(10);

            if (leaderboard.length === 0) {
                return message.reply('📊 No rated players yet! Play 5 games to get rated.');
            }

            const embed = new EmbedBuilder()
                .setTitle('🌍 Global Chess Leaderboard')
                .setColor(0x5865F2)
                .setDescription('*Top 10 players worldwide (minimum 5 games)*')
                .setTimestamp();

            leaderboard.forEach((player, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                embed.addFields({
                    name: `${medal} <@${player.userId}>`,
                    value: `**ELO:** ${player.elo} | **Games:** ${player.games} | **Servers:** ${player.servers} | **WR:** ${player.winRate}%`,
                    inline: false
                });
            });

            return message.channel.send({ embeds: [embed] });
        }
    });

    client.commands.set('chesselo', {
        name: 'chesselo',
        aliases: ['chessstats', 'chessrating'],
        description: 'Show your chess stats and ELO',
        async execute(message, args, client) {
            const userId = message.mentions.users.first()?.id || message.author.id;
            const stats = getPlayerStats(message.guild.id, userId);

            const embed = new EmbedBuilder()
                .setTitle(`♟️ Chess Stats - <@${userId}>`)
                .setColor(0x00FF00)
                .setTimestamp();

            // Server stats
            if (stats.server.games < PROVISIONAL_GAMES) {
                embed.addFields({
                    name: `📊 ${message.guild.name} Stats`,
                    value: `**Status:** Provisional (${stats.server.games}/${PROVISIONAL_GAMES} games)\n**Games:** ${stats.server.games} | **W/L/D:** ${stats.server.wins}/${stats.server.losses}/${stats.server.draws}\n*Play ${PROVISIONAL_GAMES - stats.server.games} more games to get rated!*`,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: `📊 ${message.guild.name} Stats`,
                    value: `**ELO:** ${stats.server.elo}\n**Games:** ${stats.server.games} | **W/L/D:** ${stats.server.wins}/${stats.server.losses}/${stats.server.draws}\n**Win Rate:** ${stats.server.winRate}%`,
                    inline: false
                });
            }

            // Global stats
            if (stats.global.games < PROVISIONAL_GAMES) {
                embed.addFields({
                    name: '🌍 Global Stats',
                    value: `**Status:** Provisional (${stats.global.games}/${PROVISIONAL_GAMES} games)\n**Games:** ${stats.global.games} | **Servers:** ${stats.global.servers}\n*Play ${PROVISIONAL_GAMES - stats.global.games} more games to get rated!*`,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '🌍 Global Stats',
                    value: `**ELO:** ${stats.global.elo}\n**Games:** ${stats.global.games} | **Servers:** ${stats.global.servers}\n**Win Rate:** ${stats.global.winRate}%`,
                    inline: false
                });
            }

            return message.channel.send({ embeds: [embed] });
        }
    });

    console.log('✅ Chess commands loaded');
}

// Handle button interactions
async function handleInteraction(interaction, client) {
    if (!interaction.isButton()) return;

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (interaction.customId === 'chess_resign') {
        const result = resign(userId, guildId);
        if (!result) {
            return interaction.reply({
                content: '❌ You are not in this game!',
                ephemeral: true
            });
        }

        // Update ELO
        const eloUpdate = updateElo(guildId, result.winnerId, result.loserId, false);

        const embed = new EmbedBuilder()
            .setTitle('🏳️ Game Over - Resignation')
            .setDescription(`<@${userId}> resigned!`)
            .setColor(0xFF0000)
            .addFields(
                { name: '🏆 Winner', value: `<@${result.winnerId}>`, inline: false },
                { name: '📈 ELO Changes', value: `<@${result.winnerId}>: **${eloUpdate.winner.oldElo}** → **${eloUpdate.winner.newElo}** (${eloUpdate.winner.change >= 0 ? '+' : ''}${eloUpdate.winner.change})\n<@${result.loserId}>: **${eloUpdate.loser.oldElo}** → **${eloUpdate.loser.newElo}** (${eloUpdate.loser.change >= 0 ? '+' : ''}${eloUpdate.loser.change})`, inline: false }
            );

        if (eloUpdate.winner.games < PROVISIONAL_GAMES || eloUpdate.loser.games < PROVISIONAL_GAMES) {
            embed.setFooter({ text: `Ratings show after ${PROVISIONAL_GAMES} games` });
        }

        return interaction.channel.send({ embeds: [embed] });
    }

    if (interaction.customId === 'chess_draw') {
        const offered = offerDraw(userId);
        if (!offered) {
            return interaction.reply({
                content: '❌ You are not in this game!',
                ephemeral: true
            });
        }

        const game = getGameByPlayer(userId);
        const opponentId = game.players.white === userId ? game.players.black : game.players.white;

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('chess_draw_accept')
                    .setLabel('Accept Draw')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('chess_resign')
                    .setLabel('Resign')
                    .setStyle(ButtonStyle.Danger)
            );

        return interaction.reply({
            content: `🤝 <@${userId}> offered a draw to <@${opponentId}>!`,
            components: [buttons]
        });
    }

    if (interaction.customId === 'chess_draw_accept') {
        const result = acceptDraw(userId, guildId);
        if (!result) {
            return interaction.reply({
                content: '❌ No draw offer available!',
                ephemeral: true
            });
        }

        // Update ELO for draw
        const eloUpdate = updateElo(guildId, result.player1, result.player2, true);

        const embed = new EmbedBuilder()
            .setTitle('🤝 Game Over - Draw')
            .setDescription(result.drawReason)
            .setColor(0x808080)
            .addFields({
                name: '📊 ELO Changes',
                value: `<@${result.player1}>: **${eloUpdate.winner.oldElo}** → **${eloUpdate.winner.newElo}** (${eloUpdate.winner.change >= 0 ? '+' : ''}${eloUpdate.winner.change})\n<@${result.player2}>: **${eloUpdate.loser.oldElo}** → **${eloUpdate.loser.newElo}** (${eloUpdate.loser.change >= 0 ? '+' : ''}${eloUpdate.loser.change})`,
                inline: false
            });

        if (eloUpdate.winner.games < PROVISIONAL_GAMES || eloUpdate.loser.games < PROVISIONAL_GAMES) {
            embed.setFooter({ text: `Ratings show after ${PROVISIONAL_GAMES} games` });
        }

        return interaction.channel.send({ embeds: [embed] });
    }
}

// Handle chess moves in messages
async function handleChessMove(message, client) {
    if (message.author.bot) return;

    // First check if user is in a game
    const game = getGameByPlayer(message.author.id);
    if (!game) return; // Not in a game, ignore message

    // Check if message is in the game channel
    if (message.channel.id !== game.channelId) {
        return; // Wrong channel, ignore
    }

    const content = message.content.trim();
    const guildId = message.guild.id;

    // Try to make the move (chess.js handles case-insensitivity)
    const moveResult = tryMove(message.author.id, content);

    // If move failed and user is in a game, tell them it's illegal
    if (!moveResult) {
        return message.reply('❌ Illegal move! Please use valid chess notation (e.g., e2e4, Nf3, Ke2)');
    }

    if (moveResult.timeout) {
        // Update ELO for timeout
        const eloUpdate = updateElo(guildId, moveResult.winnerId, moveResult.loserId, false);

        const winnerColor = moveResult.timeout.winner === 'white' ? '⚪ White' : '⚫ Black';
        const loserColor = moveResult.timeout.loser === 'white' ? '⚪ White' : '⚫ Black';

        const embed = new EmbedBuilder()
            .setTitle('⏱️ Game Over - Timeout')
            .setDescription(`${winnerColor} wins by timeout!`)
            .setColor(0xFF0000)
            .addFields(
                { name: '🏆 Winner', value: `<@${moveResult.winnerId}>`, inline: true },
                { name: '⏱️ Time Out', value: `<@${moveResult.loserId}>`, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: '📈 ELO Changes',
                    value: `<@${moveResult.winnerId}>: **${eloUpdate.winner.oldElo}** → **${eloUpdate.winner.newElo}** (${eloUpdate.winner.change >= 0 ? '+' : ''}${eloUpdate.winner.change})\n<@${moveResult.loserId}>: **${eloUpdate.loser.oldElo}** → **${eloUpdate.loser.newElo}** (${eloUpdate.loser.change >= 0 ? '+' : ''}${eloUpdate.loser.change})`,
                    inline: false
                }
            );

        if (eloUpdate.winner.games < PROVISIONAL_GAMES || eloUpdate.loser.games < PROVISIONAL_GAMES) {
            embed.setFooter({ text: `Ratings show after ${PROVISIONAL_GAMES} games` });
        }

        return message.channel.send({ embeds: [embed] });
    }

    // Flip board after move (show from perspective of player to move next)
    const flipped = moveResult.move.color === 'w'; // If white just moved, flip for black
    const boardImage = await renderBoard(moveResult.fen, moveResult.move, flipped);

    const turn = moveResult.gameOver ? 'Game Over' : (moveResult.move.color === 'w' ? 'Black' : 'White') + ' to move';

    const embed = new EmbedBuilder()
        .setTitle(`♟️ Chess - ${moveResult.move.san}`)
        .setColor(moveResult.check ? 0xFF0000 : 0x00FF00)
        .addFields(
            { name: '⚪ White Time', value: moveResult.clocks.white, inline: true },
            { name: '⚫ Black Time', value: moveResult.clocks.black, inline: true },
            { name: '🎯 Status', value: turn, inline: true }
        )
        .setImage('attachment://board.png');

    if (moveResult.check && !moveResult.checkmate) {
        embed.setFooter({ text: '⚠️ CHECK!' });
    }

    // Handle checkmate
    if (moveResult.checkmate) {
        // Update ELO
        const eloUpdate = updateElo(guildId, moveResult.winnerId, moveResult.loserId, false);

        embed.setTitle('🏆 CHECKMATE!');
        embed.setDescription(`${moveResult.move.color === 'w' ? '⚪ White' : '⚫ Black'} wins!`);
        embed.setColor(0xFFD700);
        embed.addFields({
            name: '📈 ELO Changes',
            value: `<@${moveResult.winnerId}>: **${eloUpdate.winner.oldElo}** → **${eloUpdate.winner.newElo}** (${eloUpdate.winner.change >= 0 ? '+' : ''}${eloUpdate.winner.change})\n<@${moveResult.loserId}>: **${eloUpdate.loser.oldElo}** → **${eloUpdate.loser.newElo}** (${eloUpdate.loser.change >= 0 ? '+' : ''}${eloUpdate.loser.change})`,
            inline: false
        });

        if (eloUpdate.winner.games < PROVISIONAL_GAMES || eloUpdate.loser.games < PROVISIONAL_GAMES) {
            embed.setFooter({ text: `Ratings show after ${PROVISIONAL_GAMES} games` });
        } else {
            embed.setFooter({ text: `${moveResult.move.color === 'w' ? 'White' : 'Black'} delivers checkmate!` });
        }
    }

    // Handle draws
    if (moveResult.draw) {
        // Update ELO for draw
        const eloUpdate = updateElo(guildId, moveResult.whiteId, moveResult.blackId, true);

        embed.setTitle('🤝 DRAW!');
        embed.setDescription(moveResult.drawReason);
        embed.setColor(0x808080);
        embed.addFields({
            name: '📊 ELO Changes',
            value: `<@${moveResult.whiteId}>: **${eloUpdate.winner.oldElo}** → **${eloUpdate.winner.newElo}** (${eloUpdate.winner.change >= 0 ? '+' : ''}${eloUpdate.winner.change})\n<@${moveResult.blackId}>: **${eloUpdate.loser.oldElo}** → **${eloUpdate.loser.newElo}** (${eloUpdate.loser.change >= 0 ? '+' : ''}${eloUpdate.loser.change})`,
            inline: false
        });

        // Add specific draw type info
        if (moveResult.drawType === 'stalemate') {
            embed.setFooter({ text: 'The king has no legal moves but is not in check.' });
        } else if (moveResult.drawType === 'threefold') {
            embed.setFooter({ text: 'The same position occurred three times.' });
        } else if (moveResult.drawType === 'insufficient') {
            embed.setFooter({ text: 'Neither player has enough material to checkmate.' });
        } else if (moveResult.drawType === 'fifty') {
            embed.setFooter({ text: '50 moves without captures or pawn moves.' });
        }

        if (eloUpdate.winner.games < PROVISIONAL_GAMES || eloUpdate.loser.games < PROVISIONAL_GAMES) {
            embed.setFooter({ text: `Ratings show after ${PROVISIONAL_GAMES} games` });
        }
    }

    // Check for potential draw claims
    if (!moveResult.gameOver && !moveResult.draw) {
        if (moveResult.threefoldRepetition) {
            embed.addFields({ name: '🔄 Notice', value: 'Threefold repetition - players can claim a draw!', inline: false });
        }
        if (moveResult.insufficientMaterial) {
            embed.addFields({ name: '🎭 Notice', value: 'Insufficient material - draw is automatic!', inline: false });
        }
    }

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('chess_resign')
                .setLabel('Resign')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('chess_draw')
                .setLabel('Offer Draw')
                .setStyle(ButtonStyle.Secondary)
        );

    return message.channel.send({
        embeds: [embed],
        components: moveResult.gameOver ? [] : [buttons],
        files: [{ attachment: boardImage, name: 'board.png' }]
    });
}

module.exports = { setup, handleInteraction, handleChessMove };
