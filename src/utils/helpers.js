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
    randomChoice
};
