//======================================================================
//                    MINECRAFT AFK BOT MANAGER
//======================================================================

const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');

class MinecraftBot {
    constructor(botData, statusCallback) {
        this.name = botData.name;
        this.password = botData.password;
        this.host = botData.serverIp;
        this.port = botData.port || 25565;
        this.version = botData.version;
        this.bot = null;
        this.antiAfkInterval = null;
        this.statusCallback = statusCallback;
        this.shouldReconnect = true;
        this.isRegistered = false;
        this.isLoggedIn = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 20;
        this.reconnectTimeout = null;
    }

    start() {
        return new Promise((resolve, reject) => {
            try {
                this.statusCallback(`🔌 Bot ${this.name} connecting to ${this.host}:${this.port}...`);
                
                this.bot = mineflayer.createBot({
                    host: this.host,
                    port: this.port,
                    username: this.name,
                    version: this.version,
                    auth: 'offline',
                    hideErrors: false,
                    checkTimeoutInterval: 60000, // Check for timeout every 60 seconds
                    keepAlive: true
                });

                this.bot.once('spawn', () => {
                    this.statusCallback(`✅ Bot ${this.name} connected!`);
                    this.reconnectAttempts = 0;
                    this.startAntiAfk();
                    resolve();
                });

                this.bot.on('message', (msg) => {
                    const message = msg.toString().toLowerCase();
                    
                    if (!this.isRegistered && (message.includes('/register') || message.includes('register'))) {
                        setTimeout(() => {
                            if (this.bot && this.bot.entity) {
                                this.bot.chat(`/register ${this.password} ${this.password}`);
                                this.isRegistered = true;
                                this.statusCallback(`🔐 Bot ${this.name} registered`);
                            }
                        }, 2000);
                    }
                    
                    if (message.includes('/login') || message.includes('log in') || message.includes('login')) {
                        if (!this.isLoggedIn) {
                            setTimeout(() => {
                                if (this.bot && this.bot.entity) {
                                    this.bot.chat(`/login ${this.password}`);
                                    this.isLoggedIn = true;
                                    this.statusCallback(`🔓 Bot ${this.name} logged in`);
                                }
                            }, 1000);
                        }
                    }
                });

                this.bot.on('kicked', (reason) => {
                    this.statusCallback(`⚠️ Bot ${this.name} kicked: ${JSON.stringify(reason)}`);
                    this.handleDisconnect();
                });

                this.bot.on('error', (err) => {
                    // Handle timeout errors gracefully
                    if (err.message && (err.message.includes('timed out') || err.message.includes('timeout'))) {
                        this.statusCallback(`⏱️ Bot ${this.name} connection timeout`);
                    } else {
                        this.statusCallback(`❌ Bot ${this.name} error: ${err.message}`);
                    }
                    this.handleDisconnect();
                });

                this.bot.on('end', (reason) => {
                    this.statusCallback(`🔌 Bot ${this.name} disconnected`);
                    this.handleDisconnect();
                });

            } catch (err) {
                this.statusCallback(`❌ Bot ${this.name} failed: ${err.message}`);
                reject(err);
            }
        });
    }

    startAntiAfk() {
        this.antiAfkInterval = setInterval(() => {
            if (this.bot && this.bot.entity) {
                const movements = [
                    () => this.bot.setControlState('forward', true),
                    () => this.bot.setControlState('back', true),
                    () => this.bot.setControlState('left', true),
                    () => this.bot.setControlState('right', true),
                    () => this.bot.setControlState('jump', true)
                ];

                const randomMove = movements[Math.floor(Math.random() * movements.length)];
                randomMove();
                
                setTimeout(() => {
                    if (this.bot) this.bot.clearControlStates();
                }, 500);
            }
        }, 10000);
    }

    handleDisconnect() {
        if (this.antiAfkInterval) {
            clearInterval(this.antiAfkInterval);
            this.antiAfkInterval = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (!this.shouldReconnect) return;

        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.statusCallback(`❌ Bot ${this.name} max retries reached`);
            this.shouldReconnect = false;
            return;
        }
        
        const delay = this.reconnectAttempts * 10000;
        this.statusCallback(`🔄 Bot ${this.name} reconnecting in ${delay / 1000}s (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        this.reconnectTimeout = setTimeout(() => {
            if (this.shouldReconnect) {
                this.start().catch(err => {
                    this.statusCallback(`❌ Reconnect failed: ${err.message}`);
                });
            }
        }, delay);
    }

    stop() {
        this.shouldReconnect = false;
        this.reconnectAttempts = 0;
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        if (this.antiAfkInterval) {
            clearInterval(this.antiAfkInterval);
            this.antiAfkInterval = null;
        }
        
        if (this.bot) {
            try {
                this.bot.quit();
            } catch (err) {}
            this.bot = null;
        }
    }

    restart() {
        this.stop();
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.isRegistered = false;
        this.isLoggedIn = false;
        setTimeout(() => {
            this.start().catch(err => {
                this.statusCallback(`❌ Restart failed: ${err.message}`);
            });
        }, 2000);
    }

    getStatus() {
        return {
            name: this.name,
            host: this.host,
            port: this.port,
            version: this.version,
            online: this.bot && this.bot.entity ? true : false,
            registered: this.isRegistered,
            loggedIn: this.isLoggedIn
        };
    }
}

class MinecraftBotManager {
    constructor() {
        this.bots = new Map();
        this.dataPath = path.join(__dirname, '../data/minecraft_bots.json');
        this.statusCallback = null;
        this.ensureDataFile();
        this.loadBots();
    }

    ensureDataFile() {
        const dir = path.dirname(this.dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.dataPath)) {
            fs.writeFileSync(this.dataPath, JSON.stringify([], null, 2));
        }
    }

    setStatusCallback(callback) {
        this.statusCallback = callback;
    }

    loadBots() {
        try {
            const data = fs.readFileSync(this.dataPath, 'utf8');
            const botsData = JSON.parse(data);
            
            botsData.forEach((botData) => {
                const bot = new MinecraftBot(botData, (msg) => this.sendStatus(msg));
                this.bots.set(botData.name, bot);
                
                if (botData.running !== false) {
                    bot.start().catch(err => {
                        this.sendStatus(`❌ Failed to start ${botData.name}: ${err.message}`);
                    });
                } else {
                    bot.shouldReconnect = false;
                }
            });

            if (botsData.length > 0) {
                const running = botsData.filter(b => b.running !== false).length;
                this.sendStatus(`🚀 Loaded ${botsData.length} MC bot(s) - ${running} running`);
            }
        } catch (err) {
            console.error('Error loading MC bots:', err);
        }
    }

    saveBots() {
        const botsData = Array.from(this.bots.values()).map(bot => ({
            name: bot.name,
            password: bot.password,
            serverIp: bot.host,
            port: bot.port,
            version: bot.version,
            running: bot.shouldReconnect
        }));
        fs.writeFileSync(this.dataPath, JSON.stringify(botsData, null, 2));
    }

    sendStatus(message) {
        console.log(message);
        if (this.statusCallback) {
            this.statusCallback(message);
        }
    }

    async createBot(name, password, serverIp, version, port = 25565) {
        if (this.bots.has(name)) {
            throw new Error(`Bot ${name} already exists`);
        }

        const botData = { name, password, serverIp, port, version, running: true };
        const bot = new MinecraftBot(botData, (msg) => this.sendStatus(msg));
        
        this.bots.set(name, bot);
        this.saveBots();
        
        await bot.start();
        return `✅ MC Bot ${name} created and started!`;
    }

    deleteBot(name) {
        const bot = this.bots.get(name);
        if (!bot) {
            throw new Error(`Bot ${name} not found`);
        }

        bot.stop();
        this.bots.delete(name);
        this.saveBots();
        return `🗑️ MC Bot ${name} deleted`;
    }

    startBot(name) {
        const bot = this.bots.get(name);
        if (!bot) {
            throw new Error(`Bot ${name} not found`);
        }

        if (bot.bot && bot.bot.entity) {
            return `⚠️ Bot ${name} is already running`;
        }

        bot.shouldReconnect = true;
        this.saveBots();
        bot.start().catch(err => {
            this.sendStatus(`❌ Failed to start ${name}: ${err.message}`);
        });
        return `▶️ MC Bot ${name} starting...`;
    }

    stopBot(name) {
        const bot = this.bots.get(name);
        if (!bot) {
            throw new Error(`Bot ${name} not found`);
        }

        bot.stop();
        this.saveBots();
        return `⏹️ MC Bot ${name} stopped`;
    }

    restartBot(name) {
        const bot = this.bots.get(name);
        if (!bot) {
            throw new Error(`Bot ${name} not found`);
        }

        bot.restart();
        return `🔄 MC Bot ${name} restarting`;
    }

    listBots() {
        if (this.bots.size === 0) {
            return 'No Minecraft bots created yet';
        }

        let list = '**Minecraft AFK Bots:**\n';
        this.bots.forEach((bot) => {
            const status = bot.getStatus();
            list += `\n🎮 **${status.name}**\n`;
            list += `   Server: ${status.host}:${status.port}\n`;
            list += `   Version: ${status.version}\n`;
            list += `   Status: ${status.online ? '🟢 Online' : '🔴 Offline'}\n`;
            list += `   Auth: ${status.registered ? '✅' : '❌'} Reg | ${status.loggedIn ? '✅' : '❌'} Login\n`;
        });

        return list;
    }

    getBots() {
        return Array.from(this.bots.values()).map(bot => bot.getStatus());
    }
}

module.exports = MinecraftBotManager;
