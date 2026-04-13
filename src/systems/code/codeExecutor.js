///////////////////////////////////////////////////////////////////////
//                       CODE EXECUTOR                                //
///////////////////////////////////////////////////////////////////////

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const execPromise = promisify(exec);

/**
 * Executes user code safely in isolated environments
 */
class CodeExecutor {
    constructor() {
        this.executionTimeout = 10000; // 5 seconds max execution
        this.outputLimit = 2000;      // 2000 char limit for output
    }

    /**
     * Executes JavaScript code using Node.js
     * @param {string} code - JavaScript code to execute
     * @returns {Promise<Object>} - { success: boolean, output: string, error: string, executionTime: number, modules: Array }
     */
    async executeJavaScript(code) {
        return new Promise(async (resolve) => {
            const tempFile = path.join(__dirname, `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.js`);

            try {
                // Capture console.log output
                const wrappedCode = `
const originalLog = console.log;
const outputs = [];
console.log = (...args) => {
    outputs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
};

try {
    ${code}
} finally {
    console.log = originalLog;
}

if (outputs.length > 0) {
    process.stdout.write(outputs.join('\\n'));
}
                `;

                // Write code to temp file
                fs.writeFileSync(tempFile, wrappedCode);

                const startTime = Date.now();

                // Execute with timeout
                const { stdout, stderr } = await this.executeWithTimeout(
                    `node "${tempFile}"`,
                    this.executionTimeout
                );

                const executionTime = Date.now() - startTime;

                // Extract imported modules
                const modules = this.extractModules(code, 'javascript');

                // Clean output
                const output = (stdout + stderr).trim();
                const limitedOutput = output.length > this.outputLimit
                    ? output.substring(0, this.outputLimit) + `\n... (output truncated, ${output.length - this.outputLimit} chars omitted)`
                    : output;

                resolve({
                    success: true,
                    output: limitedOutput || '(No output)',
                    error: null,
                    executionTime,
                    modules
                });

            } catch (error) {
                const limitedError = error.message.length > this.outputLimit
                    ? error.message.substring(0, this.outputLimit) + '...'
                    : error.message;

                resolve({
                    success: false,
                    output: null,
                    error: limitedError,
                    executionTime: Date.now(),
                    modules: []
                });
            } finally {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            }
        });
    }

    /**
     * Execute command with timeout
     * @param {string} command - Command to execute
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Object>} - { stdout, stderr }
     */
    async executeWithTimeout(command, timeout) {
        return new Promise((resolve, reject) => {
            let completed = false;

            const timer = setTimeout(() => {
                if (!completed) {
                    completed = true;
                    reject(new Error(`⏱️ Execution timeout! Max ${timeout}ms exceeded`));
                }
            }, timeout);

            exec(command, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timer);

                    if (error && !error.killed) {
                        reject(new Error(stderr || error.message));
                    } else {
                        resolve({ stdout, stderr });
                    }
                }
            });
        });
    }

    /**
     * Extracts imported modules from code
     * @param {string} code - The code
     * @param {string} language - Programming language
     * @returns {Array<string>} - List of imported modules
     */
    extractModules(code, language) {
        const modules = new Set();
        if (language.toLowerCase() === 'javascript') {
            // JS imports: require('X'), import X from 'Y'
            const jsRequires = code.match(/(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+.*\s+from\s+['"]([^'"]+)['"]/g);
            if (jsRequires) {
                jsRequires.forEach(imp => {
                    const match = imp.match(/['"]([^'"]+)['"]/);
                    if (match) {
                        modules.add(match[1]);
                    }
                });
            }
        }

        return Array.from(modules);
    }

    /**
     * Executes code based on language
     * @param {string} code - Code to execute
     * @param {string} language - Programming language
     * @returns {Promise<Object>} - Execution result
     */
    async execute(code, language) {
        const lang = language.toLowerCase();
        if (lang === 'javascript' || lang === 'js') {
            return this.executeJavaScript(code);
        } else {
            return {
                success: false,
                output: null,
                error: `❌ Language '${language}' is not supported. Supported: javascript`,
                executionTime: 0,
                modules: []
            };
        }
    }
}

module.exports = CodeExecutor;
