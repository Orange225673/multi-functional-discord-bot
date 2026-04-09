///////////////////////////////////////////////////////////////////////
//                         CONFIGURATION FILE                         //
///////////////////////////////////////////////////////////////////////

require('dotenv').config();

const config = {
    // Discord Configuration
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID || '',
    OWNER_ID: process.env.OWNER_ID || '972306366599397427',
    COMMAND_PREFIX: process.env.COMMAND_PREFIX || '%',

    // API Keys
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
    CAT_API_KEY: process.env.CAT_API_KEY || '',
};

// Bot Configuration
config.BOT_CONFIG = {
    MAX_BOTS: 3,
    ANTI_AFK_INTERVAL: 10000,
    RECONNECT_DELAY: 5000,
    COOLDOWN_RATE: 1,
    COOLDOWN_PER: 1,
};

// File Paths
config.DATA_FOLDER = 'data';
config.GIVEAWAY_DATA_FILE = 'giveaway_data.json';
config.ECONOMY_FILE = 'economy.json';
config.STATS_FILE = 'server_stats.json';
config.COMMAND_STATES_FILE = 'command_states.json';
config.SERVER_CONFIG_FILE = 'config.json';

// Spam Detection Config
config.SPAM_CONFIG = {
    THRESHOLD: 5,
    WINDOW: 3,
    WARNING_DURATION: 5,
    DELETE_SPAM: true,
    AUTO_MUTE: true,
    MUTE_DURATION: 30,
};

// Economy Config
config.ECONOMY_CONFIG = {
    MIN_BET: 10000,
    MAX_BET: 10000000000000000000000000000000,
    EARN_PER_MESSAGE_MIN: 1000,
    EARN_PER_MESSAGE_MAX: 100000,
    GAMBLING_OUTCOMES: {
        lose: { weight: 100, multiplier: -1 },
        win: { weight: 50, multiplier: 1 },
        big_win: { weight: 30, multiplier: 2 },
        very_high_win: { weight: 15, multiplier: 5 },
        jackpot_win: { weight: 4, multiplier: 10 },
        LEGENDARY: { weight: 1, multiplier: 100 },
    },
};

// Validation
if (!config.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN not set in .env file');
    process.exit(1);
}

if (!config.GOOGLE_API_KEY) {
    console.warn(`⚠️ GOOGLE_API_KEY not set (AI commands won't work)`);
}

console.log('✅ Configuration loaded successfully');

module.exports = config;
