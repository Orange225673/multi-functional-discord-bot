///////////////////////////////////////////////////////////////////////
//                    TIMESTAMP HELPER UTILITIES                      //
///////////////////////////////////////////////////////////////////////

/**
 * Discord timestamp format types
 */
const TimestampFormat = {
    SHORT_TIME: 't',        // 3:30 PM
    LONG_TIME: 'T',         // 3:30:45 PM
    SHORT_DATE: 'd',        // 12/31/2024
    LONG_DATE: 'D',         // December 31, 2024
    SHORT_DATETIME: 'f',    // December 31, 2024 3:30 PM (default)
    LONG_DATETIME: 'F',     // Sunday, December 31, 2024 3:30 PM
    RELATIVE: 'R'           // 2 hours ago / in 5 minutes
};

/**
 * Create Discord timestamp from Date or timestamp
 * @param {Date|number|string} time - Date object, timestamp (ms), or date string
 * @param {string} format - Format type (t, T, d, D, f, F, R)
 * @returns {string} Formatted Discord timestamp
 */
function createTimestamp(time, format = 'f') {
    let timestamp;

    if (time instanceof Date) {
        timestamp = Math.floor(time.getTime() / 1000);
    } else if (typeof time === 'number') {
        // If timestamp is in milliseconds, convert to seconds
        timestamp = time > 10000000000 ? Math.floor(time / 1000) : time;
    } else if (typeof time === 'string') {
        timestamp = Math.floor(new Date(time).getTime() / 1000);
    } else {
        throw new Error('Invalid time format');
    }

    return `<t:${timestamp}:${format}>`;
}

/**
 * Create multiple timestamp formats at once
 * @param {Date|number|string} time 
 * @returns {Object} Object with all timestamp formats
 */
function createAllTimestamps(time) {
    return {
        shortTime: createTimestamp(time, 't'),
        longTime: createTimestamp(time, 'T'),
        shortDate: createTimestamp(time, 'd'),
        longDate: createTimestamp(time, 'D'),
        shortDateTime: createTimestamp(time, 'f'),
        longDateTime: createTimestamp(time, 'F'),
        relative: createTimestamp(time, 'R')
    };
}

/**
 * Get timestamp for X time from now
 * @param {number} milliseconds - Milliseconds from now
 * @param {string} format - Format type
 * @returns {string} Discord timestamp
 */
function fromNow(milliseconds, format = 'R') {
    const futureTime = Date.now() + milliseconds;
    return createTimestamp(futureTime, format);
}

/**
 * Get timestamp for X time ago
 * @param {number} milliseconds - Milliseconds ago
 * @param {string} format - Format type
 * @returns {string} Discord timestamp
 */
function ago(milliseconds, format = 'R') {
    const pastTime = Date.now() - milliseconds;
    return createTimestamp(pastTime, format);
}

/**
 * Parse time string to milliseconds
 * @param {string} timeStr - Time string (10s, 5m, 2h, 1d)
 * @returns {number|null} Milliseconds or null if invalid
 */
function parseTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;

    const regex = /^(\d+)([smhdw])$/i;
    const match = timeStr.toLowerCase().match(regex);

    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const units = {
        's': 1000,           // seconds
        'm': 60000,          // minutes
        'h': 3600000,        // hours
        'd': 86400000,       // days
        'w': 604800000       // weeks
    };

    return value * (units[unit] || 0);
}

/**
 * Create timestamp from time string (10m, 2h, 1d)
 * @param {string} timeStr - Time string
 * @param {string} format - Format type
 * @returns {string} Discord timestamp
 */
function fromTimeString(timeStr, format = 'R') {
    const ms = parseTime(timeStr);
    if (!ms) throw new Error('Invalid time string format');
    return fromNow(ms, format);
}

/**
 * Format duration in milliseconds to readable string
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted duration (e.g., "2h 30m 15s")
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

    return parts.join(' ') || '0s';
}

/**
 * Get Unix timestamp in seconds
 * @param {Date|number} time - Date or timestamp
 * @returns {number} Unix timestamp in seconds
 */
function getUnixTimestamp(time = Date.now()) {
    if (time instanceof Date) {
        return Math.floor(time.getTime() / 1000);
    }
    return Math.floor(time / 1000);
}

/**
 * Check if time has passed
 * @param {number} timestamp - Unix timestamp in seconds or milliseconds
 * @returns {boolean}
 */
function hasPassed(timestamp) {
    const ts = timestamp > 10000000000 ? timestamp : timestamp * 1000;
    return Date.now() >= ts;
}

/**
 * Get time remaining until timestamp
 * @param {number} timestamp - Unix timestamp in seconds or milliseconds
 * @returns {number} Milliseconds remaining (0 if passed)
 */
function getTimeRemaining(timestamp) {
    const ts = timestamp > 10000000000 ? timestamp : timestamp * 1000;
    const remaining = ts - Date.now();
    return Math.max(0, remaining);
}

module.exports = {
    // Constants
    TimestampFormat,

    // Main functions
    createTimestamp,
    createAllTimestamps,

    // Relative time
    fromNow,
    ago,
    fromTimeString,

    // Parsing
    parseTime,
    formatDuration,

    // Unix timestamps
    getUnixTimestamp,

    // Utilities
    hasPassed,
    getTimeRemaining
};