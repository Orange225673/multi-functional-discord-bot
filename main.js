///////////////////////////////////////////////////////////////////////
//                  INTERACTIVE DISCORD BOT LAUNCHER                  //
///////////////////////////////////////////////////////////////////////

const { spawn } = require('child_process');
const readline = require('readline');

console.clear();
console.log('='.repeat(70));
console.log('  MrFish Discord Bot - Interactive Control Panel');
console.log('='.repeat(70));
console.log('');

let botProcess = null;
let isRunning = false;

// Setup readline for keyboard input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>> '
});

// Show menu
function showMenu() {
    console.log('');
    console.log('='.repeat(70));
    console.log('  🎮 CONTROLS');
    console.log('='.repeat(70));
    console.log('  [H] + Enter → 🧹 Clear NPM cache');
    console.log('  [S] + Enter → 📺 Clear console output');
    console.log('  [R] + Enter → 🔄 Restart bot');
    console.log('  [V] + Enter →  ℹ  Show info');
    console.log('  [C] + Enter → 🛑 Stop bot');
    console.log('='.repeat(70));
    console.log('');
}

// Start the bot
function startBot() {
    if (isRunning) {
        console.log('⚠️  Bot is already running!');
        return;
    }

    console.log('🚀 Starting Discord bot...');
    console.log('');

    // Spawn bot process
    botProcess = spawn('node', ['src/index.js'], {
        stdio: ['inherit', 'inherit', 'inherit']
    });

    isRunning = true;

    botProcess.on('close', (code) => {
        isRunning = false;
        if (code !== 0) {
            console.log('');
            console.log(`❌ Bot exited with code ${code}`);
        } else {
            console.log('');
            console.log('✅ Bot stopped gracefully');
        }
        showMenu();
    });

    botProcess.on('error', (err) => {
        console.error('❌ Failed to start bot:', err);
        isRunning = false;
        showMenu();
    });
}

// Stop the bot
function stopBot() {
    if (!isRunning) {
        console.log('⚠️  Bot is not running!');
        return;
    }

    console.log('🛑 Stopping bot...');

    if (botProcess) {
        botProcess.kill('SIGTERM');

        // Force kill if not stopped in 5 seconds
        setTimeout(() => {
            if (isRunning) {
                console.log('⚠️  Forcing shutdown...');
                botProcess.kill('SIGKILL');
            }
        }, 5000);
    }
}

// Restart the bot
function restartBot() {
    console.log('🔄 Restarting bot...');

    if (isRunning) {
        stopBot();
        // Wait for bot to stop, then start again
        setTimeout(() => {
            startBot();
        }, 2000);
    } else {
        startBot();
    }
}

// Clear NPM cache
function clearCache() {
    console.log('🧹 Clearing NPM cache...');

    const { execSync } = require('child_process');

    try {
        execSync('npm cache clean --force', {
            encoding: 'utf-8',
            stdio: 'inherit'
        });
        console.log('✅ Cache cleared successfully!');
    } catch (err) {
        console.error('❌ Failed to clear cache:', err.message);
    }
}

// Clear console
function clearConsole() {
    console.clear();
    console.log('='.repeat(70));
    console.log('  MrFish Discord Bot - Interactive Control Panel');
    console.log('='.repeat(70));
    console.log('');
    console.log('📺 Console cleared!');
    showMenu();
}

/**
 * The function `showInfo` provides detailed information about the bot, including status, Node.js
 * version, OS platform, memory usage, uptime, CPU info, RAM info, project version, author, and file
 * checks.
 */
function showInfo() {
    const os = require('os');
    const fs = require('fs');
    const { execSync } = require('child_process');

    console.log('');
    console.log('='.repeat(70));
    console.log('  ℹ️  BOT INFORMATION');
    console.log('='.repeat(70));

    // Bot status
    console.log(`📊 Status: ${isRunning ? '🟢 Running' : '🔴 Stopped'}`);
    console.log(`💻 Node.js: ${process.version}`);

    // Get detailed OS info
    let osInfo = '';
    const platform = os.platform();
    const arch = os.arch() === 'x64' ? '64-bit' : os.arch();

    if (platform === 'win32') {
        try {
            const winVer = execSync('wmic os get Caption', { encoding: 'utf-8' });
            const match = winVer.match(/Windows\s+(\d+|[\w\s]+)/i);
            osInfo = match ? `${match[0].trim()} ${arch}` : `Windows ${arch}`;
        } catch (err) {
            osInfo = `Windows ${arch}`;
        }
    } else if (platform === 'linux') {
        try {
            const osRelease = execSync('cat /etc/os-release', { encoding: 'utf-8' });
            const nameMatch = osRelease.match(/PRETTY_NAME="(.+)"/);
            osInfo = nameMatch ? `${nameMatch[1]} ${arch}` : `Linux ${arch}`;
        } catch (err) {
            osInfo = `Linux ${arch}`;
        }
    } else if (platform === 'darwin') {
        try {
            const macVer = execSync('sw_vers -productVersion', { encoding: 'utf-8' }).trim();
            osInfo = `macOS ${macVer} ${arch}`;
        } catch (err) {
            osInfo = `macOS ${arch}`;
        }
    } else {
        osInfo = `${platform} ${arch}`;
    }

    console.log(`🖥️  Platform: ${osInfo}`);
    console.log(`📦 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⏱️  Uptime: ${Math.floor(process.uptime())} seconds`);

    // CPU info (bonus!)
    const cpus = os.cpus();
    if (cpus.length > 0) {
        console.log(`🔧 CPU: ${cpus[0].model}`);
        console.log(`⚡ Cores: ${cpus.length}`);
    }

    // RAM info (bonus!)
    const totalRAM = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeRAM = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    console.log(`💾 RAM: ${freeRAM}GB free / ${totalRAM}GB total`);

    // Project info
    try {
        const pkg = require('./package.json');
        console.log(`📌 Version: ${pkg.version}`);
        console.log(`👤 Author: ${pkg.author}`);
    } catch (err) {
        // Ignore
    }

    // Check files
    const hasEnv = fs.existsSync('.env');
    const hasNodeModules = fs.existsSync('node_modules');

    console.log(`📄 .env file: ${hasEnv ? '✅ Found' : '❌ Missing'}`);
    console.log(`📦 node_modules: ${hasNodeModules ? '✅ Found' : '❌ Missing'}`);

    console.log('='.repeat(70));
}

// Handle keyboard input
rl.on('line', (input) => {
    const cmd = input.trim().toLowerCase();

    switch (cmd) {
        case 'm':
            showMenu();
            break
        case 'h':
            clearCache();
            break;

        case 's':
            clearConsole();
            break;

        case 'r':
            restartBot();
            break;

        case 'v':
            showInfo();
            break;

        case 'c':
            stopBot();
            break;

        case 'exit':
        case 'quit':
        case 'q':
            console.log('👋 Goodbye!');
            if (isRunning) {
                stopBot();
            }
            setTimeout(() => {
                process.exit(0);
            }, 1000);
            break;

        default:
            if (cmd !== '') {
                console.log(`❌ Unknown command: ${cmd}`);
            }
    }
});

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('');
    console.log('👋 Shutting down...');

    if (isRunning) {
        stopBot();
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    } else {
        process.exit(0);
    }
});

// Show menu and auto-start bot
console.log('🤖 Auto-starting bot...');
console.log('');
console.log('');
startBot();
