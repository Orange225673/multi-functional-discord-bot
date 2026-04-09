//======================================================================
//                   XP/LEVEL COMMANDS (📈 RANK SYSTEM)
//======================================================================

const { EmbedBuilder, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const DatabaseManager = require('../utils/DatabaseManager');

const dbManager = new DatabaseManager();

// ============ %XP COMMAND ============
const xp = {
    name: 'xp',
    category: 'Leveling',
    description: 'Check your XP and level',
    aliases: ['level', 'rank', 'ranks'],

    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('Check XP and level')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('Check another user\'s XP')
            .setRequired(false)
        ),

    async execute(interaction, client, config) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        await showXPCard(interaction, client, targetUser);
    },

    async run(message, args, client, config) {
        let targetUser = message.author;

        if (message.mentions.users.size > 0) {
            targetUser = message.mentions.users.first();
        }

        await showXPCard(message, client, targetUser);
    }
};

async function showXPCard(ctx, client, user) {
    const serverId = ctx.guild.id;
    const userId = user.id;

    const xpData = dbManager.getUserXP(serverId, userId);
    const rank = dbManager.getServerRank(serverId, userId);
    const xpForNext = dbManager.getXPForLevel(xpData.level + 1);

    // Calculate progress percentage
    const progressPercent = Math.floor((xpData.xp / xpForNext) * 100);
    const barLength = 20;
    const filledBars = Math.floor((progressPercent / 100) * barLength);
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(barLength - filledBars);

    const embed = new EmbedBuilder()
        .setTitle(`📈 ${user.username}'s Level Card`)
        .setColor(xpData.profile_color)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
            { name: 'Level', value: `**${xpData.level}** ⭐`, inline: true },
            { name: 'Server Rank', value: `**#${rank}**`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: 'Current XP', value: `${xpData.xp.toLocaleString()} / ${xpForNext.toLocaleString()}`, inline: false },
            { name: 'Progress', value: `\`[${progressBar}]\` ${progressPercent}%`, inline: false },
            { name: 'Total XP Earned', value: xpData.total_xp.toLocaleString(), inline: true }
        )
        .setFooter({ text: 'Earn XP by sending messages!' })
        .setTimestamp();

    // Check for active boosts
    if (dbManager.hasActiveBoost(serverId, userId, 'xp_boost_1h') || dbManager.hasActiveBoost(serverId, userId, 'xp_boost_24h')) {
        embed.addFields({ name: '⚡ Active Boost', value: '2x XP Boost Active!', inline: false });
    }

    if (ctx.reply) {
        await ctx.reply({ embeds: [embed] });
    } else {
        await ctx.channel.send({ embeds: [embed] });
    }
}

// ============ %XPTOP COMMAND ============
const xptop = {
    name: 'xptop',
    category: 'Leveling',
    description: 'View server XP leaderboard',
    aliases: ['leveltop', 'ranktop'],

    data: new SlashCommandBuilder()
        .setName('xptop')
        .setDescription('View server XP leaderboard'),

    async execute(interaction, client, config) {
        await showXPLeaderboard(interaction, client, false);
    },

    async run(message, args, client, config) {
        await showXPLeaderboard(message, client, false);
    }
};

// ============ %XPGLOBAL COMMAND ============
const xpglobal = {
    name: 'xpglobal',
    category: 'Leveling',
    description: 'View global XP leaderboard',
    aliases: ['levelglobal', 'rankglobal'],

    data: new SlashCommandBuilder()
        .setName('xpglobal')
        .setDescription('View global XP leaderboard'),

    async execute(interaction, client, config) {
        await showXPLeaderboard(interaction, client, true);
    },

    async run(message, args, client, config) {
        await showXPLeaderboard(message, client, true);
    }
};

async function showXPLeaderboard(ctx, client, isGlobal) {
    const serverId = ctx.guild.id;

    let topUsers;
    let title;
    let color;

    if (isGlobal) {
        topUsers = dbManager.getGlobalXPLeaderboard(10);
        title = '🌎 Global Level Leaderboard';
        color = 0xFFD700;
    } else {
        topUsers = dbManager.getXPLeaderboard(serverId, 10);
        title = `📈 ${ctx.guild.name} - Level Leaderboard`;
        color = 0x5865F2;
    }

    if (topUsers.length === 0) {
        const noDataMsg = '💭 No one has earned XP yet!';
        if (ctx.reply) {
            return ctx.reply(noDataMsg);
        } else {
            return ctx.channel.send(noDataMsg);
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setThumbnail(ctx.guild.iconURL())
        .setTimestamp();

    let description = '';

    for (let i = 0; i < topUsers.length; i++) {
        const userData = topUsers[i];
        const user = await client.users.fetch(userData.user_id).catch(() => null);
        const name = user ? user.tag : 'Unknown User';

        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

        if (isGlobal) {
            description += `${medal} **${name}**\n` +
                `Level: **${userData.max_level}** | Total XP: **${userData.global_xp.toLocaleString()}**\n\n`;
        } else {
            description += `${medal} **${name}**\n` +
                `Level: **${userData.level}** | Total XP: **${userData.total_xp.toLocaleString()}**\n\n`;
        }
    }

    embed.setDescription(description);

    if (ctx.reply) {
        await ctx.reply({ embeds: [embed] });
    } else {
        await ctx.channel.send({ embeds: [embed] });
    }
}

function setup(client) {
    client.commands.set('xp', xp);
    client.commands.set('level', xp);
    client.commands.set('rank', xp);
    client.commands.set('ranks', xp);
    client.commands.set('xptop', xptop);
    client.commands.set('leveltop', xptop);
    client.commands.set('ranktop', xptop);
    client.commands.set('xpglobal', xpglobal);
    client.commands.set('levelglobal', xpglobal);
    client.commands.set('rankglobal', xpglobal);

    console.log('✅ XP/Level commands registered');
}

module.exports = {
    xp,
    xptop,
    xpglobal,
    setup
};