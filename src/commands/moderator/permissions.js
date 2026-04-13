//======================================================================
//                    PERMISSION COMMANDS
//======================================================================

const PermissionManager = require('../../systems/moderation/permissionManager');
const { EmbedBuilder } = require('discord.js');

const permManager = new PermissionManager();

function setup(client) {
    // ============ ADD WHITELIST ROLE ============
    client.commands.set('whitelist-add', {
        name: 'whitelist-add',
        description: 'Add role to admin whitelist',
        async execute(message, args, client) {
            const config = client.config || require('../config');
            if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
                return message.reply('❌ You need Manage Server permission!');
            }

            const role = message.mentions.roles.first();
            if (!role) {
                return message.reply('❌ Usage: `%whitelist-add @role`');
            }

            permManager.addWhitelistedRole(message.guild.id, role.id);
            await message.reply(`✅ Added ${role} to admin whitelist!`);
        }
    });

    // ============ REMOVE WHITELIST ROLE ============
    client.commands.set('whitelist-remove', {
        name: 'whitelist-remove',
        description: 'Remove role from admin whitelist',
        async execute(message, args, client) {
            const config = client.config || require('../config');
            if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
                return message.reply('❌ You need Manage Server permission!');
            }

            const role = message.mentions.roles.first();
            if (!role) {
                return message.reply('❌ Usage: `%whitelist-remove @role`');
            }

            permManager.removeWhitelistedRole(message.guild.id, role.id);
            await message.reply(`✅ Removed ${role} from admin whitelist!`);
        }
    });

    // ============ LIST WHITELIST ROLES ============
    client.commands.set('whitelist-list', {
        name: 'whitelist-list',
        aliases: ['whitelist'],
        description: 'List all whitelisted roles',
        async execute(message, args, client) {
            const roles = await permManager.listWhitelistedRoles(message.guild);

            if (roles.length === 0) {
                return message.reply('📭 No whitelisted roles configured!\n\nBy default, these users can use admin commands:\n- Bot Owner\n- Users with Manage Server permission');
            }

            const embed = new EmbedBuilder()
                .setTitle('🔐 Admin Whitelist Roles')
                .setDescription('Users with these roles can use admin commands:')
                .setColor(0x0099FF)
                .addFields({ 
                    name: 'Default Permissions', 
                    value: '✅ Bot Owner\n✅ Manage Server Permission', 
                    inline: false 
                });

            let rolesText = '';
            roles.forEach(role => {
                rolesText += `<@&${role.id}> (${role.name})\n`;
            });

            if (rolesText) {
                embed.addFields({ name: 'Whitelisted Roles', value: rolesText, inline: false });
            }

            embed.setFooter({ text: 'Use %whitelist-add @role to add more roles' });

            await message.reply({ embeds: [embed] });
        }
    });

    client.commands.set('whitelist', client.commands.get('whitelist-list'));

    console.log('✅ Permission commands loaded');
}

module.exports = { setup, permManager };
