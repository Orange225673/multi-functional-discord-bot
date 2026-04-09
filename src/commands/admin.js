///////////////////////////////////////////////////////////////////////
//                         ADMIN COMMANDS                             //
///////////////////////////////////////////////////////////////////////

const { EmbedBuilder } = require('discord.js');
const { isOwner } = require('../utils/helpers');
const crypto = require('crypto');

// Store pending confirmations: userId -> { code, attempts, timestamp }
const pendingKills = new Map();

function setup(client) {

    // ============ EVAL COMMAND ==================
    client.commands.set('eval', {
        name: 'eval',
        description: '⚠️ Execute JavaScript code (OWNER ONLY - DANGEROUS)',
        aliases: ['ev', 'execute'],

        async execute(message, args, client) {
            // CRITICAL: Owner check
            if (!isOwner(message.author.id, client.config.OWNER_ID)) {
                return message.reply('❌ Owner only');
            }

            // Check if code provided
            if (args.length === 0) {
                return message.reply('❌ Usage: `%eval <code>`');
            }

            // Get code
            let code = args.join(' ');

            // Remove code blocks if present
            if (code.startsWith('```js') || code.startsWith('```javascript')) {
                code = code.replace(/```(?:js|javascript)\n?/, '').replace(/```$/, '');
            } else if (code.startsWith('```')) {
                code = code.replace(/```\n?/, '').replace(/```$/, '');
            }

            // Trim whitespace
            code = code.trim();

            // Warning embed
            const warningEmbed = new EmbedBuilder()
                .setTitle('⚠️ Executing Code...')
                .setDescription('```js\n' + code.substring(0, 1900) + '\n```')
                .setColor(0xFFA500)
                .setFooter({ text: '⚠️ Be careful! This can crash the bot!' })
                .setTimestamp();

            await message.reply({ embeds: [warningEmbed] });

            try {
                // Execute code
                const startTime = Date.now();
                let result = eval(code);
                const executionTime = Date.now() - startTime;

                // Handle promises
                if (result instanceof Promise) {
                    result = await result;
                }

                // Convert result to string
                let output = result;

                if (typeof result === 'object') {
                    try {
                        output = JSON.stringify(result, null, 2);
                    } catch (err) {
                        output = String(result);
                    }
                } else {
                    output = String(result);
                }

                // Truncate if too long
                if (output.length > 1900) {
                    output = output.substring(0, 1900) + '...';
                }

                // Success embed
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Execution Successful')
                    .setDescription('```js\n' + output + '\n```')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '⏱️ Execution Time', value: `${executionTime}ms`, inline: true },
                        { name: '📊 Type', value: typeof result, inline: true }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [successEmbed] });

            } catch (error) {
                // Error embed
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Execution Failed')
                    .setDescription('```js\n' + error.toString().substring(0, 1900) + '\n```')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: 'Error Name', value: error.name || 'Unknown', inline: true },
                        { name: 'Error Type', value: typeof error, inline: true }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [errorEmbed] });
            }
        }
    });

    // Aliases
    client.commands.set('ev', client.commands.get('eval'));
    client.commands.set('execute', client.commands.get('eval'));

    // ============ (BOOL) IS ONLINE COMMAND ======
    client.commands.set('isonline', {
        name: 'isonline',
        description: 'check bot status',
        async execute(message, args, client) {
            if (!isOwner(message.author.id, client.config.OWNER_ID)) return;
            await message.reply("Yes I'm online my boss");
        }
    });

    // ============ SET NICKNAME COMMAND =======
    client.commands.set('setname', {
        name: 'setname',
        description: 'Set new name for the bot (Owner only)',
        aliases: ['botname'],
        async execute(message, args, client) {
            // Owner check first
            if (!isOwner(message.author.id, client.config.OWNER_ID)) {
                return message.reply('❌ Owner only!');
            }

            // Get new name
            const newName = args.join(' ').trim();

            // Validation checks
            if (!newName) {
                return message.reply('❌ Please provide a new name!\nUsage: `%setname <new name>`');
            }

            if (newName.length < 2) {
                return message.reply('❌ Name must be at least 2 characters long!');
            }

            if (newName.length > 32) {
                return message.reply('❌ Name must be 32 characters or less!');
            }

            // Check for invalid characters (optional - Discord allows most characters)
            if (newName.includes('@') || newName.includes('#')) {
                return message.reply('❌ Name cannot contain @ or # symbols!');
            }

            // Try to change username
            try {
                const oldName = client.user.username;
                await client.user.setUsername(newName);

                return message.reply(
                    `✅ **Bot username updated!**\n` +
                    `Old name: \`${oldName}\`\n` +
                    `New name: \`${newName}\``
                );
            } catch (error) {
                console.error('Error changing bot username:', error);

                // Handle specific error cases
                if (error.code === 50035) {
                    return message.reply('❌ Invalid username format!');
                } else if (error.message.includes('rate limit')) {
                    return message.reply(
                        `⏰ **Rate Limited!**\n` +
                        `Discord only allows **2 username changes per hour**.\n`
                    );
                } else {
                    console.error(error);
                    return message.reply(
                        `❌ **Failed to change username!**\n`
                    );

                }
            }
        }
    });
    // ============ SERVERS COMMAND ============
    client.commands.set('servers', {
        name: 'servers',
        aliases: ['guilds'],
        description: 'List all servers',
        async execute(message, args, client) {
            if (!isOwner(message.author.id, client.config.OWNER_ID)) {
                return message.reply('❌ Owner only!');
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Bot Servers')
                .setColor(0x00D4FF)
                .setDescription(`Connected to **${client.guilds.cache.size}** servers`);

            let text = '';
            client.guilds.cache.forEach(guild => {
                text += `**${guild.name}** (${guild.id}) - ${guild.memberCount} members\n`;
            });

            embed.addFields({ name: 'Servers', value: text || 'None' });

            await message.reply({ embeds: [embed] });
        }
    });

    client.commands.set('guilds', client.commands.get('servers'));

    // ============ SHUTDOWN COMMAND ============
    client.commands.set('shutdown', {
        name: 'shutdown',
        aliases: ['stop'],
        description: 'Shutdown the bot',
        async execute(message, args, client) {
            if (!isOwner(message.author.id, client.config.OWNER_ID)) {
                return message.reply('❌ Owner only!');
            }

            await message.reply('👋 Shutting down...');

            setTimeout(() => {
                process.exit(0);
            }, 1000);
        }
    });

    client.commands.set('stop', client.commands.get('shutdown'));

    // ============ KILLBOT COMMAND ============
    client.commands.set('killbot', {
        name: 'killbot',
        description: 'Shutdown bot with confirmation (Owner only)',
        async execute(message, args, client) {
            if (!isOwner(message.author.id, client.config.OWNER_ID)) {
                return message.reply('❌ Owner only!');
            }

            // Generate random 60-character string
            const confirmCode = crypto.randomBytes(30).toString('hex'); // 60 hex chars

            // Store confirmation code
            pendingKills.set(message.author.id, {
                code: confirmCode,
                attempts: 0,
                timestamp: Date.now()
            });

            // Auto-expire after 5 minutes
            setTimeout(() => {
                if (pendingKills.has(message.author.id)) {
                    pendingKills.delete(message.author.id);
                }
            }, 300000);

            // Send DM
            try {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Bot Shutdown Confirmation')
                    .setDescription('To confirm bot shutdown, use the command:')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: 'Confirmation Code', value: `\`${confirmCode}\``, inline: false },
                        { name: 'Command', value: `\`%confirm ${confirmCode}\``, inline: false },
                        { name: '⚠️ Warning', value: 'You have **2 attempts** to enter the correct code.\nCode expires in 5 minutes.', inline: false }
                    )
                    .setTimestamp();

                await message.author.send({ embeds: [embed] });
            } catch (error) {
                pendingKills.delete(message.author.id);
                await message.reply('❌ Could not send DM! Make sure your DMs are open.');
            }
        }
    });

    // ============ CONFIRM COMMAND ============
    client.commands.set('confirm', {
        name: 'confirm',
        description: 'Confirm bot shutdown',
        async execute(message, args, client) {
            if (!isOwner(message.author.id, client.config.OWNER_ID)) {
                return message.reply('❌ Owner only!');
            }

            if (!pendingKills.has(message.author.id)) {
                return message.reply('❌ No pending shutdown confirmation. Use `%killbot` first.');
            }

            if (args.length === 0) {
                return message.reply('❌ Usage: `%confirm <code>`');
            }

            const userCode = args[0];
            const pending = pendingKills.get(message.author.id);

            // Check if code matches
            if (userCode === pending.code) {
                pendingKills.delete(message.author.id);

                await message.reply('✅ Confirmation successful! Shutting down bot in 3 seconds...');

                setTimeout(() => {
                    console.log('🛑 Bot shutdown by owner');
                    process.exit(0);
                }, 3000);
            } else {
                pending.attempts++;

                if (pending.attempts >= 2) {
                    pendingKills.delete(message.author.id);
                    return message.reply('❌ Incorrect code! Maximum attempts reached. Confirmation cancelled.');
                } else {
                    const attemptsLeft = 2 - pending.attempts;
                    return message.reply(`❌ Incorrect code! You have **${attemptsLeft}** attempt(s) left.`);
                }
            }
        }
    });

    // ============ %SIZECHECK COMMAND ============
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');

    client.commands.set('sizecheck', {
        name: 'sizecheck',
        description: '📊 Check project size (Owner only)',
        aliases: ['size', 'disksize'],

        async execute(message, args, client) {
            if (!isOwner(message.author.id, client.config.OWNER_ID)) {
                return message.reply('❌ Owner only! ');
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Analyzing Project Size...')
                .setDescription('Scanning folders...')
                .setColor(0x3498DB);

            const msg = await message.reply({ embeds: [embed] });

            try {
                const folders = fs.readdirSync('.', { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);

                let folderSizes = [];

                for (const folder of folders) {
                    const size = getFolderSize(folder);
                    folderSizes.push({
                        name: folder,
                        size: size,
                        sizeMB: (size / 1024 / 1024).toFixed(2)
                    });
                }

                folderSizes.sort((a, b) => b.size - a.size);

                const totalSize = folderSizes.reduce((sum, f) => sum + f.size, 0);
                const totalMB = (totalSize / 1024 / 1024).toFixed(2);

                const resultEmbed = new EmbedBuilder()
                    .setTitle('📊 Project Size Analysis')
                    .setColor(0x2ECC71)
                    .setTimestamp();

                let folderList = '';
                for (let i = 0; i < Math.min(10, folderSizes.length); i++) {
                    const folder = folderSizes[i];
                    const emoji = folder.sizeMB > 100 ? '🔴' : folder.sizeMB > 10 ? '🟡' : '🟢';
                    folderList += `${emoji} **${folder.name}**: ${folder.sizeMB} MB\n`;
                }

                resultEmbed.addFields(
                    { name: '📁 Folder Sizes', value: folderList || 'No folders', inline: false },
                    { name: '💾 Total Size', value: `**${totalMB} MB**`, inline: true },
                    { name: '📈 Folders', value: `${folderSizes.length}`, inline: true }
                );

                await msg.edit({ embeds: [resultEmbed] });

            } catch (error) {
                await msg.edit({ content: `❌ Error: ${error.message}` });
            }
        }
    });

    // ============ %CLEANUP COMMAND ============
    client.commands.set('cleanup', {
        name: 'cleanup',
        description: '🧹 Clean NPM cache (Owner only)',
        aliases: ['clean', 'cleancache'],

        async execute(message, args, client) {
            if (!isOwner(message.author.id, client.config.OWNER_ID)) {
                return message.reply('❌ Owner only!');
            }

            const msg = await message.reply('🧹 Cleaning...');

            try {
                let results = [];

                // Clean NPM cache
                try {
                    execSync('npm cache clean --force', { encoding: 'utf-8' });
                    results.push('✅ NPM cache cleaned');
                } catch (err) {
                    results.push('❌ NPM cache clean failed');
                }

                // Delete cache folders
                const foldersToDelete = ['.npm', '.cache', '.node-gyp'];
                let deleted = [];

                for (const folder of foldersToDelete) {
                    if (fs.existsSync(folder)) {
                        try {
                            fs.rmSync(folder, { recursive: true, force: true });
                            deleted.push(folder);
                        } catch (err) {
                            // Ignore errors
                        }
                    }
                }

                if (deleted.length > 0) {
                    results.push(`✅ Deleted: ${deleted.join(', ')}`);
                }

                const embed = new EmbedBuilder()
                    .setTitle('🧹 Cleanup Complete!')
                    .setDescription(results.join('\n'))
                    .setColor(0x2ECC71)
                    .setFooter({ text: ' Owner Command' })
                    .setTimestamp();

                await msg.edit({ embeds: [embed] });

            } catch (error) {
                await msg.edit({ content: `❌ Error: ${error.message}` });
            }
        }
    });

    // Helper function for folder size
    function getFolderSize(folderPath) {
        let totalSize = 0;

        function calculateSize(dirPath) {
            try {
                const files = fs.readdirSync(dirPath);
                for (const file of files) {
                    const filePath = path.join(dirPath, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (stats.isDirectory()) {
                            calculateSize(filePath); // ✅ Now includes ALL folders
                        } else {
                            totalSize += stats.size;
                        }
                    } catch (err) { }
                }
            } catch (err) { }
        }

        calculateSize(folderPath);
        return totalSize;
    }


    console.log('✅ Admin commands loaded');
}

module.exports = { setup };
