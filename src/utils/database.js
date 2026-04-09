///////////////////////////////////////////////////////////////////////
//                    DATABASE INITIALIZATION (UPDATED)              //
///////////////////////////////////////////////////////////////////////

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../bot.db');
const db = new Database(dbPath);

// Enable Write-Ahead Logging for better performance
db.pragma('journal_mode = WAL');

console.log('📁 Database file:', dbPath);

// ============ CREATE TABLES ============

// Servers table

db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
        server_id TEXT PRIMARY KEY,
        config TEXT,
        dashboard_token TEXT,
        created_at INTEGER
    )
`);

// Economy table (UPDATED: added gems and daily_streak)
db.exec(`
    CREATE TABLE IF NOT EXISTS economy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        balance INTEGER DEFAULT 0,
        gems INTEGER DEFAULT 0,
        last_daily INTEGER DEFAULT 0,
        daily_streak INTEGER DEFAULT 0,
        UNIQUE(server_id, user_id)
    )
`);

// User XP table (NEW!)
db.exec(`
    CREATE TABLE IF NOT EXISTS user_xp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        profile_color TEXT DEFAULT '#7289DA',
        total_xp INTEGER DEFAULT 0,
        last_xp_gain INTEGER DEFAULT 0,
        UNIQUE(server_id, user_id)
    )
`);

// Gem purchases table (NEW!)
db.exec(`
    CREATE TABLE IF NOT EXISTS gem_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        purchase_time INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        expires_at INTEGER DEFAULT NULL,
        data TEXT DEFAULT NULL
    )
`);

// Giveaways table
db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        message_id TEXT NOT NULL UNIQUE,
        channel_id TEXT NOT NULL,
        prize TEXT NOT NULL,
        winners INTEGER DEFAULT 1,
        host_id TEXT NOT NULL,
        end_time INTEGER NOT NULL,
        claim_time INTEGER DEFAULT 3600,
        requirements TEXT DEFAULT '{}',
        extra_entries TEXT DEFAULT '{}',
        participants TEXT DEFAULT '[]',
        winners_list TEXT DEFAULT '[]',
        claimed INTEGER DEFAULT 0,
        claim_deadline INTEGER DEFAULT NULL,
        reroll_enabled INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
`);

// User stats table
db.exec(`
    CREATE TABLE IF NOT EXISTS user_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        total_messages INTEGER DEFAULT 0,
        daily_messages INTEGER DEFAULT 0,
        last_message INTEGER DEFAULT 0,
        math_points INTEGER DEFAULT 0,
        UNIQUE(server_id, user_id)
    )
`);

// Command states table
db.exec(`
    CREATE TABLE IF NOT EXISTS command_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        UNIQUE(server_id, command_name)
    )
`);

// Chess Elo table
db.exec(`
    CREATE TABLE IF NOT EXISTS chess_elo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        elo INTEGER DEFAULT 1000,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        UNIQUE(server_id, user_id)
    )
`);

// Chess colors table
db.exec(`
    CREATE TABLE IF NOT EXISTS chess_colors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        preferred_color TEXT DEFAULT 'random',
        UNIQUE(server_id, user_id)
    )
`);

// Global chess Elo table
db.exec(`
    CREATE TABLE IF NOT EXISTS global_chess_elo (
        user_id TEXT PRIMARY KEY,
        elo INTEGER DEFAULT 1000,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0
    )
`);

// Reminders table
db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        remind_at INTEGER NOT NULL,
        active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL
    )
`);

// Polls table
db.exec(`
    CREATE TABLE IF NOT EXISTS polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        message_id TEXT NOT NULL UNIQUE,
        channel_id TEXT NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        votes TEXT DEFAULT '{}',
        created_by TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        ends_at INTEGER
    )
`);

// Minecraft bots table
db.exec(`
    CREATE TABLE IF NOT EXISTS minecraft_bots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        bot_name TEXT NOT NULL,
        bot_password TEXT,
        server_ip TEXT NOT NULL,
        server_port INTEGER DEFAULT 25565,
        version TEXT DEFAULT '1.20.1',
        status TEXT DEFAULT 'offline',
        created_at INTEGER NOT NULL
    )
`);

// Permission whitelist table
db.exec(`
    CREATE TABLE IF NOT EXISTS permission_whitelist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        UNIQUE(server_id, role_id)
    )
`);

// Server Analytics Table (Join/Leave stats)
db.exec(`
    CREATE TABLE IF NOT EXISTS server_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        date TEXT NOT NULL,
        joined INTEGER DEFAULT 0,
        left INTEGER DEFAULT 0,
        total_at_day INTEGER DEFAULT 0,
        UNIQUE(server_id, date)
    )
`);

// AFK Table
db.exec(`
    CREATE TABLE IF NOT EXISTS user_afk (
        server_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reason TEXT,
        timestamp INTEGER,
        PRIMARY KEY (server_id, user_id)
    )
`);

// Lưu thông tin Giveaway
db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
        message_id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        prize TEXT NOT NULL,
        winner_count INTEGER DEFAULT 1,
        end_time INTEGER NOT NULL,
        host_id TEXT NOT NULL,
        requirements TEXT DEFAULT '{}',
        status TEXT DEFAULT 'active',
        participants TEXT DEFAULT '[]'
    )
`);

// Lưu Role Multipliers (Extra Entries)
db.exec(`
    CREATE TABLE IF NOT EXISTS giveaway_multipliers (
        guild_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        multiplier INTEGER DEFAULT 1,
        PRIMARY KEY (guild_id, role_id)
    )
`);


console.log('✅ Database tables initialized');

module.exports = db;