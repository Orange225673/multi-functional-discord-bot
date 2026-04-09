//======================================================================
//                   LEVEL-UP SETTINGS COMMAND
//======================================================================

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const DatabaseManager = require('../utils/DatabaseManager');

const dbManager = new DatabaseManager();

module.exports = {
    name: 'levelup',
    description: 'Configure level-up announcement settings (Admin only)',
    aliases: ['lvlup', 'levelconfig'],

    async execute(message, args, client) {
        // Check permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            message.author.id !== '972306366599397427') {
            return message.reply('❌ You need Manage Server permission!');
        }

        try {
            const config = dbManager.getServerConfig(message.guild.id);

            // Initialize defaults if missing
            if (config.levelup_enabled === undefined) config.levelup_enabled = true;
            if (config.levelup_min_level === undefined) config.levelup_min_level = 5;

            // If no args, show current settings
            if (args.length === 0) {
                const channelMention = config.levelup_channel_id ?
                    `<#${config.levelup_channel_id}>` :
                    '**Same channel as message**';

                const embed = new EmbedBuilder()
                    .setTitle('🎉 Level-Up Announcement Settings')
                    .setDescription(`Configuration for **${message.guild.name}**`)
                    .setColor(config.levelup_enabled ? 0x00FF00 : 0xFF0000)
                    .addFields(
                        {
                            name: 'Status',
                            value: config.levelup_enabled ? '✅ Enabled' : '❌ Disabled',
                            inline: true
                        },
                        {
                            name: 'Minimum Level',
                            value: `Level ${config.levelup_min_level}+`,
                            inline: true
                        },
                        {
                            name: 'Announcement Channel',
                            value: channelMention,
                            inline: false
                        },
                        {
                            name: 'Available Commands',
                            value:
                                '`%levelup toggle` - Enable/disable announcements\n' +
                                '`%levelup channel <#channel>` - Set announcement channel\n' +
                                '`%levelup channel reset` - Reset to default (same channel)\n' +
                                '`%levelup minlevel <number>` - Set minimum level to announce\n' +
                                '\n**Examples:**\n' +
                                '`%levelup channel #level-ups` - Send to #level-ups\n' +
                                '`%levelup minlevel 10` - Only announce level 10+',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Use the commands above to change settings' })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            const action = args[0].toLowerCase();

            // Toggle announcements
            if (action === 'toggle') {
                config.levelup_enabled = !config.levelup_enabled;
                dbManager.saveServerConfig(message.guild.id, config);

                const status = config.levelup_enabled ? '✅ **enabled**' : '❌ **disabled**';
                return message.reply(`Level-up announcements ${status}!`);
            }

            // Set announcement channel
            if (action === 'channel' || action === 'ch') {
                if (args.length < 2) {
                    return message.reply('❌ Usage: `%levelup channel <#channel>` or `%levelup channel reset`');
                }

                // Reset to default
                if (args[1].toLowerCase() === 'reset' || args[1].toLowerCase() === 'remove') {
                    config.levelup_channel_id = null;
                    dbManager.saveServerConfig(message.guild.id, config);
                    return message.reply('✅ Level-up announcements will now appear in the **same channel** as messages!');
                }

                // Set specific channel
                const channelMention = message.mentions.channels.first();
                if (!channelMention) {
                    return message.reply('❌ Please mention a channel! Example: `%levelup channel #level-ups`');
                }

                if (!channelMention.isTextBased()) {
                    return message.reply('❌ Please mention a text channel!');
                }

                config.levelup_channel_id = channelMention.id;
                dbManager.saveServerConfig(message.guild.id, config);

                return message.reply(`✅ Level-up announcements will now be sent to ${channelMention}!`);
            }

            // Set minimum level
            if (action === 'minlevel' || action === 'min') {
                if (args.length < 2) {
                    return message.reply('❌ Usage: `%levelup minlevel <number>`\nExample: `%levelup minlevel 5`');
                }

                const minLevel = parseInt(args[1]);

                if (isNaN(minLevel) || minLevel < 0 || minLevel > 100) {
                    return message.reply('❌ Minimum level must be between 0 and 100!');
                }

                config.levelup_min_level = minLevel;
                dbManager.saveServerConfig(message.guild.id, config);

                if (minLevel === 0) {
                    return message.reply('✅ Level-up announcements will now show for **all levels**!');
                } else {
                    return message.reply(`✅ Level-up announcements will now only show for **level ${minLevel} and above**!`);
                }
            }

            // Unknown action
            return message.reply('❌ Unknown action! Run `%levelup` to see all commands.');

        } catch (error) {
            console.error('Error in levelup command:', error);
            await message.reply(`❌ Error: ${error.message}`);
        }
    },

    async run(message, args, client) {
        return this.execute(message, args, client);
    }
};