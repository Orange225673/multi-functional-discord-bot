const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const mathSystem = require('../../systems/math/mathSystem');
const { Easy, Hard, Extreme } = require('../../systems/math/mathProblems');
const { createTimestamp } = require('../../utils/timestampHelper');
const config = require('../../config');

const easyProblems = new Easy();
const hardProblems = new Hard();
const extremeProblems = new Extreme();

const hardMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(hardProblems))
    .filter(name =>
        typeof hardProblems[name] === 'function' &&
        name !== 'constructor' &&
        !name.startsWith('_')
    );

const easyMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(easyProblems))
    .filter(name =>
        typeof easyProblems[name] === 'function' &&
        name !== 'constructor' &&
        !name.startsWith('_')
    );

const extremeMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(extremeProblems))
    .filter(name =>
        typeof extremeProblems[name] === 'function' &&
        name !== 'constructor' &&
        !name.startsWith('_')
    );

const easyProblems_generators = [
    ...easyMethods.map(methodName => () => easyProblems[methodName]())
];

const hardProblems_generators = [
    ...easyProblems_generators,
    ...hardMethods.map(methodName => () => hardProblems[methodName]())
];

const extremeProblems_generators = [
    ...hardProblems_generators,
    ...extremeMethods.map(methodName => () => extremeProblems[methodName]())
];

// Only the specific difficulty problems (no mixing)
const easyOnly_generators = [
    ...easyMethods.map(methodName => () => easyProblems[methodName]())
];

const hardOnly_generators = [
    ...hardMethods.map(methodName => () => hardProblems[methodName]())
];

const extremeOnly_generators = [
    ...extremeMethods.map(methodName => () => extremeProblems[methodName]())
];

/**
 * Select random problems from difficulty level
 * @param {Array} problemArray - Array of problem generator functions
 * @param {number} count - Number of problems to select
 * @returns {Array} Selected problem generators
 */
function selectRandomProblems(problemArray, count = 5) {
    const shuffled = [...problemArray];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

function setup(client) {
    // Register prefix commands
    client.commands.set('math', module.exports);
    client.commands.set('math-start', module.exports);
    client.commands.set('mquiz', module.exports);

    console.log('✅ Math commands registered');
    console.log(`- Easy mode: ${easyProblems_generators.length} problems (${easyOnly_generators.length} unique)`);
    console.log(`- Hard mode: ${hardProblems_generators.length} problems (${hardOnly_generators.length} unique)`);
    console.log(`- Extreme mode: ${extremeProblems_generators.length} problems (${extremeOnly_generators.length} unique)`);
}

module.exports = {
    setup,
    name: 'math',
    description: 'Start a math quiz',
    aliases: ['math-start', 'mquiz'],
    category: 'fun',

    async run(message, args) {
        try {
            // Parse arguments
            let difficulty = 'easy';
            let useOnly = false;
            let autoCorrection = false;

            // Check for flags (owner only)
            const isOwner = message.author.id === config.OWNER_ID;

            for (let i = 0; i < args.length; i++) {
                const arg = args[i].toLowerCase();

                if (['easy', 'hard', 'extreme'].includes(arg)) {
                    difficulty = arg;
                } else if (arg === '--only') {
                    useOnly = true;
                } else if (arg === '--auto-correction' && isOwner) {
                    autoCorrection = true;
                }
            }

            // Validate difficulty
            if (!['easy', 'hard', 'extreme'].includes(difficulty)) {
                return message.reply('`Usage: %math <easy|hard|extreme> [--only] [--auto-correction]`');
            }

            // If non-owner tries to use flags, ignore them silently
            if (!isOwner) {
                useOnly = false;
                autoCorrection = false;
            }

            // Select problem array based on difficulty and --only flag
            let problemArray;
            if (useOnly) {
                // Only problems from this difficulty
                if (difficulty === 'extreme') {
                    problemArray = extremeOnly_generators;
                } else if (difficulty === 'hard') {
                    problemArray = hardOnly_generators;
                } else {
                    problemArray = easyOnly_generators;
                }
            } else {
                // Normal mode (includes easier problems)
                if (difficulty === 'extreme') {
                    problemArray = extremeProblems_generators;
                } else if (difficulty === 'hard') {
                    problemArray = hardProblems_generators;
                } else {
                    problemArray = easyProblems_generators;
                }
            }

            const selectedProblems = selectRandomProblems(problemArray, problemArray.length);

            // AUTO-CORRECTION MODE (Owner only, for debugging)
            if (autoCorrection && isOwner) {
                await message.reply(`🔧 **DEBUG MODE: Auto-Correction Enabled**\n📝 Testing ${difficulty.toUpperCase()} problems${useOnly ? ' (ONLY)' : ''}...`);

                let successCount = 0;
                let failCount = 0;
                const errors = [];

                for (let i = 0; i < selectedProblems.length; i++) {
                    try {
                        const problem = selectedProblems[i]();

                        if (!problem || !problem.question || !problem.checker) {
                            throw new Error('Invalid problem structure');
                        }

                        // Test the problem by extracting answer from question or using checker
                        await message.channel.send(`**Question ${i + 1}:**\n${problem.question}`);

                        // Try to test the checker
                        const testResult = problem.checker("test");

                        await message.channel.send(`✅ Problem ${i + 1} generated successfully!\n*Checker function: ${typeof problem.checker === 'function' ? 'Valid' : 'Invalid'}*`);
                        successCount++;

                        await new Promise(r => setTimeout(r, 2000)); // 2 second delay
                    } catch (error) {
                        failCount++;
                        errors.push(`Problem ${i + 1}: ${error.message}`);
                        await message.channel.send(`❌ Problem ${i + 1} FAILED: ${error.message}`);
                    }
                }

                // Summary
                await message.channel.send(
                    `\n📊 **Debug Summary:**\n` +
                    `✅ Success: ${successCount}/${selectedProblems.length}\n` +
                    `❌ Failed: ${failCount}/${selectedProblems.length}\n` +
                    (errors.length > 0 ? `\n**Errors:**\n${errors.join('\n')}` : '')
                );

                return;
            }

            // NORMAL QUIZ MODE
            mathSystem.activePlayers.clear();

            const quizContext = {
                channel: message.channel,
                guild: message.guild,
                author: message.author,
            };

            // Show debug info for owner
            let debugInfo = '';
            if (isOwner && (useOnly || autoCorrection)) {
                debugInfo = `\n**MODE:** ${useOnly ? '[ONLY MODE] ' : ''}${autoCorrection ? '[AUTO-CORRECTION] ' : ''}`;
            }

            const joinMsg = await message.reply({
                content: `📊 **Math Quiz Starting!**\nReact with ✅ to join!\nQuiz starts ${createTimestamp(Date.now() + 30000, 'R')}...${debugInfo}`,
            });

            await joinMsg.react('✅');

            const filter = (reaction, user) => {
                return reaction.emoji.name === '✅' && !user.bot;
            };

            await joinMsg
                .awaitReactions({ filter, time: 30000 })
                .then((collected) => {
                    collected.first()?.users.cache.forEach((user) => {
                        if (!user.bot) {
                            mathSystem.activePlayers.set(user.id, 0);
                        }
                    });
                })
                .catch(() => { });

            if (mathSystem.activePlayers.size === 0) {
                return message.channel.send('❌ No one joined the quiz. Game cancelled.');
            }

            const playerList = Array.from(mathSystem.activePlayers.keys())
                .map(userId => `<@${userId}>`)
                .join(', ');

            await message.channel.send(
                `🎮 **Quiz Started!** Players: ${playerList}\n\n**${difficulty.toUpperCase()} Difficulty.**${useOnly ? ' **(ONLY MODE)**' : ''}`
            );

            console.log(`🎮 Starting quiz: difficulty=${difficulty}, only=${useOnly}, auto-correction=${autoCorrection}`);
            await mathSystem.runQuiz(quizContext, selectedProblems, difficulty);

        } catch (error) {
            console.error('Error in math command:', error);
            message.reply(`❌ Error: ${error.message}`).catch(() => { });
        }
    },
};