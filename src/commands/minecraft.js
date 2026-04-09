//======================================================================
//                    MINECRAFT BOT COMMANDS
//======================================================================

const MinecraftBotManager = require('../systems/minecraftBotManager');

const mcBotManager = new MinecraftBotManager();

function setup(client) {
    // Set status callback to send to Discord
    mcBotManager.setStatusCallback((message) => {
        // You can configure a specific channel for MC bot status
        console.log('[MC BOT]', message);
    });

    // ============ MC CREATE COMMAND ============
    client.commands.set('mc-create', {
        name: 'mc-create',
        description: 'Create Minecraft AFK bot',
        async execute(message, args, client) {
            const config = client.config || require('../config');
            if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
                return message.reply('❌ You need Manage Server permission!');
            }

            if (args.length < 4) {
                return message.reply('❌ Usage: `%mc-create <name> <password> <ip> <version> [port]`');
            }

            const [name, password, serverIp, version, port] = args;

            try {
                const result = await mcBotManager.createBot(name, password, serverIp, version, port ? parseInt(port) : undefined);
                await message.reply(result);
            } catch (err) {
                await message.reply(`❌ Error: ${err.message}`);
            }
        }
    });

    // ============ MC DELETE COMMAND ============
    client.commands.set('mc-delete', {
        name: 'mc-delete',
        description: 'Delete Minecraft AFK bot',
        async execute(message, args, client) {
            const config = client.config || require('../config');
            if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
                return message.reply('❌ You need Manage Server permission!');
            }

            if (args.length < 1) {
                return message.reply('❌ Usage: `%mc-delete <name>`');
            }

            try {
                const result = mcBotManager.deleteBot(args[0]);
                await message.reply(result);
            } catch (err) {
                await message.reply(`❌ Error: ${err.message}`);
            }
        }
    });

    // ============ MC START COMMAND ============
    client.commands.set('mc-start', {
        name: 'mc-start',
        description: 'Start Minecraft AFK bot',
        async execute(message, args, client) {
            const config = client.config || require('../config');
            if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
                return message.reply('❌ You need Manage Server permission!');
            }

            if (args.length < 1) {
                return message.reply('❌ Usage: `%mc-start <name>`');
            }

            try {
                const result = mcBotManager.startBot(args[0]);
                await message.reply(result);
            } catch (err) {
                await message.reply(`❌ Error: ${err.message}`);
            }
        }
    });

    // ============ MC STOP COMMAND ============
    client.commands.set('mc-stop', {
        name: 'mc-stop',
        description: 'Stop Minecraft AFK bot',
        async execute(message, args, client) {
            const config = client.config || require('../config');
            if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
                return message.reply('❌ You need Manage Server permission!');
            }

            if (args.length < 1) {
                return message.reply('❌ Usage: `%mc-stop <name>`');
            }

            try {
                const result = mcBotManager.stopBot(args[0]);
                await message.reply(result);
            } catch (err) {
                await message.reply(`❌ Error: ${err.message}`);
            }
        }
    });

    // ============ MC RESTART COMMAND ============
    client.commands.set('mc-restart', {
        name: 'mc-restart',
        description: 'Restart Minecraft AFK bot',
        async execute(message, args, client) {
            const config = client.config || require('../config');
            if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
                return message.reply('❌ You need Manage Server permission!');
            }

            if (args.length < 1) {
                return message.reply('❌ Usage: `%mc-restart <name>`');
            }

            try {
                const result = mcBotManager.restartBot(args[0]);
                await message.reply(result);
            } catch (err) {
                await message.reply(`❌ Error: ${err.message}`);
            }
        }
    });

    // ============ MC LIST COMMAND ============
    client.commands.set('mc-list', {
        name: 'mc-list',
        aliases: ['mc-bots'],
        description: 'List all Minecraft AFK bots',
        async execute(message, args, client) {
            try {
                const result = mcBotManager.listBots();
                await message.reply(result);
            } catch (err) {
                await message.reply(`❌ Error: ${err.message}`);
            }
        }
    });

    client.commands.set('mc-bots', client.commands.get('mc-list'));

    console.log('✅ Minecraft bot commands loaded');
}

module.exports = { setup, mcBotManager };
