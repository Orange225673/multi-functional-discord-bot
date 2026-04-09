// Mineflayer Bot for Python Bridge
// Supports Minecraft 1.21.1 and all versions

const mineflayer = require('mineflayer');
const fs = require('fs');

// Read config from command line argument
const configFile = process.argv[2];

if (!configFile) {
    console.error('Usage: node bot.js <config.json>');
    process.exit(1);
}
// Load config
let config;
try {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
} catch (err) {
    console.error(`Failed to load config: ${err.message}`);
    process.exit(1);
}

console.log(`[${config.username}] Starting bot...`);
console.log(`[${config.username}] Server: ${config.host}:${config.port}`);
console.log(`[${config.username}] Version: ${config.version}`);

// Create bot
const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    version: config.version,
    auth: 'offline',
    hideErrors: false,
    checkTimeoutInterval: 60000, // Check for timeout every 60 seconds instead of 30
    keepAlive: true
});

let isRegistered = config.registered || false;
let isLoggedIn = false;

// Bot spawned
bot.once('spawn', () => {
    console.log(`[${config.username}] ✅ Connected and spawned!`);
    // Send login commands after spawn
    setTimeout(() => {
        if (!isRegistered) {
            bot.chat(`/register ${config.password} ${config.password}`);
            console.log(`[${config.username}] 📝 Sent /register command`);
            isRegistered = true;
            
            setTimeout(() => {
                bot.chat(`/login ${config.password}`);
                console.log(`[${config.username}] 🔐 Sent /login command`);
                isLoggedIn = true;
            }, 1000);
        } else {
            bot.chat(`/login ${config.password}`);
            console.log(`[${config.username}] 🔐 Sent /login command`);
            isLoggedIn = true;
        }
    }, 2000);
});

// Chat messages
bot.on('message', (message) => {
    const msg = message.toString().toLowerCase();
    
    // Detect login prompts
    if ((msg.includes('/login') || msg.includes('log in')) && !isLoggedIn) {
        setTimeout(() => {
            bot.chat(`/login ${config.password}`);
            console.log(`[${config.username}] 🔐 Auto-login triggered by prompt`);
            isLoggedIn = true;
        }, 1000);
    }
    
    // Detect register prompts
    if ((msg.includes('/register') || msg.includes('register')) && !isRegistered) {
        setTimeout(() => {
            bot.chat(`/register ${config.password} ${config.password}`);
            console.log(`[${config.username}] 📝 Auto-register triggered by prompt`);
            isRegistered = true;
        }, 1000);
    }
    
    // Detect successful login
    if (msg.includes('logged in') || msg.includes('successfully') || msg.includes('welcome')) {
        console.log(`[${config.username}] ✅ Login confirmed!`);
        isLoggedIn = true;
    }
});

// Anti-AFK (random movements every 10 seconds)
setInterval(() => {
    if (bot.entity) {
        const movements = ['forward', 'back', 'left', 'right', 'jump'];
        const move = movements[Math.floor(Math.random() * movements.length)];
        
        bot.setControlState(move, true);
        setTimeout(() => {
            bot.clearControlStates();
        }, 500);
    }
}, 10000);

// Error handling
bot.on('error', (err) => {
    console.error(`[${config.username}] ❌ Error: ${err.message}`);
    // Don't exit on timeout errors, try to reconnect
    if (err.message.includes('timed out') || err.message.includes('timeout')) {
        console.log(`[${config.username}] ⏱️ Connection timeout, bot will attempt to reconnect...`);
        setTimeout(() => {
            console.log(`[${config.username}] 🔄 Reconnecting...`);
            process.exit(1); // Let PM2 or your process manager restart it
        }, 5000);
    }
});

bot.on('kicked', (reason) => {
    console.log(`[${config.username}] ⚠️ Kicked: ${reason}`);
    // Wait before exiting to allow for reconnection
    setTimeout(() => {
        process.exit(1);
    }, 5000);
});

bot.on('end', (reason) => {
    console.log(`[${config.username}] 🔌 Disconnected: ${reason || 'Unknown'}`);
    // Wait before exiting to allow for reconnection
    setTimeout(() => {
        process.exit(1);
    }, 5000);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log(`[${config.username}] 🛑 Stopping bot...`);
    bot.quit();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(`[${config.username}] 🛑 Stopping bot...`);
    bot.quit();
    process.exit(0);
});

console.log(`[${config.username}] 🤖 Bot is running...`);
