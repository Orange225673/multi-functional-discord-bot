///////////////////////////////////////////////////////////////////////
//                         HELPER FUNCTIONS                           //
///////////////////////////////////////////////////////////////////////

const fs = require('fs');
const path = require('path');

// Parse time strings
function parseTime(timeStr) {
    const match = timeStr.toLowerCase().match(/^(\d+)(s|m|h|d|w|month|y)$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'w': return value * 7 * 24 * 60 * 60 * 1000;
        case 'month': return value * 24 * 60 * 60 * 1000 * 30;
        case 'y': return value * 365 * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

// Format milliseconds into readable time
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months`;
    return `${Math.floor(seconds / 31536000)} years`;
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Generate random number between min and max
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Weighted random selection
function weightedRandom(options) {
    const totalWeight = Object.values(options).reduce((sum, opt) => sum + opt.weight, 0);
    let random = Math.random() * totalWeight;

    for (const [key, value] of Object.entries(options)) {
        random -= value.weight;
        if (random <= 0) return { key, ...value };
    }

    return Object.entries(options)[0]; // Fallback
}

// Ensure directory exists
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Load JSON file
function loadJSON(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) {
        saveJSON(filePath, defaultValue);
        return defaultValue;
    }

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading JSON from ${filePath}:`, error);
        return defaultValue;
    }
}

// Save JSON file
function saveJSON(filePath, data) {
    try {
        ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error(`Error saving JSON to ${filePath}:`, error);
    }
}

// Check if user has permission
function hasPermission(member, permission) {
    return member.permissions.has(permission);
}

// Check if user is owner
function isOwner(userId, ownerId) {
    return userId.toString() === ownerId.toString();
}

// Truncate string
function truncate(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

// Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Get random element from array
function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * The function `formatMsg` replaces placeholders in a string with specific values related to a Discord
 * server member.
 * @param str - The `str` parameter is a string that represents a message template which may contain
 * placeholders like `{user}`, `{user_tag}`, `{server}`, and `{memberCount}`.
 * @param member - The `member` parameter in the `formatMsg` function represents a member of a Discord
 * server. It is expected to be an object that contains information about the member, such as their
 * username, tag, the server they belong to, and the total member count in the server.
 * @returns The function `formatMsg` takes a string `str` and a `member` object as parameters. It
 * replaces placeholders in the string with information from the `member` object and returns the
 * formatted message. The placeholders replaced are:
 * - `{user}` with the member's name
 * - `{user_tag}` with the member's tag
 * - `{server}` with the name of the server the member belongs
 */
function formatMsg(str, member) {
    // For discord server message
    return str
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{user_tag}/g, member.user.tag)
        .replace(/{server}/g, member.guild.name)
        .replace(/{memberCount}/g, member.guild.memberCount)
        .replace(/{memberCount_ordinal}/g, ordinal(member.guild.memberCount));
}

/**
 * The ordinal function in JavaScript returns the ordinal suffix (st, nd, rd, th) for a given number.
 * @param n - The function `ordinal(n)` takes a number `n` as input and returns the ordinal
 * representation of that number. For example, if `n` is 1, the function will return "1st", if `n` is
 * 2, it will return "2nd", and so on
 * @returns The `ordinal` function takes a number `n` as input and returns the ordinal representation
 * of that number. For example, if `n` is 1, it will return "1st", if `n` is 2, it will return "2nd",
 * if `n` is 3, it will return "3rd", and for all other cases, it will return the
 */
function ordinal(n) {
    const mod100 = n % 100;

    if (mod100 >= 11 && mod100 <= 13) return n + "th";

    switch (n % 10) {
        case 1: return n + "st";
        case 2: return n + "nd";
        case 3: return n + "rd";
        default: return n + "th";
    }
}


/**
 * The function `parseCookies` takes a text input containing cookie data in Netscape format, parses it,
 * and returns a string of key-value pairs formatted for HTTP cookies.
 * @param txt - The `parseCookies` function takes a string `txt` as input, which is expected to contain
 * cookie data in Netscape format. The function parses this input string to extract and format the
 * cookie name-value pairs.
 * @returns The `parseCookies` function takes a string input `txt` containing cookie data separated by
 * newlines. It parses the input, filters out comments and empty lines, extracts the cookie name and
 * value from each line, and returns a string with all the cookie name-value pairs joined by semicolons
 * and spaces.
 */
function parseCookies(txt) {
    return txt
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const parts = line.split('\t');
            if (parts.length < 7) return null;
            // Netscape format: Name là index 5, Value là index 6
            return `${parts[5].trim()}=${parts[6].trim()}`;
        })
        .filter(Boolean)
        .join('; ');
}

console.log('✅ Helper functions loaded');

module.exports = {
    parseTime,
    formatTime,
    formatNumber,
    randomInt,
    weightedRandom,
    ensureDir,
    loadJSON,
    saveJSON,
    hasPermission,
    isOwner,
    truncate,
    sleep,
    randomChoice,
    formatMsg,
    ordinal,
    parseCookies
};
