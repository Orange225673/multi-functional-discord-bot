///////////////////////////////////////////////////////////////////////
//                    MATH STOP/SURRENDER COMMAND                    //
///////////////////////////////////////////////////////////////////////

const { EmbedBuilder } = require('discord.js');
const mathSystem = require('../systems/mathSystem');
const config = require('../config');

// ============ STATE MANAGEMENT ============

// Track active votes per channel
const activeVotes = new Map(); // channelId → voteData

// Track cooldowns per user (global across all games)
const voteCooldowns = new Map(); // userId → timestamp

// ============ VOTE DATA STRUCTURE ============
/*
{
    guildId: string,
    channelId: string,
    messageId: string,
    message: Message,
    startTime: number,
    endTime: number,
    requiredVotes: number,
    yesVotes: Set<userId>,
    noVotes: Set<userId>,
    eligibleVoters: Set<userId>,
    status: 'active' | 'passed' | 'failed',
    initiatorId: string
}
*/

// ============ HELPER FUNCTIONS ============

/**
 * Calculate required votes based on player count
 * @param {number} totalPlayers - Total number of players
 * @returns {number} Required votes to pass
 */
function getRequiredVotes(totalPlayers) {
    if (totalPlayers === 1) return 1;  // Solo = instant
    return totalPlayers - 1;           // Others = (n-1) votes
}

/**
 * Check if user is on cooldown
 * @param {string} userId - User ID to check
 * @returns {number} Seconds remaining (0 if not on cooldown)
 */
function getCooldownRemaining(userId) {
    const cooldownEnd = voteCooldowns.get(userId);
    if (!cooldownEnd || Date.now() >= cooldownEnd) {
        return 0;
    }
    return Math.ceil((cooldownEnd - Date.now()) / 1000);
}

/**
 * Apply cooldown to all eligible voters
 * @param {Set<string>} voters - Set of user IDs
 * @param {number} duration - Cooldown duration in milliseconds (default 3 minutes)
 */
function applyCooldown(voters, duration = 180000) {
    const cooldownEnd = Date.now() + duration;
    for (const userId of voters) {
        voteCooldowns.set(userId, cooldownEnd);
    }
}

/**
 * Stop the active game
 * @param {Object} interaction - Quiz context
 * @param {string} reason - Reason for stopping
 */
async function stopGame(interaction, reason = 'Vote passed') {
    // Clear active players
    mathSystem.activePlayers.clear();

    // Clear active quiz state
    mathSystem.stopCurrentQuiz();

    // Send stop message
    await interaction.channel.send({
        embeds: [
            new EmbedBuilder()
                .setTitle('🛑 Game Stopped')
                .setDescription(`The math quiz has been stopped.\n**Reason:** ${reason}`)
                .setColor('Red')
                .setTimestamp()
        ]
    });
}

/**
 * Update vote embed with current status
 * @param {Object} voteData - Vote data object
 */
async function updateVoteEmbed(voteData) {
    const { message, yesVotes, noVotes, requiredVotes, eligibleVoters, endTime } = voteData;

    const yesCount = yesVotes.size;
    const noCount = noVotes.size;
    const abstainCount = eligibleVoters.size - yesCount - noCount;
    const totalVoters = eligibleVoters.size;

    const passed = yesCount >= requiredVotes;

    // Create progress bar
    const barLength = 10;
    const yesBar = Math.floor((yesCount / totalVoters) * barLength);
    const noBar = Math.floor((noCount / totalVoters) * barLength);
    const progressBar = '🟩'.repeat(yesBar) + '🟥'.repeat(noBar) + '⬜'.repeat(barLength - yesBar - noBar);

    const embed = new EmbedBuilder()
        .setTitle('🛑 Stop Game Vote')
        .setDescription(
            `A player wants to stop the game!\n\n` +
            `**Vote Progress:**\n${progressBar}\n\n` +
            `✅ **Yes:** ${yesCount}/${requiredVotes} (${Math.round(yesCount / totalVoters * 100)}%)\n` +
            `❌ **No:** ${noCount} (${Math.round(noCount / totalVoters * 100)}%)\n` +
            `⚪ **Abstain:** ${abstainCount}\n\n` +
            `React with ✅ to **stop** the game\n` +
            `React with ❌ to **continue** playing\n\n` +
            `⏰ Vote ends <t:${Math.floor(endTime / 1000)}:R>`
        )
        .setColor(passed ? 'Green' : yesCount > totalVoters / 2 ? 'Yellow' : 'Orange')
        .setFooter({ text: '⚠️ All players will be on 3-minute cooldown after this vote!' })
        .setTimestamp();

    if (passed) {
        embed.setTitle('✅ Vote Passed!');
        embed.setDescription(
            `The vote has passed! The game will stop now.\n\n` +
            `**Final Votes:**\n` +
            `✅ Yes: ${yesCount}/${requiredVotes}\n` +
            `❌ No: ${noCount}`
        );
    }

    try {
        await message.edit({ embeds: [embed] });
    } catch (error) {
        console.error('Failed to update vote embed:', error);
    }
}

/**
 * Start a vote to stop the game
 * @param {Message} message - Message that triggered the vote
 * @param {Object} interaction - Quiz context
 * @returns {Promise<void>}
 */
async function startVote(message, interaction) {
    const channelId = message.channel.id;

    // Filter out any bots that might have snuck into activePlayers
    const humanPlayers = new Set();
    for (const playerId of mathSystem.activePlayers.keys()) {
        // Fetch user to check if bot
        try {
            const user = await message.client.users.fetch(playerId);
            if (!user.bot) {
                humanPlayers.add(playerId);
            }
        } catch (error) {
            // If can't fetch, assume human and include
            humanPlayers.add(playerId);
        }
    }

    const totalPlayers = humanPlayers.size;
    const requiredVotes = getRequiredVotes(totalPlayers);
    const eligibleVoters = humanPlayers;

    // Solo player - instant stop
    if (totalPlayers === 1) {
        await message.reply('✅ You are the only player. Stopping the game...');
        await stopGame(interaction, 'Solo player quit');
        applyCooldown(eligibleVoters); // Apply cooldown to solo player
        return;
    }

    // Create vote embed
    const endTime = Date.now() + 35000; // 35 seconds
    const timestamp = Math.floor(endTime / 1000);

    const initialEmbed = new EmbedBuilder()
        .setTitle('🛑 Stop Game Vote')
        .setDescription(
            `${message.author} wants to stop the game!\n\n` +
            `**Required votes:** ${requiredVotes}/${totalPlayers}\n` +
            `**Current votes:** 1/${requiredVotes}\n\n` +
            `✅ = Yes, stop the game\n` +
            `❌ = No, continue playing\n\n` +
            `Vote ends <t:${timestamp}:R>`
        )
        .setColor('Yellow')
        .setFooter({ text: '⚠️ All players will be on 3-minute cooldown after this vote!' })
        .setTimestamp();

    const voteMessage = await message.channel.send({ embeds: [initialEmbed] });
    await voteMessage.react('✅');
    await voteMessage.react('❌');

    // Initialize vote data
    const voteData = {
        guildId: message.guild.id,
        channelId: channelId,
        messageId: voteMessage.id,
        message: voteMessage,
        startTime: Date.now(),
        endTime: endTime,
        requiredVotes: requiredVotes,
        yesVotes: new Set([message.author.id]), // Initiator auto-votes YES
        noVotes: new Set(),
        eligibleVoters: eligibleVoters,
        status: 'active',
        initiatorId: message.author.id
    };

    activeVotes.set(channelId, voteData);

    // Update embed with initiator's auto-vote
    await updateVoteEmbed(voteData);

    // Listen for reactions
    const filter = (reaction, user) => {
        return ['✅', '❌'].includes(reaction.emoji.name) &&
            eligibleVoters.has(user.id) &&
            !user.bot;
    };

    const collector = voteMessage.createReactionCollector({
        filter,
        time: 35000
    });

    collector.on('collect', async (reaction, user) => {
        // Double-check: ignore bots (shouldn't happen due to filter, but safety check)
        if (user.bot) return;

        // Remove from opposite vote
        if (reaction.emoji.name === '✅') {
            voteData.yesVotes.add(user.id);
            voteData.noVotes.delete(user.id);
        } else {
            voteData.noVotes.add(user.id);
            voteData.yesVotes.delete(user.id);
        }

        // Update embed
        await updateVoteEmbed(voteData);

        // Check if threshold reached
        if (voteData.yesVotes.size >= requiredVotes) {
            collector.stop('passed');
        }
    });

    collector.on('end', async (collected, reason) => {
        // Apply cooldown to ALL players regardless of result
        applyCooldown(eligibleVoters);

        if (reason === 'passed') {
            // Vote passed - stop the game
            voteData.status = 'passed';
            await updateVoteEmbed(voteData);
            await stopGame(interaction, 'Vote passed');
        } else {
            // Vote failed - continue game
            voteData.status = 'failed';

            const finalEmbed = new EmbedBuilder()
                .setTitle('❌ Vote Failed')
                .setDescription(
                    `The vote did not pass. The game continues!\n\n` +
                    `**Final Votes:**\n` +
                    `✅ Yes: ${voteData.yesVotes.size}/${requiredVotes}\n` +
                    `❌ No: ${voteData.noVotes.size}\n\n` +
                    `⏱️ All players are now on 3-minute cooldown.`
                )
                .setColor('Red')
                .setTimestamp();

            await voteMessage.edit({ embeds: [finalEmbed] });
        }

        // Clean up
        activeVotes.delete(channelId);
    });
}

// ============ COMMAND SETUP ============

function setup(client) {
    client.commands.set('math-stop', module.exports);
    client.commands.set('mathstop', module.exports);
    console.log('✅ Math stop command registered');
}

// ============ COMMAND EXPORT ============

module.exports = {
    setup,
    name: 'math-stop',
    description: 'Vote to stop the current math quiz',
    aliases: ['mathstop'],
    category: 'fun',

    async run(message, args) {
        try {
            // Prevent bots from triggering commands
            if (message.author.bot) return;

            const channelId = message.channel.id;
            const isOwner = message.author.id === config.OWNER_ID;

            // Check for --force flag (owner only)
            const forceStop = args.includes('--force') && isOwner;

            // Check if there's an active game
            if (mathSystem.activePlayers.size === 0) {
                return message.reply('❌ There is no active math quiz to stop.');
            }

            // Check if user is in the game
            if (!mathSystem.activePlayers.has(message.author.id) && !isOwner) {
                return message.reply('❌ You are not in this game! Only players can vote to stop.');
            }

            // Owner force stop
            if (forceStop) {
                await message.reply('🔧 **Owner override:** Stopping game immediately...');
                const quizContext = {
                    channel: message.channel,
                    guild: message.guild
                };
                await stopGame(quizContext, 'Owner force stop');
                return;
            }

            // Check if vote is already active
            if (activeVotes.has(channelId)) {
                return message.reply('⚠️ A vote is already in progress! React to the vote message above.');
            }

            // Check cooldown
            const cooldownRemaining = getCooldownRemaining(message.author.id);
            if (cooldownRemaining > 0) {
                const minutes = Math.floor(cooldownRemaining / 60);
                const seconds = cooldownRemaining % 60;
                const timeStr = minutes > 0 ?
                    `${minutes}m ${seconds}s` :
                    `${seconds}s`;

                return message.reply(
                    `⏱️ You're on cooldown! You can start another vote in **${timeStr}**.\n`
                );
            }

            // Start vote
            const quizContext = {
                channel: message.channel,
                guild: message.guild
            };

            await startVote(message, quizContext);

        } catch (error) {
            console.error('Error in math-stop command:', error);
            message.reply(`❌ Error: ${error.message}`).catch(() => { });
        }
    },

    // Export for testing/external use
    getRequiredVotes,
    getCooldownRemaining,
    applyCooldown,
    stopGame,
    activeVotes,
    voteCooldowns
};