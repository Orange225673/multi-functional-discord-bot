///////////////////////////////////////////////////////////////////////
//                         CODE COMMAND                               //
///////////////////////////////////////////////////////////////////////

const CodeValidator = require('../utils/codeValidator');
const CodeExecutor = require('../systems/code/codeExecutor');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Cooldowns per user
const cooldowns = new Map();
const COOLDOWN_TIME = 30 * 1000; // 30 seconds

function setup(client) {
    client.commands.set('code', {
        name: 'code',
        description: 'Execute code (JavaScript)',
        async run(message, args, client, config) {
            // Check cooldown
            const userId = message.author.id;
            const now = Date.now();

            if (cooldowns.has(userId)) {
                const expirationTime = cooldowns.get(userId) + COOLDOWN_TIME;
                if (now < expirationTime) {
                    const remainingTime = ((expirationTime - now) / 1000).toFixed(1);
                    return message.reply(`⏱️ Command on cooldown. Try again in **${remainingTime}s**`);
                }
            }

            // Set cooldown
            cooldowns.set(userId, now);

            // Parse mode from message (handles newlines)
            const modeMatch = message.content.match(/^%code\s+([123])\s*(?:\n|$)/);
            const mode = modeMatch ? modeMatch[1] : null;

            if (!mode) {
                return message.reply(
                    '❌ Invalid mode! Usage: `%code <mode> ```<language>\ncode\n```\n\n' +
                    '**Modes:**\n1️⃣ Basic output\n2️⃣ Output + modules\n3️⃣ All info'
                );
            }

            // Extract code block from message content
            const validator = new CodeValidator();
            const codeBlock = validator.extractCodeBlock(message.content);

            if (!codeBlock.found) {
                return message.reply(
                    '❌ No code block found! Usage: `%code <mode> ```<language>\ncode\n```\n\n'
                );
            }

            const { code, language } = codeBlock;

            // Show "thinking" reaction
            await message.react('⏳');

            // Validate code
            const validation = validator.validateCode(code, language);
            if (!validation.valid) {
                await message.reactions.removeAll().catch(() => { });
                const embed = new EmbedBuilder()
                    .setTitle('❌ Code Validation Failed')
                    .setDescription(validation.errors.join('\n'))
                    .setColor(0xFF0000)
                    .setFooter({ text: `Language: ${language}` });
                return message.reply({ embeds: [embed] });
            }

            try {
                // Execute code
                const executor = new CodeExecutor();
                const result = await executor.execute(code, language);

                await message.reactions.removeAll().catch(() => { });

                if (!result.success) {
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Execution Error')
                        .setDescription(`\`\`\`${language}\n${result.error}\n\`\`\``)
                        .setColor(0xFF0000)
                        .setFooter({ text: `Language: ${language}` });
                    return message.reply({ embeds: [embed] });
                }

                // Format output based on mode
                const embed = new EmbedBuilder()
                    .setTitle(`✅ Code Executed (${language})`)
                    .setColor(0x00FF00)
                    .setFooter({ text: message.author.username });

                // Mode 1: Basic output
                if (mode === '1') {
                    const output = result.output.length > 1024
                        ? result.output.substring(0, 1021) + '...'
                        : result.output;
                    embed.addFields({
                        name: '📤 Output',
                        value: `\`\`\`\n${output}\n\`\`\``,
                        inline: false
                    });
                }
                // Mode 2: Output + modules
                else if (mode === '2') {
                    const output = result.output.length > 800
                        ? result.output.substring(0, 797) + '...'
                        : result.output;
                    embed.addFields({
                        name: '📤 Output',
                        value: `\`\`\`\n${output}\n\`\`\``,
                        inline: false
                    });

                    if (result.modules.length > 0) {
                        const modules = result.modules.join(', ');
                        const modulesField = modules.length > 1024
                            ? modules.substring(0, 1021) + '...'
                            : modules;
                        embed.addFields({
                            name: '📚 Modules Used',
                            value: modulesField,
                            inline: false
                        });
                    } else {
                        embed.addFields({
                            name: '📚 Modules Used',
                            value: 'None',
                            inline: false
                        });
                    }
                }
                // Mode 3: All info
                else if (mode === '3') {
                    const output = result.output.length > 700
                        ? result.output.substring(0, 697) + '...'
                        : result.output;
                    embed.addFields({
                        name: '📤 Output',
                        value: `\`\`\`\n${output}\n\`\`\``,
                        inline: false
                    });

                    if (result.modules.length > 0) {
                        const modules = result.modules.join(', ');
                        const modulesField = modules.length > 512
                            ? modules.substring(0, 509) + '...'
                            : modules;
                        embed.addFields({
                            name: '📚 Modules',
                            value: modulesField,
                            inline: true
                        });
                    } else {
                        embed.addFields({
                            name: '📚 Modules',
                            value: 'None',
                            inline: true
                        });
                    }

                    embed.addFields({
                        name: '⏱️ Execution Time',
                        value: `${result.executionTime}ms`,
                        inline: true
                    });

                    embed.addFields({
                        name: '💬 Language',
                        value: language,
                        inline: true
                    });
                }

                await message.reply({ embeds: [embed] });

            } catch (error) {
                console.error('Code execution error:', error);
                await message.reactions.removeAll().catch(() => { });
                const embed = new EmbedBuilder()
                    .setTitle('❌ Unexpected Error')
                    .setDescription(`\`\`\`${error.message}\n\`\`\``)
                    .setColor(0xFF0000);
                message.reply({ embeds: [embed] });
            }
        }
    });
}

console.log("✅ Code command started!")
module.exports = {
    setup
};
