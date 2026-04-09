//======================================================================
//                   ENABLE XP COMMAND (ADMIN ONLY)
//======================================================================

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('../utils/DatabaseManager');

const dbManager = new DatabaseManager();

module.exports = {
    name: 'enablexp',
    description: 'Enable XP system for this server',
    aliases: ['xpenable'],

    async execute(message, args, client) {
        // Check permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            message.author.id !== '972306366599397427') {
            return message.reply('❌ You need Manage Server permission!');
        }

        try {
            // Get current config
            const config = dbManager.getServerConfig(message.guild.id);

            // Enable XP
            config.xp_enabled = true;
            if (!config.xp_multiplier) {
                config.xp_multiplier = 1.0;
            }

            // Save config
            dbManager.saveServerConfig(message.guild.id, config);

            const embed = new EmbedBuilder()
                .setTitle('✅ XP System Enabled!')
                .setDescription(`The XP system is now **enabled** for **${message.guild.name}**`)
                .setColor(0x00FF00)
                .addFields(
                    { name: 'XP Per Message', value: '15-25 XP (1 min cooldown)', inline: true },
                    { name: 'Server Multiplier', value: `${config.xp_multiplier}x`, inline: true },
                    { name: 'Booster Bonus', value: '2x XP', inline: true }
                )
                .setFooter({ text: 'Users will now gain XP from messages!' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            console.log(`✅ XP enabled for server: ${message.guild.name} (${message.guild.id})`);

        } catch (error) {
            console.error('Error enabling XP:', error);
            await message.reply(`❌ Error: ${error.message}`);
        }
    },

    async run(message, args, client) {
        return this.execute(message, args, client);
    }
};