///////////////////////////////////////////////////////////////////////
//                    CALCULATOR COMMAND                             //
///////////////////////////////////////////////////////////////////////

const math = require('mathjs');
const { EmbedBuilder } = require('discord.js');

function setup(client) {
    client.commands.set('calculator', {
        name: 'calculator',
        aliases: ['calc', 'math', 'calculate'],
        description: 'Advanced calculator with error handling',

        async execute(message, args, client) {
            // ============ VALIDATION ============

            // Check if equation provided
            if (!args.length) {
                return message.reply({
                    content: '❌ **Usage:** `%calc <expression>`\n' +
                        '**Examples:**\n' +
                        '• `%calc 2 + 2`\n' +
                        '• `%calc sqrt(144)`\n' +
                        '• `%calc sin(pi/2)`\n' +
                        '• `%calc (5 + 3) * 2`'
                });
            }

            // Get full equation
            let equation = args.join(' ');

            // Check length limit
            if (equation.length > 200) {
                return message.reply('❌ **Error:** Equation too long! (Max 200 characters)');
            }

            // ============ PRE-PROCESSING ============

            try {
                // Clean and normalize equation
                const cleanEquation = equation
                    .replace(/–/g, '-')           // Em dash to minus
                    .replace(/×/g, '*')           // Multiplication symbol
                    .replace(/÷/g, '/')           // Division symbol
                    .replace(/x/gi, '*')          // 'x' as multiplication
                    .replace(/:/g, '/')           // Colon as division
                    .replace(/(\d+)n/g, '$1')     // Remove BigInt suffix
                    .replace(/\s+/g, ' ')         // Normalize spaces
                    .trim();

                // ============ EVALUATION ============

                let result = math.evaluate(cleanEquation);

                // ============ POST-PROCESSING ============

                // Handle numeric results
                if (typeof result === 'number') {
                    // Check for division by zero or invalid operations
                    if (!isFinite(result)) {
                        return message.reply('❌ **Math Error:** Division by zero or invalid operation!');
                    }

                    // Format result (max 10 decimal places)
                    result = math.format(result, { precision: 14 });

                    // Remove trailing zeros
                    if (result.includes('.')) {
                        result = parseFloat(result).toString();
                    }
                }

                // ============ SUCCESS RESPONSE ============

                const embed = new EmbedBuilder()
                    .setTitle('🔢 Calculator')
                    .setColor(0x00D4FF)
                    .addFields(
                        {
                            name: '**Input**',
                            value: `\`\`\`${equation}\`\`\``,
                            inline: false
                        },
                        {
                            name: '**Result**',
                            value: `\`\`\`${result.toString()}\`\`\``,
                            inline: false
                        }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [embed] });

            } catch (error) {
                // ============ ERROR HANDLING ============

                const errMsg = error.message.toLowerCase();
                let errorMessage = '❌ **Syntax Error:** Invalid expression!';

                // Specific error messages
                if (errMsg.includes('unexpected end')) {
                    errorMessage = '❌ **Syntax Error:** Equation is incomplete!';
                }
                else if (errMsg.includes('undefined symbol') || errMsg.includes('undefined variable')) {
                    errorMessage = '❌ **Syntax Error:** Unknown symbol or variable!';
                }
                else if (errMsg.includes('units do not match')) {
                    errorMessage = '❌ **Math Error:** Incompatible units!';
                }
                else if (errMsg.includes('parenthesis')) {
                    errorMessage = '❌ **Syntax Error:** Mismatched parentheses!';
                }
                else if (errMsg.includes('too many arguments')) {
                    errorMessage = '❌ **Syntax Error:** Too many arguments for function!';
                }
                else if (errMsg.includes('too few arguments')) {
                    errorMessage = '❌ **Syntax Error:** Not enough arguments for function!';
                }
                else if (errMsg.includes('dimension')) {
                    errorMessage = '❌ **Math Error:** Dimension mismatch!';
                }

                // Send error embed
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Calculator Error')
                    .setColor(0xFF0000)
                    .addFields(
                        {
                            name: '**Input**',
                            value: `\`\`\`${equation}\`\`\``,
                            inline: false
                        },
                        {
                            name: '**Error**',
                            value: errorMessage,
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Tip: Check your syntax and try again!' })
                    .setTimestamp();

                return message.reply({ embeds: [errorEmbed] });
            }
        }
    });

    // Set aliases
    client.commands.set('calc', client.commands.get('calculator'));
    client.commands.set('calculate', client.commands.get('calculator'));
}

module.exports = { setup };