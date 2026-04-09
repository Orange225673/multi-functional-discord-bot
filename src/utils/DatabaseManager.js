///////////////////////////////////////////////////////////////////////
//                    DATABASE MANAGER (UPDATED WITH GEMS & XP)      //
///////////////////////////////////////////////////////////////////////

const db = require('./database');

class DatabaseManager {
    // ============ SERVER CONFIGURATION ============

    getServerConfig(serverId) {
        const stmt = db.prepare('SELECT config FROM servers WHERE server_id = ?');
        const row = stmt.get(serverId);

        if (!row) {
            // Create default config
            const defaultConfig = {
                prefix: '%',
                xp_enabled: true,
                xp_multiplier: 1.0,
                created_at: Date.now()
            };
            this.saveServerConfig(serverId, defaultConfig);
            return defaultConfig;
        }

        return JSON.parse(row.config);
    }

    saveServerConfig(serverId, config) {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO servers (server_id, config, created_at)
            VALUES (?, ?, ?)
        `);
        stmt.run(serverId, JSON.stringify(config), Date.now());
    }

    getDashboardToken(serverId) {
        const stmt = db.prepare('SELECT dashboard_token FROM servers WHERE server_id = ?');
        const row = stmt.get(serverId);
        return row ? row.dashboard_token : null;
    }

    setDashboardToken(serverId, token) {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO servers (server_id, dashboard_token, created_at)
            VALUES (?, ?, ?)
        `);
        stmt.run(serverId, token, Date.now());
    }

    // ============ GET DAILY CLAIM COOLDOWN ===
    getDailyCooldown(serverId, userId) {
        const stmt = db.prepare('SELECT last_daily FROM economy WHERE server_id = ? AND user_id = ?');
        const row = stmt.get(serverId, userId);
        return row ? row.last_daily : 0;
    }

    setDailyCooldown(serverId, userId, timestamp) {
        const stmt = db.prepare(`
        INSERT INTO economy (server_id, user_id, last_daily)
        VALUES (?, ?, ?)
        ON CONFLICT(server_id, user_id) DO UPDATE SET last_daily = ?
    `);
        stmt.run(serverId, userId, timestamp, timestamp);
    }

    getDailyStreak(serverId, userId) {
        const stmt = db.prepare('SELECT daily_streak FROM economy WHERE server_id = ? AND user_id = ?');
        const row = stmt.get(serverId, userId);
        return row ? row.daily_streak : 0;
    }

    updateDailyStreak(serverId, userId, streak) {
        const stmt = db.prepare(`
            INSERT INTO economy (server_id, user_id, daily_streak)
            VALUES (?, ?, ?)
            ON CONFLICT(server_id, user_id) DO UPDATE SET daily_streak = ?
        `);
        stmt.run(serverId, userId, streak, streak);
    }

    // ============ ECONOMY SYSTEM ============

    getEconomy(serverId) {
        const stmt = db.prepare('SELECT user_id, balance FROM economy WHERE server_id = ?');
        const rows = stmt.all(serverId);

        const economy = {};
        for (const row of rows) {
            economy[row.user_id] = row.balance;
        }
        return economy;
    }

    getBalance(serverId, userId) {
        const stmt = db.prepare('SELECT balance FROM economy WHERE server_id = ? AND user_id = ?');
        const row = stmt.get(serverId, userId);
        return row ? row.balance : 0;
    }

    setBalance(serverId, userId, amount) {
        const stmt = db.prepare(`
        INSERT INTO economy (server_id, user_id, balance)
        VALUES (?, ?, ?)
        ON CONFLICT(server_id, user_id) DO UPDATE SET balance = ?
    `);
        stmt.run(serverId, userId, amount, amount);
    }

    addUserBalance(serverId, userId, amount) {
        try {
            const currentBalance = this.getBalance(serverId, userId);
            const newBalance = currentBalance + amount;
            this.setBalance(serverId, userId, newBalance);
        } catch (error) {
            console.error('❌ Error in addUserBalance:', error);
            throw error;
        }
    }

    removeBalance(serverId, userId, amount) {
        const currentBalance = this.getBalance(serverId, userId);
        this.setBalance(serverId, userId, Math.max(0, currentBalance - amount));
    }

    getTopBalances(serverId, limit = 10) {
        const stmt = db.prepare(`
        SELECT user_id, balance FROM economy 
        WHERE server_id = ? AND balance > 0
        ORDER BY balance DESC 
        LIMIT ?
    `);
        return stmt.all(serverId, limit);
    }

    getGlobalTopBalances(limit = 10) {
        const stmt = db.prepare(`
        SELECT user_id, SUM(balance) as total_balance 
        FROM economy 
        WHERE balance > 0
        GROUP BY user_id 
        ORDER BY total_balance DESC 
        LIMIT ?
    `);
        return stmt.all(limit);
    }

    // ============ GEMS SYSTEM (NEW!) ============

    getUserGems(serverId, userId) {
        const stmt = db.prepare('SELECT gems FROM economy WHERE server_id = ? AND user_id = ?');
        const row = stmt.get(serverId, userId);
        return row ? (row.gems || 0) : 0;
    }

    addGems(serverId, userId, amount) {
        const stmt = db.prepare(`
            INSERT INTO economy (server_id, user_id, gems)
            VALUES (?, ?, ?)
            ON CONFLICT(server_id, user_id)
            DO UPDATE SET gems = gems + ?
        `);
        stmt.run(serverId, userId, amount, amount);
    }

    removeGems(serverId, userId, amount) {
        const current = this.getUserGems(serverId, userId);
        if (current >= amount) {
            const stmt = db.prepare(`
                UPDATE economy 
                SET gems = gems - ? 
                WHERE server_id = ? AND user_id = ?
            `);
            stmt.run(amount, serverId, userId);
            return true;
        }
        return false;
    }

    setGems(serverId, userId, amount) {
        const stmt = db.prepare(`
            INSERT INTO economy (server_id, user_id, gems)
            VALUES (?, ?, ?)
            ON CONFLICT(server_id, user_id)
            DO UPDATE SET gems = ?
        `);
        stmt.run(serverId, userId, amount, amount);
    }

    // ============ XP/LEVEL SYSTEM (NEW!) ============

    getUserXP(serverId, userId) {
        const stmt = db.prepare('SELECT * FROM user_xp WHERE server_id = ? AND user_id = ?');
        const row = stmt.get(serverId, userId);

        if (!row) {
            return {
                xp: 0,
                level: 0,
                total_xp: 0,
                profile_color: '#7289DA',
                last_xp_gain: 0
            };
        }

        return {
            xp: row.xp,
            level: row.level,
            total_xp: row.total_xp,
            profile_color: row.profile_color,
            last_xp_gain: row.last_xp_gain
        };
    }

    addXP(serverId, userId, xpAmount) {
        const current = this.getUserXP(serverId, userId);
        const newXP = current.xp + xpAmount;
        const newTotalXP = current.total_xp + xpAmount;

        // Calculate level up
        let level = current.level;
        let xpForNextLevel = this.getXPForLevel(level + 1);
        let leveledUp = false;

        let remainingXP = newXP;

        while (remainingXP >= xpForNextLevel) {
            remainingXP -= xpForNextLevel;
            level++;
            leveledUp = true;
            xpForNextLevel = this.getXPForLevel(level + 1);
        }

        // Update database
        const stmt = db.prepare(`
            INSERT INTO user_xp (server_id, user_id, xp, level, total_xp, last_xp_gain)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(server_id, user_id)
            DO UPDATE SET 
                xp = ?,
                level = ?,
                total_xp = ?,
                last_xp_gain = ?
        `);

        const now = Date.now();
        stmt.run(
            serverId, userId, remainingXP, level, newTotalXP, now,
            remainingXP, level, newTotalXP, now
        );

        if (leveledUp) {
            return {
                leveledUp: true,
                oldLevel: current.level,
                newLevel: level,
                xp: remainingXP,
                xpForNext: this.getXPForLevel(level + 1)
            };
        }

        return {
            leveledUp: false,
            level: level,
            xp: remainingXP,
            xpForNext: this.getXPForLevel(level + 1)
        };
    }

    getXPForLevel(level) {
        // Formula: 100 * level^1.5
        return Math.floor(100 * Math.pow(level, 1.5));
    }

    setProfileColor(serverId, userId, color) {
        const stmt = db.prepare(`
            INSERT INTO user_xp (server_id, user_id, profile_color)
            VALUES (?, ?, ?)
            ON CONFLICT(server_id, user_id)
            DO UPDATE SET profile_color = ?
        `);
        stmt.run(serverId, userId, color, color);
    }

    getXPLeaderboard(serverId, limit = 10) {
        const stmt = db.prepare(`
            SELECT user_id, level, total_xp 
            FROM user_xp 
            WHERE server_id = ? AND level > 0
            ORDER BY level DESC, total_xp DESC
            LIMIT ?
        `);
        return stmt.all(serverId, limit);
    }

    getGlobalXPLeaderboard(limit = 10) {
        const stmt = db.prepare(`
            SELECT user_id, SUM(total_xp) as global_xp, MAX(level) as max_level
            FROM user_xp
            WHERE level > 0
            GROUP BY user_id
            ORDER BY max_level DESC, global_xp DESC
            LIMIT ?
        `);
        return stmt.all(limit);
    }

    getServerRank(serverId, userId) {
        const userXP = this.getUserXP(serverId, userId);

        const stmt = db.prepare(`
            SELECT COUNT(*) + 1 as rank
            FROM user_xp
            WHERE server_id = ? AND (
                level > ? OR 
                (level = ? AND total_xp > ?)
            )
        `);

        const result = stmt.get(serverId, userXP.level, userXP.level, userXP.total_xp);
        return result ? result.rank : 1;
    }

    // ============ GEM SHOP PURCHASES ============

    purchaseItem(serverId, userId, itemId, expiresAt = null, data = null) {
        const stmt = db.prepare(`
            INSERT INTO gem_purchases (server_id, user_id, item_id, purchase_time, expires_at, data)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(serverId, userId, itemId, Date.now(), expiresAt, data ? JSON.stringify(data) : null);
    }

    hasActiveBoost(serverId, userId, boostType) {
        const stmt = db.prepare(`
            SELECT * FROM gem_purchases 
            WHERE server_id = ? AND user_id = ? AND item_id = ? 
            AND (expires_at IS NULL OR expires_at > ?)
        `);
        const row = stmt.get(serverId, userId, boostType, Date.now());
        return row !== undefined;
    }

    getActivePurchases(serverId, userId) {
        const stmt = db.prepare(`
            SELECT * FROM gem_purchases 
            WHERE server_id = ? AND user_id = ?
            AND (expires_at IS NULL OR expires_at > ?)
            ORDER BY purchase_time DESC
        `);
        return stmt.all(serverId, userId, Date.now());
    }

    cleanExpiredBoosts() {
        const stmt = db.prepare(`
            DELETE FROM gem_purchases 
            WHERE expires_at IS NOT NULL AND expires_at < ?
        `);
        stmt.run(Date.now());
    }

    // ============ GIVEAWAY SYSTEM ============

    getAllGiveaways(serverId) {
        const stmt = db.prepare('SELECT * FROM giveaways WHERE server_id = ?');
        const rows = stmt.all(serverId);

        return rows.map(row => ({
            ...row,
            participants: JSON.parse(row.participants)
        }));
    }

    getActiveGiveaways(serverId) {
        const stmt = db.prepare('SELECT * FROM giveaways WHERE server_id = ? AND active = 1');
        const rows = stmt.all(serverId);

        return rows.map(row => ({
            ...row,
            participants: JSON.parse(row.participants)
        }));
    }

    getGiveaway(messageId) {
        const stmt = db.prepare('SELECT * FROM giveaways WHERE message_id = ?');
        const row = stmt.get(messageId);

        if (!row) return null;

        return {
            ...row,
            participants: JSON.parse(row.participants)
        };
    }

    createGiveaway(serverId, messageId, channelId, prize, winners, endTime, hostId, claimTime = 3600, requirements = {}, extraEntries = {}) {
        const stmt = db.prepare(`
            INSERT INTO giveaways (server_id, message_id, channel_id, prize, winners, end_time, host_id, claim_time, requirements, extra_entries, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(serverId, messageId, channelId, prize, winners, endTime, hostId, claimTime, JSON.stringify(requirements), JSON.stringify(extraEntries), Date.now());
    }

    updateGiveaway(messageId, updates) {
        const fields = [];
        const values = [];

        if (updates.winners_list !== undefined) {
            fields.push('winners_list = ?');
            values.push(JSON.stringify(updates.winners_list));
        }
        if (updates.claimed !== undefined) {
            fields.push('claimed = ?');
            values.push(updates.claimed ? 1 : 0);
        }
        if (updates.claim_deadline !== undefined) {
            fields.push('claim_deadline = ?');
            values.push(updates.claim_deadline);
        }
        if (updates.reroll_enabled !== undefined) {
            fields.push('reroll_enabled = ?');
            values.push(updates.reroll_enabled ? 1 : 0);
        }
        if (updates.active !== undefined) {
            fields.push('active = ?');
            values.push(updates.active ? 1 : 0);
        }

        if (fields.length === 0) return;

        values.push(messageId);
        const stmt = db.prepare(`UPDATE giveaways SET ${fields.join(', ')} WHERE message_id = ?`);
        stmt.run(...values);
    }

    addGiveawayParticipant(messageId, userId) {
        const giveaway = this.getGiveaway(messageId);
        if (!giveaway) return;

        const participants = giveaway.participants;
        if (!participants.includes(userId)) {
            participants.push(userId);

            const stmt = db.prepare('UPDATE giveaways SET participants = ? WHERE message_id = ?');
            stmt.run(JSON.stringify(participants), messageId);
        }
    }

    removeGiveawayParticipant(messageId, userId) {
        const giveaway = this.getGiveaway(messageId);
        if (!giveaway) return;

        const participants = giveaway.participants.filter(id => id !== userId);

        const stmt = db.prepare('UPDATE giveaways SET participants = ? WHERE message_id = ?');
        stmt.run(JSON.stringify(participants), messageId);
    }

    endGiveaway(messageId) {
        const stmt = db.prepare('UPDATE giveaways SET active = 0 WHERE message_id = ?');
        stmt.run(messageId);
    }

    deleteGiveaway(messageId) {
        const stmt = db.prepare('DELETE FROM giveaways WHERE message_id = ?');
        stmt.run(messageId);
    }

    // ============ COMMAND STATES ============

    getCommandStates(serverId) {
        const stmt = db.prepare('SELECT command_name, enabled FROM command_states WHERE server_id = ?');
        const rows = stmt.all(serverId);

        const states = {};
        for (const row of rows) {
            states[row.command_name] = row.enabled === 1;
        }
        return states;
    }

    getCommandState(serverId, commandName) {
        const stmt = db.prepare('SELECT enabled FROM command_states WHERE server_id = ? AND command_name = ?');
        const row = stmt.get(serverId, commandName);
        return row ? row.enabled === 1 : true; // Default enabled
    }

    setCommandState(serverId, commandName, enabled) {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO command_states (server_id, command_name, enabled)
            VALUES (?, ?, ?)
        `);
        stmt.run(serverId, commandName, enabled ? 1 : 0);
    }

    // ============ CHESS SYSTEM ============

    getChessElo(serverId, userId) {
        const stmt = db.prepare('SELECT * FROM chess_elo WHERE server_id = ? AND user_id = ?');
        const row = stmt.get(serverId, userId);

        if (!row) {
            return { elo: 1000, wins: 0, losses: 0, draws: 0 };
        }

        return {
            elo: row.elo,
            wins: row.wins,
            losses: row.losses,
            draws: row.draws
        };
    }

    setChessElo(serverId, userId, elo, wins, losses, draws) {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO chess_elo (server_id, user_id, elo, wins, losses, draws)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(serverId, userId, elo, wins, losses, draws);
    }

    getChessColor(serverId, userId) {
        const stmt = db.prepare('SELECT preferred_color FROM chess_colors WHERE server_id = ? AND user_id = ?');
        const row = stmt.get(serverId, userId);
        return row ? row.preferred_color : 'random';
    }

    setChessColor(serverId, userId, color) {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO chess_colors (server_id, user_id, preferred_color)
            VALUES (?, ?, ?)
        `);
        stmt.run(serverId, userId, color);
    }

    getGlobalChessElo(userId) {
        const stmt = db.prepare('SELECT * FROM global_chess_elo WHERE user_id = ?');
        const row = stmt.get(userId);

        if (!row) {
            return { elo: 1000, wins: 0, losses: 0, draws: 0 };
        }

        return {
            elo: row.elo,
            wins: row.wins,
            losses: row.losses,
            draws: row.draws
        };
    }

    setGlobalChessElo(userId, elo, wins, losses, draws) {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO global_chess_elo (user_id, elo, wins, losses, draws)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(userId, elo, wins, losses, draws);
    }

    // ============ REMINDERS ============

    createReminder(serverId, channelId, userId, message, remindAt) {
        const stmt = db.prepare(`
            INSERT INTO reminders (server_id, channel_id, user_id, message, remind_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(serverId, channelId, userId, message, remindAt, Date.now());
    }

    getActiveReminders() {
        const stmt = db.prepare('SELECT * FROM reminders WHERE active = 1 AND remind_at <= ?');
        return stmt.all(Date.now());
    }

    getUserReminders(serverId, userId) {
        const stmt = db.prepare('SELECT * FROM reminders WHERE server_id = ? AND user_id = ? AND active = 1');
        return stmt.all(serverId, userId);
    }

    completeReminder(id) {
        const stmt = db.prepare('UPDATE reminders SET active = 0 WHERE id = ?');
        stmt.run(id);
    }

    deleteReminder(id) {
        const stmt = db.prepare('DELETE FROM reminders WHERE id = ?');
        stmt.run(id);
    }

    // ============ POLLS ============

    createPoll(serverId, messageId, channelId, question, options, createdBy, endsAt) {
        const stmt = db.prepare(`
            INSERT INTO polls (server_id, message_id, channel_id, question, options, created_by, created_at, ends_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(serverId, messageId, channelId, question, JSON.stringify(options), createdBy, Date.now(), endsAt);
    }

    getPoll(messageId) {
        const stmt = db.prepare('SELECT * FROM polls WHERE message_id = ?');
        const row = stmt.get(messageId);

        if (!row) return null;

        return {
            ...row,
            options: JSON.parse(row.options),
            votes: JSON.parse(row.votes)
        };
    }

    addPollVote(messageId, userId, option) {
        const poll = this.getPoll(messageId);
        if (!poll) return;

        const votes = poll.votes;
        votes[userId] = option;

        const stmt = db.prepare('UPDATE polls SET votes = ? WHERE message_id = ?');
        stmt.run(JSON.stringify(votes), messageId);
    }

    endPoll(messageId) {
        const stmt = db.prepare('UPDATE polls SET active = 0 WHERE message_id = ?');
        stmt.run(messageId);
    }

    // ============ MINECRAFT BOTS ============

    createMinecraftBot(serverId, userId, botName, botPassword, serverIp, serverPort, version) {
        const stmt = db.prepare(`
            INSERT INTO minecraft_bots (server_id, user_id, bot_name, bot_password, server_ip, server_port, version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(serverId, userId, botName, botPassword, serverIp, serverPort, version, Date.now());
        return result.lastInsertRowid;
    }

    getMinecraftBot(botId) {
        const stmt = db.prepare('SELECT * FROM minecraft_bots WHERE id = ?');
        return stmt.get(botId);
    }

    getUserMinecraftBots(serverId, userId) {
        const stmt = db.prepare('SELECT * FROM minecraft_bots WHERE server_id = ? AND user_id = ?');
        return stmt.all(serverId, userId);
    }

    updateMinecraftBotStatus(botId, status) {
        const stmt = db.prepare('UPDATE minecraft_bots SET status = ? WHERE id = ?');
        stmt.run(status, botId);
    }

    deleteMinecraftBot(botId) {
        const stmt = db.prepare('DELETE FROM minecraft_bots WHERE id = ?');
        stmt.run(botId);
    }

    // ============ PERMISSIONS ============

    addWhitelistedRole(serverId, roleId) {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO permission_whitelist (server_id, role_id)
            VALUES (?, ?)
        `);
        stmt.run(serverId, roleId);
    }

    removeWhitelistedRole(serverId, roleId) {
        const stmt = db.prepare('DELETE FROM permission_whitelist WHERE server_id = ? AND role_id = ?');
        stmt.run(serverId, roleId);
    }

    getWhitelistedRoles(serverId) {
        const stmt = db.prepare('SELECT role_id FROM permission_whitelist WHERE server_id = ?');
        const rows = stmt.all(serverId);
        return rows.map(row => row.role_id);
    }

    isRoleWhitelisted(serverId, roleId) {
        const stmt = db.prepare('SELECT 1 FROM permission_whitelist WHERE server_id = ? AND role_id = ?');
        return stmt.get(serverId, roleId) !== undefined;
    }

    // ============ USER STATS ============

    getUserStats(serverId, userId) {
        const stmt = db.prepare('SELECT * FROM user_stats WHERE server_id = ? AND user_id = ?');
        const row = stmt.get(serverId, userId);

        if (!row) {
            return { total_messages: 0, daily_messages: 0, math_points: 0 };
        }

        return {
            total_messages: row.total_messages,
            daily_messages: row.daily_messages,
            last_message: row.last_message,
            math_points: row.math_points || 0
        };
    }

    incrementMessageCount(serverId, userId) {
        const stmt = db.prepare(`
            INSERT INTO user_stats (server_id, user_id, total_messages, daily_messages, last_message)
            VALUES (?, ?, 1, 1, ?)
            ON CONFLICT(server_id, user_id) DO UPDATE SET
                total_messages = total_messages + 1,
                daily_messages = daily_messages + 1,
                last_message = ?
        `);
        const now = Date.now();
        stmt.run(serverId, userId, now, now);
    }

    getTopMessageSenders(serverId, limit = 10) {
        const stmt = db.prepare(`
            SELECT user_id, total_messages FROM user_stats 
            WHERE server_id = ? 
            ORDER BY total_messages DESC 
            LIMIT ?
        `);
        return stmt.all(serverId, limit);
    }

    getTopDailyMessageSenders(serverId, limit = 10) {
        const stmt = db.prepare(`
            SELECT user_id, daily_messages FROM user_stats 
            WHERE server_id = ? AND daily_messages > 0
            ORDER BY daily_messages DESC 
            LIMIT ?
        `);
        return stmt.all(serverId, limit);
    }

    getGlobalTopMessageSenders(limit = 10) {
        const stmt = db.prepare(`
        SELECT
            user_id,
            SUM(total_messages) as total_messages
        FROM user_stats
        WHERE total_messages > 0
        GROUP BY user_id
        ORDER BY total_messages DESC
        LIMIT ?
    `);
        return stmt.all(limit);
    }

    // ============ MATH SYSTEM ============

    addMathPoints(serverId, userId, points) {
        const stmt = db.prepare(`
            INSERT INTO user_stats (server_id, user_id, math_points)
            VALUES (?, ?, ?)
            ON CONFLICT(server_id, user_id) DO UPDATE SET
                math_points = math_points + ?
        `);
        stmt.run(serverId, userId, points, points);
    }

    getTopMathPlayers(serverId, limit = 10) {
        const stmt = db.prepare(`
            SELECT user_id, math_points FROM user_stats 
            WHERE server_id = ? AND math_points > 0
            ORDER BY math_points DESC 
            LIMIT ?
        `);
        return stmt.all(serverId, limit);
    }

    getGlobalTopMathPlayers(limit = 10) {
        const stmt = db.prepare(`
        SELECT 
            user_id, 
            SUM(math_points) as total_math_points,
            COUNT(DISTINCT server_id) as server_count
        FROM user_stats 
        WHERE math_points > 0
        GROUP BY user_id
        ORDER BY total_math_points DESC 
        LIMIT ?
    `);
        return stmt.all(limit);
    }

    // ============ UTILITY ============

    // Ensure server exists (for compatibility with old DataManager)
    ensureServer(serverId) {
        // Check if server exists, if not create default config
        const config = this.getServerConfig(serverId);
        return config; // getServerConfig already creates if not exists
    }

    // Check if command is enabled (for compatibility)
    isCommandEnabled(serverId, commandName) {
        return this.getCommandState(serverId, commandName);
    }

    // Load file (for compatibility - converts to database calls)
    loadFile(serverId, filename) {
        if (filename === 'server_config.json') {
            return this.getServerConfig(serverId);
        }
        if (filename === 'economy.json') {
            return this.getEconomy(serverId);
        }
        if (filename === 'command_states.json') {
            return this.getCommandStates(serverId);
        }
        if (filename === 'giveaway_data.json') {
            return { giveaways: {} }; // Return empty for now
        }
        return {};
    }

    // Save file (for compatibility - converts to database calls)
    saveFile(serverId, filename, data) {
        if (filename === 'server_config.json') {
            this.saveServerConfig(serverId, data);
        }
        if (filename === 'economy.json') {
            // Economy is saved per-user, not bulk
            for (const [userId, balance] of Object.entries(data)) {
                this.setBalance(serverId, userId, balance);
            }
        }
        if (filename === 'command_states.json') {
            for (const [command, enabled] of Object.entries(data)) {
                this.setCommandState(serverId, command, enabled);
            }
        }
    }

    // ============ USER STATS / MESSAGE TRACKING ============

    recordUserMessage(serverId, userId) {
        const today = new Date().toISOString().split('T')[0];

        const stmt = db.prepare(`
            INSERT INTO user_stats (server_id, user_id, total_messages, daily_messages, last_message)
            VALUES (?, ?, 1, 1, ?)
            ON CONFLICT(server_id, user_id) DO UPDATE SET
                total_messages = total_messages + 1,
                daily_messages = CASE 
                    WHEN DATE(datetime(last_message / 1000, 'unixepoch')) = DATE('now') 
                    THEN daily_messages + 1 
                    ELSE 1 
                END,
                last_message = ?
        `);

        const now = Date.now();
        stmt.run(serverId, userId, now, now);
    }

    getServerUserStats(serverId, limit = 10) {
        const stmt = db.prepare(`
            SELECT user_id, total_messages, daily_messages, last_message
            FROM user_stats
            WHERE server_id = ?
            ORDER BY total_messages DESC
            LIMIT ?
        `);
        return stmt.all(serverId, limit);
    }

    resetDailyMessages(serverId) {
        const stmt = db.prepare('UPDATE user_stats SET daily_messages = 0 WHERE server_id = ?');
        stmt.run(serverId);
    }

    // Backup database to JSON (for migration back if needed)
    backupToJSON() {
        const backup = {
            servers: db.prepare('SELECT * FROM servers').all(),
            economy: db.prepare('SELECT * FROM economy').all(),
            giveaways: db.prepare('SELECT * FROM giveaways').all(),
            command_states: db.prepare('SELECT * FROM command_states').all(),
            chess_elo: db.prepare('SELECT * FROM chess_elo').all(),
            reminders: db.prepare('SELECT * FROM reminders').all(),
            polls: db.prepare('SELECT * FROM polls').all()
        };
        return backup;
    }

    // ============ SERVER ANALYTICS (JOIN/LEAVE) ============

    updateAnalytics(serverId, type, totalCount) {
        const today = new Date().toISOString().split('T')[0]; // Định dạng YYYY-MM-DD

        // Tạo bản ghi mới nếu ngày hôm nay chưa có
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO server_analytics (server_id, date, total_at_day) 
            VALUES (?, ?, ?)
        `);
        insertStmt.run(serverId, today, totalCount);

        // Cập nhật số liệu dựa trên loại sự kiện (join hoặc leave)
        if (type === 'join') {
            const updateJoin = db.prepare(`
                UPDATE server_analytics 
                SET joined = joined + 1, total_at_day = ? 
                WHERE server_id = ? AND date = ?
            `);
            updateJoin.run(totalCount, serverId, today);
        } else if (type === 'leave') {
            const updateLeave = db.prepare(`
                UPDATE server_analytics 
                SET left = left + 1, total_at_day = ? 
                WHERE server_id = ? AND date = ?
            `);
            updateLeave.run(totalCount, serverId, today);
        }
    }

    getRecentAnalytics(serverId, days = 7) {
        const stmt = db.prepare(`
            SELECT * FROM server_analytics 
            WHERE server_id = ? 
            ORDER BY date DESC LIMIT ?
        `);
        return stmt.all(serverId, days).reverse();
    }

    // ============ AFK SYSTEM ============

    setAFK(serverId, userId, reason, timestamp) {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO user_afk (server_id, user_id, reason, timestamp)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(serverId, userId, reason, timestamp);
    }

    removeAFK(serverId, userId) {
        const stmt = db.prepare('DELETE FROM user_afk WHERE server_id = ? AND user_id = ?');
        stmt.run(serverId, userId);
    }

    getAllAFK() {
        // Lấy tất cả để load vào Map khi khởi động bot
        return db.prepare('SELECT * FROM user_afk').all();
    }

    // ============ GIVEAWAY CORE ============
    getMultipliers(guildId) {
        return db.prepare('SELECT role_id, multiplier FROM giveaway_multipliers WHERE guild_id = ?').all(guildId);
    }

    addParticipant(messageId, userId) {
        const row = db.prepare('SELECT participants FROM giveaways WHERE message_id = ?').get(messageId);
        if (!row) return false;
        let participants = JSON.parse(row.participants);
        if (participants.includes(userId)) return false;
        participants.push(userId);
        db.prepare('UPDATE giveaways SET participants = ? WHERE message_id = ?').run(JSON.stringify(participants), messageId);
        return true;
    }

}

console.log('✅ Database manager loaded (WITH GEMS & XP SYSTEM)');

module.exports = DatabaseManager;