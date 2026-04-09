///////////////////////////////////////////////////////////////////////
//                         MATH SYSTEM                                //
///////////////////////////////////////////////////////////////////////

const { EmbedBuilder } = require('discord.js');
const DatabaseManager = require('../utils/DatabaseManager');

const dbManager = new DatabaseManager();
const activePlayers = new Map(); // { userId: points }

// ============ QUIZ STATE MANAGEMENT ============
let currentQuizState = {
    active: false,
    channelId: null,
    guildId: null,
    questionCollectors: [], // Store message collectors to cancel them
    shouldStop: false
};

// ============ UTILITY FUNCTIONS ============

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick random item from array (like Python's random.choice)
 * @param {Array} array - Array to pick from
 * @returns {*} Random item from array
 */
function randomChoice(array) {
    if (!array || array.length === 0) {
        throw new Error('Cannot pick from empty array');
    }
    return array[randomInt(0, array.length - 1)];
}

/**
 * Calculates the number of combinations (nCr).
 * Formula: n! / (r! * (n - r)!)
 *
 * @param {number} n - The total number of items.
 * @param {number} r - The number of items to choose.
 * @returns {number} The number of ways to choose r items from n.
 */
function combinations(n, r) {
    if (r < 0 || r > n) return 0;
    if (r === 0 || r === n) return 1;

    // Optimization: nCr is the same as nC(n-r)
    if (r > n / 2) r = n - r;

    let res = 1;
    for (let i = 1; i <= r; i++) {
        res = res * (n - i + 1) / i;
    }

    return Math.round(res);
}

/**
 * Round number to specified decimal places
 * @param {number} num - Number to round
 * @param {number} decimals - Number of decimal places
 * @returns {number}
 */
function roundNumber(num, decimals = 2) {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Check if string is a valid number
 * @param {string} str - String to check
 * @returns {boolean}
 */
function isValidNumber(str) {
    if (typeof str !== 'string') return false;
    const trimmed = str.trim();
    return !isNaN(trimmed) && trimmed !== '';
}

/**
 * Check if string is integer
 * @param {string} str
 * @returns {boolean}
 */
function isInteger(str) {
    try {
        return Number.isInteger(parseInt(str.trim()));
    } catch {
        return false;
    }
}

/**
 * Check if string is float
 * @param {string} str
 * @returns {boolean}
 */
function isFloat(str) {
    try {
        const parsed = parseFloat(str.trim());
        return !isNaN(parsed) && str.trim() !== '';
    } catch {
        return false;
    }
}

/**
 * Calculate Greatest Common Divisor (Euclidean algorithm)
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

/**
 * Simplify a fraction to lowest terms
 * @param {number} numerator
 * @param {number} denominator
 * @returns {Object} {num, den}
 */
function simplifyFraction(numerator, denominator) {
    if (denominator === 0) {
        throw new Error('Denominator cannot be zero');
    }
    const divisor = gcd(numerator, denominator);
    return {
        num: numerator / divisor,
        den: denominator / divisor
    };
}

/**
 * Compare two floats with tolerance
 * @param {number|string} a
 * @param {number|string} b
 * @param {number} tolerance - Default 0.01
 * @returns {boolean}
 */
function compareFloats(a, b, tolerance = 0.01) {
    try {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        return Math.abs(numA - numB) < tolerance;
    } catch {
        return false;
    }
}

/**
 * Normalize space-separated numbers input
 * @param {string} input
 * @returns {string[]} Array of trimmed values
 */
function normalizeInput(input) {
    if (typeof input !== 'string') return [];
    return input.trim().split(/[\s,;]+/).filter(x => x !== '');
}

// ============ ANSWER VALIDATION ============

/**
 * Validate if message is a genuine answer attempt (not spam/off-topic)
 * @param {string} content - Message content
 * @returns {boolean}
 */
function isValidAnswerAttempt(content) {
    if (!content || typeof content !== 'string') return false;

    const trimmed = content.trim();

    // Reject empty, very long messages, or obvious spam
    if (trimmed.length === 0 || trimmed.length > 100) return false;

    // Must be ONLY numbers, decimals, fractions, or basic math
    // Valid: "5", "3.14", "-10", "5/3", "2+3"
    // Invalid: "hello 5", "the answer is 10", "idk"
    const validPattern = /^[\d\.\-\+\/\*\(\)\s<>=a-zA-Z]+$/;

    if (!validPattern.test(trimmed)) return false;

    // Must contain at least one digit OR letter
    return /[\da-zA-Z]/.test(trimmed);
}

// ============ QUIZ CONTROL ============

/**
 * Stop the current quiz
 */
function stopCurrentQuiz() {
    currentQuizState.shouldStop = true;
    currentQuizState.active = false;

    // Stop all active collectors
    for (const collector of currentQuizState.questionCollectors) {
        if (collector && typeof collector.stop === 'function') {
            collector.stop('quiz_stopped');
        }
    }

    currentQuizState.questionCollectors = [];
    activePlayers.clear();
}

/**
 * Initialize quiz state
 * @param {string} channelId - Channel ID
 * @param {string} guildId - Guild ID
 */
function initializeQuizState(channelId, guildId) {
    currentQuizState = {
        active: true,
        channelId: channelId,
        guildId: guildId,
        questionCollectors: [],
        shouldStop: false
    };
}

// ============ QUIZ SYSTEM ============

/**
 * Wait for ✅ reactions to join quiz
 * @param {Interaction} interaction
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Map<string, number>>} Active players map
 */
async function waitForJoinReactions(interaction, timeout = 30000) {
    const players = new Map();
    const endTime = Date.now() + timeout;
    const timestamp = Math.floor(endTime / 1000);

    const joinEmbed = new EmbedBuilder()
        .setTitle('📊 Math Quiz Starting')
        .setDescription(`React with ✅ to join!\nQuiz starts <t:${timestamp}:R>\nRemember to bring your calculator`)
        .setColor('Blue');

    const joinMsg = await interaction.reply({ embeds: [joinEmbed], fetchReply: true });
    await joinMsg.react('✅');

    const filter = (reaction, user) => {
        return reaction.emoji.name === '✅' && !user.bot;
    };

    while (Date.now() < endTime) {
        try {
            const remaining = endTime - Date.now();
            if (remaining <= 0) break;

            const collected = await joinMsg.awaitReactions({
                filter,
                max: 1,
                time: Math.min(remaining, 5000),
                errors: ['time']
            });

            if (collected.size > 0) {
                const reaction = collected.first();
                const users = await reaction.users.fetch();
                users.forEach((user) => {
                    if (!user.bot) {
                        players.set(user.id, 0); // Initialize with 0 points
                    }
                });
            }
        } catch (error) {
            continue;
        }
    }

    return players;
}

/**
 * Run a single quiz question
 * @param {Interaction} interaction
 * @param {string} question - Question text
 * @param {Function} checker - Answer validation function
 * @param {number} timeout - Timeout in milliseconds (default 210s)
 * @param {boolean} isLast - Whether this is the last question
 * @returns {Promise<boolean>} Returns false if quiz was stopped
 */
async function runQuizQuestion(interaction, question, checker, timeout = 210000, isLast = false) {
    // Check if quiz should stop
    if (currentQuizState.shouldStop) {
        return false;
    }

    const endTime = Date.now() + timeout;
    const timestamp = Math.floor(endTime / 1000);

    const questionEmbed = new EmbedBuilder()
        .setDescription(`${question}\n\nYou have until <t:${timestamp}:R> to answer!`)
        .setColor('Blue');

    await interaction.channel.send({ embeds: [questionEmbed] });

    const filter = (msg) => {
        return activePlayers.has(msg.author.id) &&
            isValidAnswerAttempt(msg.content); // Only valid attempts
    };

    while (Date.now() < endTime) {
        // Check if quiz should stop
        if (currentQuizState.shouldStop) {
            return false;
        }

        try {
            const remaining = endTime - Date.now();
            if (remaining <= 0) {
                if (isLast) {
                    await interaction.channel.send('⏰ **Time\'s up!**');
                }
                return true;
            }

            const collectorPromise = interaction.channel.awaitMessages({
                filter,
                max: 1,
                time: remaining,
                errors: ['time']
            });

            // Store collector reference (though awaitMessages doesn't return a collector)
            // We'll check shouldStop in the loop instead

            const collected = await collectorPromise;

            if (collected.size > 0) {
                const msg = collected.first();
                const isCorrect = checker(msg.content);

                if (isCorrect) {
                    const timeRemaining = Math.floor((endTime - Date.now()) / 1000);
                    let points = 1;
                    let bonusText = '';

                    // Speed bonus: 2 points if >165s remaining
                    if (timeRemaining > 165) {
                        points = 2;
                        bonusText = ' **Double points!**';
                    }

                    activePlayers.set(msg.author.id, (activePlayers.get(msg.author.id) || 0) + points);

                    await interaction.channel.send(
                        `✅ ${msg.author} **Correct!** (**+${points}** points)${bonusText}`
                    );
                    return true;
                }
                // Wrong answer - silent (no message)
            }
        } catch (error) {
            // Timeout - end question
            if (isLast && !currentQuizState.shouldStop) {
                await interaction.channel.send('⏰ **Time\'s up!**');
            }
            return true;
        }
    }

    return true;
}

/**
 * Run complete quiz sequence
 * @param {Interaction} interaction
 * @param {Array} problemGenerators - Array of problem generator functions
 * @param {string} difficulty - Difficulty level
 */
async function runQuiz(interaction, problemGenerators, difficulty = 'easy') {
    // Initialize quiz state
    initializeQuizState(interaction.channel.id, interaction.guild.id);

    for (let i = 0; i < problemGenerators.length; i++) {
        // Check if quiz was stopped
        if (currentQuizState.shouldStop) {
            console.log('Quiz stopped by vote');
            return;
        }

        const problemGen = problemGenerators[i];
        const problem = problemGen();
        const isLast = (i === problemGenerators.length - 1);

        try {
            const continued = await runQuizQuestion(
                interaction,
                problem.question,
                problem.checker,
                210000,
                isLast
            );

            // If question returned false, quiz was stopped
            if (!continued) {
                console.log('Quiz stopped during question');
                return;
            }

            await new Promise(r => setTimeout(r, 1000));
        } catch (error) {
            console.error(`Error in quiz question ${i + 1}:`, error);
            await interaction.channel.send(`❌ Error generating question: ${error.message}`);
        }
    }

    // Check if quiz was stopped before showing leaderboard
    if (currentQuizState.shouldStop) {
        return;
    }

    // Show leaderboard with rewards
    const leaderboard = Array.from(activePlayers.entries())
        .sort((a, b) => b[1] - a[1]);

    const leaderboardEmbed = new EmbedBuilder()
        .setTitle('🏆 Quiz Leaderboard')
        .setColor('Gold');

    const fields = [];
    const rewards = new Map();
    const gemRewards = new Map(); // ✅ MOVED HERE - DECLARE BEFORE USE!

    // Calculate rewards for top 3
    for (let i = 0; i < leaderboard.length; i++) {
        const [userId, points] = leaderboard[i];
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const name = member?.displayName || `User ${userId}`;

        let moneyReward = 0;
        let gemReward = 0;
        let medal = '';

        // Calculate rewards for top 3
        if (i === 0 && points > 0) {
            // 1st place
            const baseReward = randomInt(5000000, 10000000);
            const pointMultiplier = points * 0.5;
            const hasBooster = member?.premiumSince !== null;
            const boosterMultiplier = hasBooster ? 2 : 1;
            moneyReward = Math.floor(baseReward * pointMultiplier * boosterMultiplier);

            // Gems for 1st place: 3-5 gems
            gemReward = randomInt(3, 5);
            medal = '🥇';
        } else if (i === 1 && points > 0) {
            // 2nd place
            const baseReward = randomInt(1000000, 2500000);
            const pointMultiplier = points * 0.5;
            const hasBooster = member?.premiumSince !== null;
            const boosterMultiplier = hasBooster ? 2 : 1;
            moneyReward = Math.floor(baseReward * pointMultiplier * boosterMultiplier);

            // Gems for 2nd place: 2-3 gems
            gemReward = randomInt(2, 3);
            medal = '🥈';
        } else if (i === 2 && points > 0) {
            // 3rd place
            const baseReward = randomInt(350000, 900000);
            const pointMultiplier = points * 0.5;
            const hasBooster = member?.premiumSince !== null;
            const boosterMultiplier = hasBooster ? 2 : 1;
            moneyReward = Math.floor(baseReward * pointMultiplier * boosterMultiplier);

            // Gems for 3rd place: 1-2 gems
            gemReward = randomInt(1, 2);
            medal = '🥉';
        } else {
            medal = `${i + 1}.`;
        }

        // Add money to user if they won
        if (moneyReward > 0) {
            dbManager.addUserBalance(interaction.guild.id, userId, moneyReward);
            rewards.set(userId, moneyReward);
        }

        // Add gems to user if they won
        if (gemReward > 0) {
            dbManager.addGems(interaction.guild.id, userId, gemReward);
            gemRewards.set(userId, gemReward); // ✅ NOW IT'S DEFINED!
            console.log(`💎 Awarded ${gemReward} gems to user ${userId}`);
        }

        // Format field value
        let fieldValue = `${points} point(s)`;
        if (moneyReward > 0) {
            fieldValue += `\n💰 **+$${moneyReward.toLocaleString()}**`;
        }
        if (gemReward > 0) {
            fieldValue += `\n💎 **+${gemReward} gems**`;
        }

        fields.push({
            name: `${medal} ${name}`,
            value: fieldValue,
            inline: false
        });
    }

    if (fields.length > 0) {
        leaderboardEmbed.addFields(fields);
    }

    await interaction.channel.send({ embeds: [leaderboardEmbed] });

    // Random gem drop (1% chance)
    for (const [userId, points] of leaderboard) {
        if (points > 0 && Math.random() < 0.01) {
            const bonusGems = randomInt(1, 3);
            dbManager.addGems(interaction.guild.id, userId, bonusGems);
            await interaction.channel.send(`💎 <@${userId}> found **${bonusGems} bonus gems**! 🎉`);
        }
    }

    // Announce rewards (optional - you can remove this if you don't want a separate message)
    if (rewards.size > 0) {
        let rewardMsg = '💰 **Money Rewards:**\n';
        for (const [userId, amount] of rewards) {
            rewardMsg += `<@${userId}>: $${amount.toLocaleString()}`;

            // Add gems if any
            const gems = gemRewards.get(userId); // ✅ NOW IT WORKS!
            if (gems) {
                rewardMsg += ` + ${gems}💎`;
            }
            rewardMsg += '\n';
        }
        await interaction.channel.send(rewardMsg);
    }

    // Save to persistent leaderboard
    for (const [userId, points] of leaderboard) {
        if (points > 0) {
            await updatePersistentLeaderboard(interaction.guild.id, userId, points);
        }
    }

    // Clear quiz state
    currentQuizState.active = false;
}

// ============ LEADERBOARD PERSISTENCE ============

/**
 * Update persistent leaderboard in database
 * @param {string} guildId
 * @param {string} userId
 * @param {number} points
 */
async function updatePersistentLeaderboard(guildId, userId, points) {
    try {
        // Add points to database (per server)
        dbManager.addMathPoints(guildId, userId, points);

        // Get updated stats
        const stats = dbManager.getUserStats(guildId, userId);
        const totalPoints = stats.math_points || 0;

        console.log(`📊 Saved to database: User ${userId} earned ${points} points in server ${guildId} (total: ${totalPoints})`);
    } catch (error) {
        console.error('Error updating persistent leaderboard:', error);
    }
}

/**
 * Get persistent leaderboard
 * @param {string} guildId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getPersistentLeaderboard(guildId, limit = 10) {
    try {
        // Fetch top math players from database for this server
        return dbManager.getTopMathPlayers(guildId, limit);
    } catch (error) {
        console.error('Error fetching persistent leaderboard:', error);
        return [];
    }
}

// ============ MODULE EXPORTS ============

module.exports = {
    // Utilities
    randomInt,
    roundNumber,
    isValidNumber,
    isInteger,
    isFloat,
    compareFloats,
    normalizeInput,
    gcd,
    simplifyFraction,
    isValidAnswerAttempt,
    randomChoice,
    combinations,

    // Quiz system
    waitForJoinReactions,
    runQuizQuestion,
    runQuiz,
    stopCurrentQuiz,
    initializeQuizState,

    // Leaderboard
    updatePersistentLeaderboard,
    getPersistentLeaderboard,

    // Active players map
    activePlayers,

    // Quiz state (read-only access)
    getCurrentQuizState: () => currentQuizState,

    // Setup
    setup: (client) => {
        console.log('✅ Math system loaded');
    }
};