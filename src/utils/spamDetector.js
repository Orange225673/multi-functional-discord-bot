///////////////////////////////////////////////////////////////////////
//                         SPAM DETECTOR                              //
///////////////////////////////////////////////////////////////////////

const config = require('../config');
const SPAM_CONFIG = config.SPAM_CONFIG;

const userMessages = new Map();

async function checkSpam(message, client) {
    const userId = message.author.id;
    const now = Date.now();

    if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
    }

    const messages = userMessages.get(userId);

    // Remove old messages outside the window
    const recentMessages = messages.filter(
        timestamp => now - timestamp < SPAM_CONFIG.WINDOW * 1000
    );

    recentMessages.push(now);
    userMessages.set(userId, recentMessages);

    // Check if spam threshold exceeded
    if (recentMessages.length > SPAM_CONFIG.THRESHOLD) {
        // Delete spam messages if enabled
        if (SPAM_CONFIG.DELETE_SPAM) {
            try {
                await message.delete();
            } catch (err) {
                // Ignore permission errors
            }
        }

        // Send warning
        const warning = await message.channel.send(
            `⚠️ ${message.author}, slow down! You're sending messages too quickly.`
        );

        // Delete warning after duration
        setTimeout(() => {
            warning.delete().catch(() => { });
        }, SPAM_CONFIG.WARNING_DURATION * 1000);

        // Auto-mute if enabled
        if (SPAM_CONFIG.AUTO_MUTE) {
            console.log("Checked spam!");
        }

        return true; // Is spam
    }

    return false; // Not spam
}

console.log('✅ Anti-spam system loaded');

module.exports = { checkSpam };
