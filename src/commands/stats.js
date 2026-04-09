///////////////////////////////////////////////////////////////////////
//                         STATS COMMANDS                             //
///////////////////////////////////////////////////////////////////////

const { EmbedBuilder } = require('discord.js');
const { formatNumber } = require('../utils/helpers');
const DataManager = require('../utils/dataManager');
const DatabaseManager = require('../utils/DatabaseManager');

const dataManager = new DataManager();
const dbManager = new DatabaseManager();

function setup(client) {
    // ============ ME COMMAND ============
    client.commands.set('me', {
        name: 'me',
        aliases: ['stats', 'mystats'],
        description: 'Show your message stats',
        async execute(message, args, client) {
            const target = message.mentions.users.first() || message.author;
            const stats = dbManager.getUserStats(message.guild.id, target.id);

            const embed = new EmbedBuilder()
                .setTitle(`📊 Stats: ${target.username}`)
                .setThumbnail(target.displayAvatarURL())
                .setColor(0x00FFFF)
                .addFields(
                    { name: 'Daily Messages', value: `\`${formatNumber(stats.daily_messages || 0)}\``, inline: true },
                    { name: 'Total Messages', value: `\`${formatNumber(stats.total_messages || 0)}\``, inline: true }
                )
                .setFooter({ text: 'Keep chatting to increase your giveaway chances!' });

            await message.reply({ embeds: [embed] });
        }
    });

    client.commands.set('stats', client.commands.get('me'));
    client.commands.set('mystats', client.commands.get('me'));

    // ============ TOP TOTAL COMMAND ============
    client.commands.set('toptotal', {
        name: 'toptotal',
        aliases: ['leaderboard-total'],
        description: 'Top 10 all-time message count',
        async execute(message, args, client) {
            const topUsers = dbManager.getTopMessageSenders(message.guild.id, 10);

            if (topUsers.length === 0) {
                return message.reply('💭 Leaderboard is empty! Start chatting to appear here.');
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 All-Time Leaderboard')
                .setColor(0xFFD700);

            let description = '';
            for (let i = 0; i < topUsers.length; i++) {
                const { user_id, total_messages } = topUsers[i];
                try {
                    const user = await client.users.fetch(user_id);
                    description += `\`#${i + 1}\` **${user.username}**: ${formatNumber(total_messages)} msgs\n`;
                } catch (error) {
                    description += `\`#${i + 1}\` Unknown User: ${formatNumber(total_messages)} msgs\n`;
                }
            }

            embed.setDescription(description);
            await message.reply({ embeds: [embed] });
        }
    });

    // ============ TOP DAILY COMMAND ============
    client.commands.set('topdaily', {
        name: 'topdaily',
        aliases: ['leaderboard-daily'],
        description: 'Top 10 daily message count',
        async execute(message, args, client) {
            const topDaily = dbManager.getTopDailyMessageSenders(message.guild.id, 10);

            if (topDaily.length === 0) {
                return message.reply('💭 Leaderboard is empty! Start chatting to appear here.');
            }

            const embed = new EmbedBuilder()
                .setTitle('🔥 Daily Leaderboard')
                .setColor(0xFF4500);

            let description = '';
            for (let i = 0; i < topDaily.length; i++) {
                const { user_id, daily_messages } = topDaily[i];
                try {
                    const user = await client.users.fetch(user_id);
                    description += `\`#${i + 1}\` **${user.username}**: ${formatNumber(daily_messages)} msgs\n`;
                } catch (error) {
                    description += `\`#${i + 1}\` Unknown User: ${formatNumber(daily_messages)} msgs\n`;
                }
            }

            embed.setDescription(description);
            await message.reply({ embeds: [embed] });
        }
    });

    // ============ TOP GLOBAL MESSAGES ============
    // ============ TOP GLOBAL MESSAGES (FIXED - DATABASE VERSION) ============
    client.commands.set('topglobalmsg', {
        name: 'topglobalmsg',
        aliases: ['globalmessages', 'globalmsg'],
        description: 'Top 10 message count across ALL servers',
        async execute(message, args, client) {
            const loadingMsg = await message.reply('🔄 Loading global message leaderboard...');

            // Get global top message senders from database
            const topUsers = dbManager.getGlobalTopMessageSenders(10);

            if (topUsers.length === 0) {
                return loadingMsg.edit('💭 No one has sent messages yet!');
            }

            const embed = new EmbedBuilder()
                .setTitle('🌎 Global Top 10 Most Active Users')
                .setColor(0xFFD700)
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp();

            let description = '';

            for (let i = 0; i < topUsers.length; i++) {
                const { user_id, total_messages } = topUsers[i];
                const user = await client.users.fetch(user_id).catch(() => null);

                if (user) {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
                    description += `${medal} **${user.tag}**: ${formatNumber(total_messages)} msgs\n`;
                }
            }

            embed.setDescription(description);

            // Add top user's avatar
            if (topUsers.length > 0) {
                const topUser = await client.users.fetch(topUsers[0].user_id).catch(() => null);
                if (topUser) {
                    embed.setThumbnail(topUser.displayAvatarURL({ size: 256 }));
                }
            }

            await loadingMsg.edit({ content: null, embeds: [embed] });
        }
    });

    client.commands.set('globalmessages', client.commands.get('topglobalmsg'));
    client.commands.set('globalmsg', client.commands.get('topglobalmsg'));
    // =============== TOP MATH LEADERBOARD POINT ======
    client.commands.set('mathleaderboard', {
        name: 'mathleaderboard',
        aliases: ['mathtop', 'mathboard'],
        description: 'Top 10 math quiz players in this server',
        async execute(message, args, client) {
            const topPlayers = dbManager.getTopMathPlayers(message.guild.id, 10);

            if (topPlayers.length === 0) {
                return message.reply('📊 No math quiz players yet! Start a quiz with `/math`');
            }

            const embed = new EmbedBuilder()
                .setTitle(`🧮 ${message.guild.name} - Math Leaderboard`)
                .setColor(0x00D9FF)
                .setDescription('*Top 10 players by math points*')
                .setTimestamp();

            for (let i = 0; i < topPlayers.length; i++) {
                const { user_id, math_points } = topPlayers[i];
                const user = await client.users.fetch(user_id).catch(() => null);
                const name = user ? user.username : 'Unknown User';
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

                embed.addFields({
                    name: `${medal} ${name}`,
                    value: `**${math_points}** points`,
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });
        }
    });

    client.commands.set('mathtop', client.commands.get('mathleaderboard'));
    client.commands.set('mathboard', client.commands.get('mathleaderboard'));

    // GLOBAL
    client.commands.set('mathglobal', {
        name: 'mathglobal',
        aliases: ['mathleaderboardglobal', 'globalmathboard'],
        description: 'Top 10 math quiz players across all servers',
        async execute(message, args, client) {
            const loadingMsg = await message.reply('🔄 Loading global math leaderboard...');

            // Need to add this method to DatabaseManager!
            const topPlayers = dbManager.getGlobalTopMathPlayers(10);

            if (topPlayers.length === 0) {
                return loadingMsg.edit('📊 No math quiz players yet!');
            }

            const embed = new EmbedBuilder()
                .setTitle('🌍 Global Math Leaderboard')
                .setColor(0xFFD700)
                .setDescription('*Top 10 players worldwide by math points*')
                .setTimestamp();

            for (let i = 0; i < topPlayers.length; i++) {
                const { user_id, total_math_points, server_count } = topPlayers[i];
                const user = await client.users.fetch(user_id).catch(() => null);
                const name = user ? user.tag : 'Unknown User';
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

                embed.addFields({
                    name: `${medal} ${name}`,
                    value: `**${total_math_points}** points | ${server_count} server(s)`,
                    inline: false
                });
            }

            await loadingMsg.edit({ content: null, embeds: [embed] });
        }
    });

    client.commands.set('mathleaderboardglobal', client.commands.get('mathglobal'));
    client.commands.set('globalmathboard', client.commands.get('mathglobal'));
}

module.exports = { setup };
