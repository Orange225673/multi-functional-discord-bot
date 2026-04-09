///////////////////////////////////////////////////////////////////////
//                         DATA MANAGER                               //
///////////////////////////////////////////////////////////////////////

const fs = require('fs');
const path = require('path');

class DataManager {
    constructor() {
        this.dataFolder = path.join(process.cwd(), 'data');
        this.ensureDataFolder();
    }

    ensureDataFolder() {
        if (!fs.existsSync(this.dataFolder)) {
            fs.mkdirSync(this.dataFolder, { recursive: true });
        }
    }

    getServerPath(guildId) {
        return path.join(this.dataFolder, guildId.toString());
    }

    ensureServer(guildId) {
        const serverPath = this.getServerPath(guildId);
        if (!fs.existsSync(serverPath)) {
            fs.mkdirSync(serverPath, { recursive: true });
        }
        return serverPath;
    }

    loadFile(guildId, filename) {
        const serverPath = this.ensureServer(guildId);
        const filePath = path.join(serverPath, filename);

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify({}, null, 4));
            return {};
        }

        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return {};
        }
    }

    saveFile(guildId, filename, data) {
        const serverPath = this.ensureServer(guildId);
        const filePath = path.join(serverPath, filename);

        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        } catch (error) {
            console.error(`Error saving ${filename}:`, error);
        }
    }

    deleteFile(guildId, filename) {
        const serverPath = this.getServerPath(guildId);
        const filePath = path.join(serverPath, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    listServers() {
        if (!fs.existsSync(this.dataFolder)) return [];

        return fs.readdirSync(this.dataFolder)
            .filter(item => {
                const itemPath = path.join(this.dataFolder, item);
                return fs.statSync(itemPath).isDirectory() && /^\d+$/.test(item);
            })
            .map(id => parseInt(id));
    }

    getServerFiles(guildId) {
        const serverPath = this.getServerPath(guildId);
        if (!fs.existsSync(serverPath)) return [];

        return fs.readdirSync(serverPath).filter(f => f.endsWith('.json'));
    }

    // ============ ECONOMY DATA ============
    getEconomy(guildId) {
        return this.loadFile(guildId, 'economy.json');
    }

    saveEconomy(guildId, data) {
        this.saveFile(guildId, 'economy.json', data);
    }

    getUserBalance(guildId, userId) {
        const economy = this.getEconomy(guildId);
        return economy[userId.toString()] || 0;
    }

    setUserBalance(guildId, userId, amount) {
        const economy = this.getEconomy(guildId);
        economy[userId.toString()] = amount;
        this.saveEconomy(guildId, economy);
    }

    addUserBalance(guildId, userId, amount) {
        const current = this.getUserBalance(guildId, userId);
        this.setUserBalance(guildId, userId, current + amount);
    }

    // ============ GIVEAWAY DATA ============
    getGiveawayData(guildId) {
        return this.loadFile(guildId, 'giveaway_data.json');
    }

    saveGiveawayData(guildId, data) {
        this.saveFile(guildId, 'giveaway_data.json', data);
    }

    // ============ MESSAGE STATS ============
    incrementMessageCount(guildId, userId) {
        const data = this.loadFile(guildId, 'giveaway_data.json');

        if (!data.user_stats) data.user_stats = {};

        const userIdStr = userId.toString();
        const today = new Date().toISOString().split('T')[0];

        if (!data.user_stats[userIdStr]) {
            data.user_stats[userIdStr] = {
                total_messages: 0,
                daily_messages: 0,
                last_message_date: today
            };
        }

        const userStats = data.user_stats[userIdStr];

        // Reset daily if new day
        if (userStats.last_message_date !== today) {
            userStats.daily_messages = 0;
            userStats.last_message_date = today;
        }

        // Increment counts
        userStats.total_messages += 1;
        userStats.daily_messages += 1;

        data.user_stats[userIdStr] = userStats;
        this.saveFile(guildId, 'giveaway_data.json', data);
    }

    getUserMessageStats(guildId, userId) {
        const data = this.loadFile(guildId, 'giveaway_data.json');
        const userStats = data.user_stats?.[userId.toString()] || {
            total_messages: 0,
            daily_messages: 0
        };
        return {
            total: userStats.total_messages || 0,
            daily: userStats.daily_messages || 0
        };
    }

    // ============ COMMAND STATES ============
    getCommandStates(guildId) {
        return this.loadFile(guildId, 'command_states.json');
    }

    saveCommandStates(guildId, data) {
        this.saveFile(guildId, 'command_states.json', data);
    }

    isCommandEnabled(guildId, commandName) {
        const states = this.getCommandStates(guildId);
        return states[commandName] !== false; // Default: enabled
    }

    setCommandState(guildId, commandName, enabled) {
        const states = this.getCommandStates(guildId);
        states[commandName] = enabled;
        this.saveCommandStates(guildId, states);
    }

    // ============ SERVER CONFIG ============
    getConfig(guildId) {
        return this.loadFile(guildId, 'config.json');
    }

    saveConfig(guildId, config) {
        this.saveFile(guildId, 'config.json', config);
    }
}

console.log('✅ Data manager loaded');

module.exports = DataManager;
