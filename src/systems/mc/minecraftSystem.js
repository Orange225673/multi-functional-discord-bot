///////////////////////////////////////////////////////////////////////
//                   MINECRAFT AFK BOT SYSTEM                         //
///////////////////////////////////////////////////////////////////////

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { isOwner } = require('../../utils/helpers');
const DataManager = require('../../utils/dataManager');

const dataManager = new DataManager();

// Paths
const MINECRAFT_BOTS_PATH = path.join(process.cwd(), 'minecraft_bots');
const NODE_BOT_SCRIPT = path.join(MINECRAFT_BOTS_PATH, 'bot.js');

// Active bots: { guild_id: { bot_id: { process, config } } }
const activeBots = new Map();

class MineflayerBot {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.password = data.password;
        this.server_ip = data.server_ip;
        this.server_port = data.server_port || 25565;
        this.version = data.version || '1.21.1';
        this.is_registered = data.registered || false;

        this.process = null;
        this.running = false;
        this.status = 'offline';
        this.error_message = null;
        this.configFile = path.join(MINECRAFT_BOTS_PATH, `${this.id}.json`);
    }

    start() {
        try {
            // Create config file
            const config = {
                username: this.username,
                password: this.password,
                host: this.server_ip,
                port: this.server_port,
                version: this.version,
                registered: this.is_registered
            };

            // Ensure directory exists
            if (!fs.existsSync(MINECRAFT_BOTS_PATH)) {
                fs.mkdirSync(MINECRAFT_BOTS_PATH, { recursive: true });
            }

            fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));

            console.log(`[${this.username}] Starting Mineflayer bot...`);
            console.log(`[${this.username}] Server: ${this.server_ip}:${this.server_port}`);
            console.log(`[${this.username}] Version: ${this.version}`);

            // Check if bot script exists
            if (!fs.existsSync(NODE_BOT_SCRIPT)) {
                this.error_message = 'Mineflayer bot script not found!';
                console.error(`[${this.username}] ❌ ${this.error_message}`);
                return false;
            }

            // Start Node.js process
            this.process = spawn('node', [NODE_BOT_SCRIPT, this.configFile]);

            this.process.stdout.on('data', (data) => {
                console.log(`[${this.username}] ${data.toString().trim()}`);
            });

            this.process.stderr.on('data', (data) => {
                console.error(`[${this.username}] ${data.toString().trim()}`);
            });

            this.process.on('close', (code) => {
                console.log(`[${this.username}] Process exited with code ${code}`);
                this.running = false;
                this.status = 'offline';
            });

            this.running = true;
            this.status = 'online';

            console.log(`[${this.username}] ✅ Process started (PID: ${this.process.pid})`);
            return true;

        } catch (error) {
            this.error_message = error.message;
            console.error(`[${this.username}] ❌ Failed to start: ${error.message}`);
            return false;
        }
    }

    stop() {
        if (this.process) {
            try {
                this.process.kill('SIGTERM');
                console.log(`[${this.username}] 🛑 Process terminated`);
            } catch (error) {
                console.error(`[${this.username}] ⚠️ Error stopping: ${error.message}`);
            }
            this.process = null;
        }

        // Clean up config file
        if (fs.existsSync(this.configFile)) {
            try {
                fs.unlinkSync(this.configFile);
            } catch (error) {
                // Ignore
            }
        }

        this.running = false;
        this.status = 'offline';
    }

    isAlive() {
        return this.process && !this.process.killed;
    }

    getStatus() {
        if (this.process && !this.isAlive()) {
            this.running = false;
            this.status = 'offline';
        }

        return {
            id: this.id,
            username: this.username,
            server: `${this.server_ip}:${this.server_port}`,
            version: this.version,
            status: this.status,
            registered: this.is_registered,
            running: this.running,
            error: this.error_message
        };
    }
}

function loadGuildBots(guildId) {
    const data = dataManager.loadFile(guildId, 'minecraft_bots.json');
    const bots = {};

    for (const botData of (data.bots || [])) {
        const bot = new MineflayerBot(botData);
        bots[bot.id] = bot;
    }

    if (!activeBots.has(guildId.toString())) {
        activeBots.set(guildId.toString(), {});
    }

    Object.assign(activeBots.get(guildId.toString()), bots);
    return bots;
}

function saveGuildBots(guildId) {
    const bots = activeBots.get(guildId.toString()) || {};
    const botsList = [];

    for (const bot of Object.values(bots)) {
        botsList.push({
            id: bot.id,
            username: bot.username,
            password: bot.password,
            server_ip: bot.server_ip,
            server_port: bot.server_port,
            version: bot.version,
            registered: bot.is_registered
        });
    }

    dataManager.saveFile(guildId, 'minecraft_bots.json', { bots: botsList });
}

function isAdminOrOwner(message, client) {
    return isOwner(message.author.id, client.config.OWNER_ID) ||
        message.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function setup(client) {
    // ============ CREATE BOT ============
    client.commands.set('create-bot', {
        name: 'create-bot',
        description: 'Create a Minecraft AFK bot',
        async execute(message, args, client) {
            if (!isAdminOrOwner(message, client)) {
                return message.reply('❌ You need **Manage Server** permission!');
            }

            if (args.length < 5) {
                return message.reply(
                    '❌ Usage: `%create-bot <username> <password> <confirm_pass> <server_ip> <server_port> [version]`\n' +
                    'Example: `%create-bot MyBot pass123 pass123 play.hypixel.net 25565 1.21.1`'
                );
            }

            const [username, password, confirmPass, serverIp, serverPort, version = '1.21.1'] = args;

            if (password !== confirmPass) {
                return message.reply('❌ Passwords don\'t match!');
            }

            if (password.length < 4) {
                return message.reply('❌ Password must be at least 4 characters!');
            }

            if (username.length < 3 || username.length > 16) {
                return message.reply('❌ Username must be 3-16 characters!');
            }

            const guildId = message.guild.id;
            const bots = loadGuildBots(guildId);

            // Check if username already exists
            for (const bot of Object.values(bots)) {
                if (bot.username.toLowerCase() === username.toLowerCase()) {
                    return message.reply(`❌ Bot named **${username}** already exists!`);
                }
            }

            // Check max bots
            const maxBots = isOwner(message.author.id, client.config.OWNER_ID) ? 5 : 2;
            if (Object.keys(bots).length >= maxBots) {
                return message.reply(`❌ Maximum ${maxBots} bots allowed!`);
            }

            const botId = `${message.author.id}_${Object.keys(bots).length}_${guildId}`;
            const botData = {
                id: botId,
                username,
                password,
                server_ip: serverIp,
                server_port: parseInt(serverPort),
                version,
                registered: false
            };

            const newBot = new MineflayerBot(botData);
            bots[botId] = newBot;
            activeBots.get(guildId.toString())[botId] = newBot;
            saveGuildBots(guildId);

            // Delete message with password
            try {
                await message.delete();
            } catch (error) {
                // No permission
            }

            const embed = new EmbedBuilder()
                .setTitle('🤖 Minecraft Bot Created!')
                .setDescription(`Bot **${username}** created with **Mineflayer**!`)
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Username', value: username, inline: true },
                    { name: 'Server', value: `${serverIp}:${serverPort}`, inline: true },
                    { name: 'Version', value: `✅ ${version}`, inline: true },
                    { name: 'Bot ID', value: `\`${botId}\``, inline: false },
                    { name: 'Next Steps', value: `\`%start-bot ${botId}\` - Start the bot`, inline: false }
                )
                .setFooter({ text: 'Powered by Mineflayer | Password deleted' });

            await message.channel.send({ embeds: [embed] });
        }
    });

    // ============ START BOT ============
    client.commands.set('start-bot', {
        name: 'start-bot',
        description: 'Start a Minecraft bot',
        async execute(message, args, client) {
            if (args.length === 0) {
                return message.reply('❌ Usage: `%start-bot <bot_id>`');
            }

            const botId = args[0];
            const guildId = message.guild.id;
            const bots = loadGuildBots(guildId);

            if (!bots[botId]) {
                return message.reply(`❌ Bot \`${botId}\` not found! Use \`%bot-status\` to list bots.`);
            }

            const bot = bots[botId];

            if (bot.isAlive()) {
                return message.reply(`⚠️ **${bot.username}** is already running!`);
            }

            await message.reply(`🔄 Starting **${bot.username}** with Mineflayer...`);

            const success = bot.start();

            if (success) {
                setTimeout(async () => {
                    if (bot.isAlive()) {
                        const embed = new EmbedBuilder()
                            .setTitle('✅ Bot Started!')
                            .setDescription(`**${bot.username}** is now online!`)
                            .setColor(0x00FF00)
                            .addFields(
                                { name: 'Server', value: bot.server_ip, inline: true },
                                { name: 'Version', value: bot.version, inline: true },
                                { name: 'Engine', value: '🟢 Mineflayer', inline: true },
                                {
                                    name: 'Features',
                                    value: '✅ Auto /register\n✅ Auto /login\n✅ Anti-AFK movements\n✅ Keep-alive',
                                    inline: false
                                }
                            );

                        await message.channel.send({ embeds: [embed] });
                    } else {
                        await message.reply('⚠️ Bot started but may have crashed. Check console.');
                    }
                }, 2000);
            } else {
                const error = bot.error_message || 'Unknown error';
                await message.reply(`❌ Failed to start: ${error}`);
            }
        }
    });

    // ============ STOP BOT ============
    client.commands.set('stop-bot', {
        name: 'stop-bot',
        description: 'Stop a Minecraft bot',
        async execute(message, args, client) {
            if (args.length === 0) {
                return message.reply('❌ Usage: `%stop-bot <bot_id>`');
            }

            const botId = args[0];
            const guildId = message.guild.id;
            const bots = loadGuildBots(guildId);

            if (!bots[botId]) {
                return message.reply(`❌ Bot \`${botId}\` not found!`);
            }

            const bot = bots[botId];

            if (!bot.isAlive()) {
                return message.reply(`⚠️ **${bot.username}** is not running!`);
            }

            bot.stop();
            await message.reply(`⏹️ **${bot.username}** stopped!`);
        }
    });

    // ============ BOT STATUS ============
    client.commands.set('bot-status', {
        name: 'bot-status',
        description: 'Show all Minecraft bots',
        async execute(message, args, client) {
            const guildId = message.guild.id;
            const bots = loadGuildBots(guildId);

            if (Object.keys(bots).length === 0) {
                return message.reply(
                    '📭 No bots configured for this server.\n' +
                    'Use `%create-bot` to create one!\n' +
                    '💡 **Now using Mineflayer** - Full 1.21.1 support!'
                );
            }

            const embed = new EmbedBuilder()
                .setTitle(`🤖 Minecraft Bots - ${message.guild.name}`)
                .setDescription('Powered by **Mineflayer** (Node.js)')
                .setColor(0x0099FF)
                .setFooter({ text: '🎮 Mineflayer - Full version support up to 1.21.1+' });

            for (const bot of Object.values(bots)) {
                const statusEmoji = bot.isAlive() ? '🟢' : '🔴';

                let value = `**Server:** ${bot.server_ip}:${bot.server_port}\n` +
                    `**Version:** ✅ ${bot.version}\n` +
                    `**Status:** ${bot.status.toUpperCase()}\n` +
                    `**ID:** \`${bot.id}\``;

                if (bot.error_message) {
                    value += `\n**Error:** ${bot.error_message.substring(0, 50)}...`;
                }

                embed.addFields({ name: `${statusEmoji} ${bot.username}`, value, inline: true });
            }

            await message.reply({ embeds: [embed] });
        }
    });

    // ============ DELETE BOT ============
    client.commands.set('delete-bot', {
        name: 'delete-bot',
        description: 'Delete a Minecraft bot',
        async execute(message, args, client) {
            if (!isAdminOrOwner(message, client)) {
                return message.reply('❌ You need **Manage Server** permission!');
            }

            if (args.length === 0) {
                return message.reply('❌ Usage: `%delete-bot <bot_id>`');
            }

            const botId = args[0];
            const guildId = message.guild.id;
            const bots = loadGuildBots(guildId);

            if (!bots[botId]) {
                return message.reply(`❌ Bot \`${botId}\` not found!`);
            }

            const bot = bots[botId];

            if (bot.isAlive()) {
                return message.reply(`⚠️ Stop **${bot.username}** before deleting!`);
            }

            const botName = bot.username;
            delete bots[botId];
            delete activeBots.get(guildId.toString())[botId];
            saveGuildBots(guildId);

            await message.reply(`🗑️ **${botName}** deleted!`);
        }
    });

    console.log('✅ Minecraft bot system loaded (Mineflayer)');
}

module.exports = { setup };
