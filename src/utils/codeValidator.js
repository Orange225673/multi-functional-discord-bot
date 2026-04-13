///////////////////////////////////////////////////////////////////////
//                       CODE VALIDATOR                              //
///////////////////////////////////////////////////////////////////////

/**
 * Validates user code for safety
 * - Prevents infinite loops
 * - Blocks input/stdin functions
 * - Limits sleep/wait calls to 10 seconds
 */

class CodeValidator {
    constructor() {
        // Forbidden patterns (loops, input)
        this.forbiddenPatterns = {
            loops: [
                /\bfor\s*[\(\s]/gi,               // for loops
                /\bwhile\s*[\(\s]/gi,             // while loops
                /\bdo\s*[\{\s]/gi,               // do-while loops
                /\.(forEach|map|reduce|repeat)\s*\(/gi, // JS Array/String loops
                /\b(range|itertools)\b/gi,        // Python loop helpers
                /\[.*\s+for\s+.*\s+in\s+.*\]/gi   // Python List Comprehensions
            ],
            inputFunctions: [
                /\binput\s*\(/gi,         // Python input()
                /\braw_input\s*\(/gi,     // Python 2 raw_input()
                /\binput\s*\(/gi,         // Generic input()
                /\bprompt\s*\(/gi,        // JS/Browser prompt()
                /\brequire\s*\(\s*['"]readline['"]\s*\)/gi, // Node readline
                /\bscanf\s*\(/gi,         // C-style scanf
                /\bgetline\s*\(/gi,       // C++ getline
            ],
            dangerousModules: [
                /\bimport\s+os\b/gi,      // Python os module
                /\brequire\s*\(\s*['"]os['"]\s*\)/gi,
                /\bos\s*\.\s*system/gi,   // os.system()
                /\bsubprocess\b/gi,       // Python subprocess
                /\bprocess\b/gi,                     // Fatal: Can kill the bot
                /\b(http|https|net|fetch)\b/gi,     // Networking: Prevents botnets/leaks
                /\b(env|environ)\b/gi,              // Token Security: Protects your 6 keys
                /\b(vm|vm2|isolated-vm)\b/gi,       // Escaping: Prevents sandbox escapes
                /\b(worker_threads|cluster)\b/gi,   // Resource Exhaustion: Prevents lag
                /\b(socket|urllib|requests)\b/gi,   // Python Networking
                /\b(pathlib|shutil|open)\b/gi,    // File System (Python alternatives)
                /\bexec\b/gi,             // exec function
                /\beval\b/gi,             // eval function
                /\brequire\s*\(\s*['"]fs['"]\s*\)/gi, // Node fs module
                /\brequire\s*\(\s*['"]child_process['"]\s*\)/gi, // Node child_process
                /\b__import__\b/gi,         // Bypasses 'import' keywords
                /\b__subclasses__\b/gi,     // Famous 'jailbreak' method to find hidden classes
                /\b__builtins__\b/gi,       // Accesses all internal functions
                /\b(os|subprocess|pty)\b/gi, // System commands and Terminal access
                /\b(requests|urllib|socket|asyncio)\b/gi, // Network/Internet access
                /\b(pickle|marshal|dbm)\b/gi, // Can execute code during 'unpickling' data
                /\b(sys\.(modules|argv|exit|path))\b/gi, // Internal system state
                /\b(threading|multiprocessing|asyncio)\b/gi,
                /\bgetattr\b/gi,
                /\bsetattr\b/gi,
                /\.constructor\b/gi,
                /process\.env/gi,  // Protect your 6 tokens!
            ]
        };
    }

    /**
     * Validates code for security issues
     * @param {string} code - The code to validate
     * @param {string} language - Programming language (python, javascript, etc)
     * @returns {Object} - { valid: boolean, errors: Array<string> }
     */
    validateCode(code, language) {
        const errors = [];

        // Check for loops
        for (const pattern of this.forbiddenPatterns.loops) {
            if (pattern.test(code)) {
                errors.push('❌ Loops are not allowed (for, while, do-while)');
                break;
            }
        }

        // Check for input functions
        for (const pattern of this.forbiddenPatterns.inputFunctions) {
            if (pattern.test(code)) {
                errors.push('❌ Input/stdin functions are not allowed (input, prompt, etc)');
                break;
            }
        }

        // Check for dangerous modules/functions
        for (const pattern of this.forbiddenPatterns.dangerousModules) {
            if (pattern.test(code)) {
                errors.push('❌ Dangerous modules/functions are not allowed (os, subprocess, fs, child_process, exec, eval)');
                break;
            }
        }

        // Check sleep/wait/setTimeout total
        const sleepError = this.validateSleepCalls(code, language);
        if (sleepError) {
            errors.push(sleepError);
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validates that total sleep time doesn't exceed 10 seconds
     * @param {string} code - The code to check
     * @param {string} language - Programming language
     * @returns {string|null} - Error message or null if valid
     */
    validateSleepCalls(code, language) {
        let sleepPatterns = [];
        let maxSleep = 5; // 5 seconds
        if (language.toLowerCase() === 'javascript') {
            // JavaScript: setTimeout(fn, milliseconds) and Thread.sleep (Rhino)
            sleepPatterns = [
                { regex: /setTimeout\s*\(\s*[^,]*,\s*([\d.]+)\s*\)/g, unit: 'milliseconds' },
                { regex: /Thread\.sleep\s*\(\s*([\d.]+)\s*\)/g, unit: 'milliseconds' }
            ];
        }

        let totalSleepMs = 0;

        for (const pattern of sleepPatterns) {
            let match;
            while ((match = pattern.regex.exec(code)) !== null) {
                const value = parseFloat(match[1]);
                const sleepMs = pattern.unit === 'milliseconds' ? value : value * 1000;
                totalSleepMs += sleepMs;
            }
        }

        if (totalSleepMs > maxSleep * 1000) {
            return `❌ Total sleep time exceeds limit! Max: ${maxSleep}s, Got: ${(totalSleepMs / 1000).toFixed(2)}s`;
        }

        return null;
    }

    /**
     * Extracts code from Discord code block format
     * @param {string} content - The message content
     * @returns {Object} - { code: string, language: string, found: boolean }
     */
    extractCodeBlock(content) {
        // Match ```language code ``` pattern (flexible with whitespace)
        const codeBlockRegex = /```\s*(\w*)\s*\n([\s\S]*?)\n\s*```/;
        const match = content.match(codeBlockRegex);

        if (!match) {
            return {
                code: null,
                language: null,
                found: false
            };
        }

        return {
            code: match[2].trim(),
            language: match[1] || 'text',
            found: true
        };
    }
}

module.exports = CodeValidator;
