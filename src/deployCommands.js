///////////////////////////////////////////////////////////////////////
//                    SLASH COMMAND DEPLOYER                          //
///////////////////////////////////////////////////////////////////////

const { REST, Routes } = require('discord.js');
const config = require('./config');
const { description } = require('./commands/reminder');
const gemsCommands = require('./commands/economy/gems');
const xpCommands = require('./commands/economy/xp');

// Define all slash commands
const commands = [
    // ============ CHESS COMMANDS ============
    {
        name: 'chess',
        description: 'Start a chess game',
        options: [
            {
                name: 'opponent',
                description: 'Your opponent',
                type: 6, // USER
                required: true
            },
            {
                name: 'minutes',
                description: 'Time in minutes (1-60)',
                type: 4, // INTEGER
                required: false
            }
        ]
    },
    {
        name: 'board',
        description: 'Show current chess board'
    },
    {
        name: 'chesstotal',
        description: 'Server chess leaderboard'
    },
    {
        name: 'chessglobal',
        description: 'Global chess leaderboard'
    },
    {
        name: 'chesselo',
        description: 'View chess stats and ELO',
        options: [
            {
                name: 'user',
                description: 'User to check (optional)',
                type: 6, // USER
                required: false
            }
        ]
    },

    // ============ ECONOMY COMMANDS ============
    {
        name: 'gbl',
        description: 'Gamble your money',
        options: [
            {
                name: 'amount',
                description: 'Amount to gamble (or "all")',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'bal',
        description: 'Check your balance'
    },
    {
        name: 'baltop',
        description: 'Show top 10 richest users in this server'
    },
    {
        name: 'topglobal',
        description: 'Show top 10 richest users across ALL servers'
    },
    {
        name: 'balance',
        description: 'Check your balance',
        options: [
            {
                name: 'user',
                description: 'User to check (optional)',
                type: 6, // USER type
                required: false
            }
        ]
    },
    {
        name: 'daily',
        description: 'Claim daily rewards'
    },
    {
        name: 'work',
        description: 'Work for money'
    },
    {
        name: 'gamble',
        description: 'Gamble your money',
        options: [
            {
                name: 'amount',
                description: 'Amount to gamble (or "all")',
                type: 3, // STRING type
                required: true
            }
        ]
    },
    {
        name: 'give',
        description: 'Give money to someone',
        options: [
            {
                name: 'user',
                description: 'User to give money to',
                type: 6, // USER type
                required: true
            },
            {
                name: 'amount',
                description: 'Amount to give',
                type: 4, // INTEGER type
                required: true
            }
        ]
    },
    {
        name: 'leaderboard',
        description: 'Show richest users'
    },

    // ============ STATS COMMANDS ============
    {
        name: 'me',
        description: 'Show your message stats',
        options: [
            {
                name: 'user',
                description: 'User to check (optional)',
                type: 6, // USER type
                required: false
            }
        ]
    },
    {
        name: 'toptotal',
        description: 'All-time message leaderboard'
    },
    {
        name: 'topdaily',
        description: 'Daily message leaderboard'
    },

    // ============ POLL COMMANDS ============
    {
        name: 'poll',
        description: 'Create a poll',
        options: [
            {
                name: 'question',
                description: 'Poll question',
                type: 3, // STRING type
                required: true
            },
            {
                name: 'option1',
                description: 'First option',
                type: 3,
                required: true
            },
            {
                name: 'option2',
                description: 'Second option',
                type: 3,
                required: true
            },
            {
                name: 'option3',
                description: 'Third option',
                type: 3,
                required: false
            },
            {
                name: 'option4',
                description: 'Fourth option',
                type: 3,
                required: false
            },
            {
                name: 'option5',
                description: 'Fifth option',
                type: 3,
                required: false
            }
        ]
    },

    // ============ REMINDER COMMANDS ============
    {
        name: 'remind',
        description: 'Set a reminder',
        options: [
            {
                name: 'time',
                description: 'Time (e.g., 1h, 30m, 2d)',
                type: 3,
                required: true
            },
            {
                name: 'message',
                description: 'Reminder message',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'remindme',
        description: 'Set a reminder',
        options: [
            {
                name: 'time',
                description: 'Time (5m, 2h, 1d)',
                type: 3,
                required: true
            },
            {
                name: 'reminder',
                description: 'Reminder message',
                type: 3,
                required: true
            }
        ]
    },

    // ============ FUN COMMANDS ============
    {
        name: 'ping',
        description: 'Check bot latency'
    },
    {
        name: 'afk',
        description: 'Set AFK status',
        options: [
            {
                name: 'reason',
                description: 'AFK reason',
                type: 3,
                required: false
            }
        ]
    },
    {
        name: '8ball',
        description: 'Ask the magic 8ball',
        options: [
            {
                name: 'question',
                description: 'Your question',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'roll',
        description: 'Roll a dice',
        options: [
            {
                name: 'sides',
                description: 'Number of sides (default: 6)',
                type: 4,
                required: false
            }
        ]
    },
    {
        name: 'flip',
        description: 'Flip a coin'
    },

    // ============ PERMISSION COMMANDS (Admin) ============
    {
        name: 'membercount',
        description: 'Shows server member statistics'
    },
    {
        name: 'whitelist-add',
        description: 'Add a role to command whitelist (Admin only)',
        options: [
            {
                name: 'role',
                description: 'Role to whitelist',
                type: 8, // ROLE
                required: true
            }
        ]
    },
    {
        name: 'whitelist-remove',
        description: 'Remove a role from command whitelist (Admin only)',
        options: [
            {
                name: 'role',
                description: 'Role to remove',
                type: 8, // ROLE
                required: true
            }
        ]
    },
    {
        name: 'whitelist-list',
        description: 'List all whitelisted roles'
    },
    {
        name: 'command-toggle',
        description: 'Enable/disable a command (Admin only)',
        options: [
            {
                name: 'command',
                description: 'Command name to toggle',
                type: 3, // STRING
                required: true
            }
        ]
    },
    {
        name: 'command-list',
        description: 'List all commands and their status'
    },


    // ============ ADMIN COMMANDS ============
    {
        name: 'killbot',
        description: 'Shutdown the bot (Owner only)'
    },
    {
        name: 'restart',
        description: 'Restart the bot (Owner only)'
    },
    {
        name: 'setname',
        description: 'Set a new global name for the bot (Owner Only)',
        options: [
            {
                name: 'name',
                description: 'The new username for the bot',
                type: 3,
                required: true
            }
        ],
    }
];

async function deployCommands() {
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

    try {
        console.log('🔄 Registering slash commands...');

        commands.push(
            gemsCommands.gems.data,
            gemsCommands.gemshop.data,
            xpCommands.xp.data,
            xpCommands.xptop.data,
            xpCommands.xpglobal.data
        );

        // Register commands globally
        await rest.put(
            Routes.applicationCommands(config.CLIENT_ID),
            { body: commands }
        );


        console.log('✅ Successfully registered slash commands globally!');
        console.log(`📝 Registered ${commands.length} commands`);
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
}

module.exports = { deployCommands, commands };
