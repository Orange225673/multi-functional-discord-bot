//======================================================================
//                   XP SYSTEM - MESSAGE XP GAIN
//======================================================================

const DatabaseManager = require('../utils/DatabaseManager');
const { EmbedBuilder } = require('discord.js');

const dbManager = new DatabaseManager();

// XP Cooldown tracking (1 minute per user)
const xpCooldowns = new Map();

// Config
const XP_CONFIG = {
    COOLDOWN: 60000, // 1 minute
    MIN_XP: 15,
    MAX_XP: 25,
    BOOSTER_MULTIPLIER: 2,
    MIN_LEVEL_ANNOUNCE: 5 // Only announce level 5 and above
};

/**
 * Handle XP gain on message
 * @param {Message} message - Discord message
 * @param {Client} client - Discord client
 */
async function onMessageXPGain(message, client) {
    // Ignore bots
    if (message.author.bot || !message.guild) return;

    // Check if XP is enabled for this server
    const config = dbManager.getServerConfig(message.guild.id);
    if (!config.xp_enabled) return;

    // Check cooldown
    const cooldownKey = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();

    if (xpCooldowns.has(cooldownKey)) {
        const expirationTime = xpCooldowns.get(cooldownKey) + XP_CONFIG.COOLDOWN;
        if (now < expirationTime) {
            return; // Still on cooldown
        }
    }

    // Set new cooldown
    xpCooldowns.set(cooldownKey, now);

    // Calculate XP
    let baseXP = Math.floor(Math.random() * (XP_CONFIG.MAX_XP - XP_CONFIG.MIN_XP + 1)) + XP_CONFIG.MIN_XP;

    // Server booster multiplier
    const member = message.member;
    if (member && member.premiumSince) {
        baseXP *= XP_CONFIG.BOOSTER_MULTIPLIER;
    }

    // XP boost from gem shop
    if (dbManager.hasActiveBoost(message.guild.id, message.author.id, 'xp_boost_1h') ||
        dbManager.hasActiveBoost(message.guild.id, message.author.id, 'xp_boost_24h')) {
        baseXP *= 2;
    }

    // Server XP multiplier
    baseXP = Math.floor(baseXP * (config.xp_multiplier || 1.0));

    // Add XP and check for level up
    const result = dbManager.addXP(message.guild.id, message.author.id, baseXP);

    // If leveled up, announce it
    if (result.leveledUp) {
        // Check if level-up announcements are enabled
        if (config.levelup_enabled === false) {
            return; // Announcements disabled
        }

        // Only announce if level >= MIN_LEVEL_ANNOUNCE (default 5)
        const minLevel = config.levelup_min_level || XP_CONFIG.MIN_LEVEL_ANNOUNCE;
        if (result.newLevel < minLevel) {
            return; // Don't announce low levels
        }

        // Determine channel to send announcement
        let targetChannel = message.channel; // Default: same channel

        if (config.levelup_channel_id) {
            // Use configured channel if set
            const levelUpChannel = message.guild.channels.cache.get(config.levelup_channel_id);
            if (levelUpChannel && levelUpChannel.isTextBased()) {
                targetChannel = levelUpChannel;
            }
        }

        try {
            const embed = new EmbedBuilder()
                .setTitle('🎉 Level Up!')
                .setDescription(`${message.author} reached **Level ${result.newLevel}**!`)
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Next Level', value: `${result.xp}/${result.xpForNext} XP`, inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();

            await targetChannel.send({ embeds: [embed] });

            // Level milestones rewards
            if (result.newLevel % 10 === 0) {
                // Every 10 levels, give gems
                const gemReward = Math.floor(result.newLevel / 10);
                dbManager.addGems(message.guild.id, message.author.id, gemReward);
                await targetChannel.send(`💎 Bonus! ${message.author} earned **${gemReward} gems** for reaching level ${result.newLevel}!`);
            }
        } catch (err) {
            console.error('Error sending level up message:', err);
        }
    }
}

/**
 * Clean up expired cooldowns
 */
function cleanupCooldowns() {
    const now = Date.now();
    for (const [key, timestamp] of xpCooldowns) {
        if (now - timestamp > XP_CONFIG.COOLDOWN) {
            xpCooldowns.delete(key);
        }
    }
}

// Clean up cooldowns every 5 minutes
setInterval(cleanupCooldowns, 300000);

function setup(client) {
    console.log('✅ XP system loaded');
}

module.exports = {
    onMessageXPGain,
    setup,
    XP_CONFIG
};