//======================================================================
//                   GEMS COMMANDS (💎 PREMIUM CURRENCY)
//======================================================================

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../utils/DatabaseManager');

const dbManager = new DatabaseManager();

// 💎 GEM SHOP ITEMS
const GEM_SHOP = {
    'profile_color': {
        name: 'Custom Profile Color',
        cost: 50,
        emoji: '🎨',
        type: 'cosmetic',
        description: 'Customize your XP card color!'
    },
    'xp_boost_1h': {
        name: '2x XP Boost (1 hour)',
        cost: 5,
        emoji: '⚡',
        type: 'boost',
        duration: 3600000, // 1 hour in ms
        description: 'Double XP from messages for 1 hour'
    },
    'xp_boost_24h': {
        name: '2x XP Boost (24 hours)',
        cost: 20,
        emoji: '⚡',
        type: 'boost',
        duration: 86400000, // 24 hours in ms
        description: 'Double XP from messages for 24 hours'
    },
    'money_boost_1h': {
        name: '2x Money Boost (1 hour)',
        cost: 5,
        emoji: '💰',
        type: 'boost',
        duration: 3600000,
        description: 'Double money from messages for 1 hour'
    },
    'giveaway_boost': {
        name: 'Giveaway Luck Boost',
        cost: 10,
        emoji: '🎁',
        type: 'boost',
        duration: 604800000, // 7 days
        description: '+50% extra entries in giveaways for 7 days'
    }
};

// ============ %GEMS COMMAND ============
const gems = {
    name: 'gems',
    category: 'Economy',
    description: 'Check your gem balance',
    aliases: ['gem', 'balgem'],

    data: new SlashCommandBuilder()
        .setName('gems')
        .setDescription('Check your gem balance')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('Check another user\'s gems')
            .setRequired(false)
        ),

    async execute(interaction, client, config) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const gemBalance = dbManager.getUserGems(interaction.guild.id, targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`💎 ${targetUser.username}'s Gems`)
            .setColor(0x9B59B6)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Gem Balance', value: `**${gemBalance}** 💎`, inline: false },
                { name: 'How to Earn Gems', value: '• Win math quizzes\n• Daily streak bonuses\n• Special events', inline: false }
            )
            .setFooter({ text: 'Use /gemshop to spend gems!' });

        await interaction.reply({ embeds: [embed] });
    },

    async run(message, args, client, config) {
        let targetUser = message.author;

        if (message.mentions.users.size > 0) {
            targetUser = message.mentions.users.first();
        }

        const gemBalance = dbManager.getUserGems(message.guild.id, targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`💎 ${targetUser.username}'s Gems`)
            .setColor(0x9B59B6)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Gem Balance', value: `**${gemBalance}** 💎`, inline: false },
                { name: 'How to Earn Gems', value: '• Win math quizzes\n• Daily streak bonuses\n• Special events', inline: false }
            )
            .setFooter({ text: 'Use %gemshop to spend gems!' });

        await message.reply({ embeds: [embed] });
    }
};

// ============ %GEMSHOP COMMAND ============
const gemshop = {
    name: 'gemshop',
    category: 'Economy',
    description: 'Browse and purchase items with gems',
    aliases: ['gemsshop'],

    data: new SlashCommandBuilder()
        .setName('gemshop')
        .setDescription('Browse the gem shop')
        .addStringOption(opt => opt
            .setName('item')
            .setDescription('Item to purchase')
            .setRequired(false)
            .addChoices(
                { name: '🎨 Custom Profile Color - 50💎', value: 'profile_color' },
                { name: '⚡ 2x XP Boost (1h) - 5💎', value: 'xp_boost_1h' },
                { name: '⚡ 2x XP Boost (24h) - 20💎', value: 'xp_boost_24h' },
                { name: '💰 2x Money Boost (1h) - 5💎', value: 'money_boost_1h' },
                { name: '🎁 Giveaway Luck Boost - 10💎', value: 'giveaway_boost' }
            )
        )
        .addStringOption(opt => opt
            .setName('color')
            .setDescription('Hex color code (for profile color only, e.g., #FF0000)')
            .setRequired(false)
        ),

    async execute(interaction, client, config) {
        const itemId = interaction.options.getString('item');
        const colorHex = interaction.options.getString('color');

        // If no item selected, show shop
        if (!itemId) {
            return showShop(interaction, client);
        }

        // Purchase item
        return purchaseItem(interaction, client, itemId, colorHex);
    },

    async run(message, args, client, config) {
        // If no args, show shop
        if (args.length === 0) {
            return showShop(message, client);
        }

        // Purchase item: %gemshop <item_id> [color]
        const itemId = args[0].toLowerCase();
        const colorHex = args[1];

        return purchaseItem(message, client, itemId, colorHex);
    }
};

// ============ %ADDGEMS COMMAND (OWNER ONLY) ============
const addgems = {
    name: 'addgems',
    category: 'Owner',
    description: '👑 Add gems to a user (Owner only)',
    aliases: ['givegems'],
    ownerOnly: true,

    async run(message, args, client, config) {
        // Check if owner
        if (message.author.id !== '972306366599397427') {
            return message.reply('❌ This command is in beta!');
        }

        // Usage: %addgems @user <amount>
        if (args.length < 2) {
            return message.reply('❌ Usage: `%addgems @user <amount>`');
        }

        // Get target user
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('❌ Please mention a user! Example: `%addgems @Orange225673 100`');
        }

        // Get amount
        const amount = parseInt(args[1]);
        if (isNaN(amount)) {
            return message.reply('❌ Please provide a valid positive number!');
        }

        // Add gems
        dbManager.addGems(message.guild.id, targetUser.id, amount);
        const newBalance = dbManager.getUserGems(message.guild.id, targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle('💎 Gems Added!')
            .setDescription(`Added **${amount}** 💎 to ${targetUser}`)
            .setColor(0x9B59B6)
            .addFields(
                { name: 'Amount Added', value: `+${amount} 💎`, inline: true },
                { name: 'New Balance', value: `${newBalance} 💎`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ text: '👑 Owner Command' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        console.log(`👑 ${message.author.tag} added ${amount} gems to ${targetUser.tag}`);
    }
};

// ============ %REMOVEGEMS COMMAND (OWNER ONLY) ============
const removegems = {
    name: 'removegems',
    category: 'Owner',
    description: '👑 Remove gems from a user (Owner only)',
    aliases: ['takegems'],
    ownerOnly: true,

    async run(message, args, client, config) {
        // Check if owner
        if (message.author.id !== '972306366599397427') {
            return message.reply('❌ This command is in beta!');
        }

        // Usage: %removegems @user <amount>
        if (args.length < 2) {
            return message.reply('❌ Usage: `%removegems @user <amount>`');
        }

        // Get target user
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('❌ Please mention a user!');
        }

        // Get amount
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Please provide a valid positive number!');
        }

        // Check if user has enough gems
        const currentBalance = dbManager.getUserGems(message.guild.id, targetUser.id);
        if (currentBalance < amount) {
            return message.reply(`❌ ${targetUser.username} only has **${currentBalance}** 💎!`);
        }

        // Remove gems
        dbManager.removeGems(message.guild.id, targetUser.id, amount);
        const newBalance = dbManager.getUserGems(message.guild.id, targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle('💎 Gems Removed!')
            .setDescription(`Removed **${amount}** 💎 from ${targetUser}`)
            .setColor(0xE74C3C)
            .addFields(
                { name: 'Amount Removed', value: `-${amount} 💎`, inline: true },
                { name: 'New Balance', value: `${newBalance} 💎`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ text: '👑 Owner Command' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        console.log(`👑 ${message.author.tag} removed ${amount} gems from ${targetUser.tag}`);
    }
};

// ============ %SETGEMS COMMAND (OWNER ONLY) ============
const setgems = {
    name: 'setgems',
    category: 'Owner',
    description: '👑 Set a user\'s gem balance (Owner only)',
    ownerOnly: true,

    async run(message, args, client, config) {
        // Check if owner
        if (message.author.id !== '972306366599397427') {
            return message.reply('❌ This command is in beta!');
        }

        // Usage: %setgems @user <amount>
        if (args.length < 2) {
            return message.reply('❌ Usage: `%setgems @user <amount>`');
        }

        // Get target user
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('❌ Please mention a user!');
        }

        // Get amount
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount < 0) {
            return message.reply('❌ Please provide a valid number (0 or higher)!');
        }

        // Set gems
        dbManager.setGems(message.guild.id, targetUser.id, amount);

        const embed = new EmbedBuilder()
            .setTitle('💎 Gems Set!')
            .setDescription(`Set ${targetUser}'s gem balance to **${amount}** 💎`)
            .setColor(0xF1C40F)
            .addFields(
                { name: 'New Balance', value: `${amount} 💎`, inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ text: '👑 Owner Command' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        console.log(`👑 ${message.author.tag} set ${targetUser.tag}'s gems to ${amount}`);
    }
};

// ============ %GEMSTOP COMMAND (OWNER ONLY) ============
const gemstop = {
    name: 'gemstop',
    category: 'Owner',
    description: '👑 View all users with gems (Owner only)',
    aliases: ['gemslist', 'gemleaderboard'],
    ownerOnly: true,

    async run(message, args, client, config) {

        try {
            // Get all users with gems in this server
            const db = require('better-sqlite3')('./bot.db');
            const users = db.prepare(`
                SELECT user_id, gems 
                FROM economy 
                WHERE server_id = ? AND gems > 0
                ORDER BY gems DESC
                LIMIT 25
            `).all(message.guild.id);

            if (users.length === 0) {
                return message.reply('💎 No users have gems yet!');
            }

            // Build leaderboard
            const embed = new EmbedBuilder()
                .setTitle('💎 Gem Leaderboard (Top 25)')
                .setDescription(`Total users with gems: **${users.length}**`)
                .setColor(0x9B59B6)
                .setFooter({ text: '👑 Owner Command' })
                .setTimestamp();

            let leaderboardText = '';
            let totalGems = 0;

            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                const member = await message.guild.members.fetch(user.user_id).catch(() => null);
                const name = member ? member.displayName : `User ${user.user_id}`;

                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                leaderboardText += `${medal} **${name}** - ${user.gems}💎\n`;
                totalGems += user.gems;
            }

            embed.addFields(
                { name: 'Leaderboard', value: leaderboardText || 'No data', inline: false },
                { name: 'Total Gems in Circulation', value: `${totalGems}💎`, inline: false }
            );

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in gemstop:', error);
            await message.reply('❌ An error occurred while fetching gem data.');
        }
    }
};

async function showShop(ctx, client) {
    const userGems = dbManager.getUserGems(ctx.guild.id, ctx.user?.id || ctx.author.id);

    const embed = new EmbedBuilder()
        .setTitle('💎 Gem Shop')
        .setDescription(`Your Gems: **${userGems}** 💎\n\n**Available Items:**`)
        .setColor(0x9B59B6)
        .setFooter({ text: 'Use /gemshop <item> or %gemshop <item> to purchase!' });

    // Group items by type
    const cosmetics = [];
    const boosts = [];

    for (const [id, item] of Object.entries(GEM_SHOP)) {
        const canAfford = userGems >= item.cost;
        const affordText = canAfford ? '✅' : '❌';
        const itemText = `${item.emoji} **${item.name}** - ${item.cost}💎 ${affordText}\n*${item.description}*`;

        if (item.type === 'cosmetic') {
            cosmetics.push(itemText);
        } else {
            boosts.push(itemText);
        }
    }

    if (cosmetics.length > 0) {
        embed.addFields({ name: '🎨 Cosmetics', value: cosmetics.join('\n\n'), inline: false });
    }

    if (boosts.length > 0) {
        embed.addFields({ name: '⚡ Boosts', value: boosts.join('\n\n'), inline: false });
    }

    if (ctx.reply) {
        await ctx.reply({ embeds: [embed] });
    } else {
        await ctx.channel.send({ embeds: [embed] });
    }
}

async function purchaseItem(ctx, client, itemId, colorHex = null) {
    const userId = ctx.user?.id || ctx.author.id;
    const serverId = ctx.guild.id;

    // Validate item
    const item = GEM_SHOP[itemId];
    if (!item) {
        const errorMsg = '❌ Invalid item! Use `/gemshop` to see available items.';
        if (ctx.reply) {
            return ctx.reply({ content: errorMsg, ephemeral: true });
        } else {
            return ctx.channel.send(errorMsg);
        }
    }

    // Check balance
    const userGems = dbManager.getUserGems(serverId, userId);
    if (userGems < item.cost) {
        const errorMsg = `❌ Not enough gems! You have **${userGems}** 💎 but need **${item.cost}** 💎`;
        if (ctx.reply) {
            return ctx.reply({ content: errorMsg, ephemeral: true });
        } else {
            return ctx.channel.send(errorMsg);
        }
    }

    // Handle profile color purchase
    if (itemId === 'profile_color') {
        if (!colorHex) {
            const errorMsg = '❌ Please provide a color! Example: `/gemshop item:profile_color color:#FF0000`';
            if (ctx.reply) {
                return ctx.reply({ content: errorMsg, ephemeral: true });
            } else {
                return ctx.channel.send(errorMsg);
            }
        }

        // Validate hex color
        const hexPattern = /^#[0-9A-F]{6}$/i;
        if (!hexPattern.test(colorHex)) {
            const errorMsg = '❌ Invalid color! Use hex format like #FF0000';
            if (ctx.reply) {
                return ctx.reply({ content: errorMsg, ephemeral: true });
            } else {
                return ctx.channel.send(errorMsg);
            }
        }

        // Purchase
        dbManager.removeGems(serverId, userId, item.cost);
        dbManager.setProfileColor(serverId, userId, colorHex);
        dbManager.purchaseItem(serverId, userId, itemId, null, JSON.stringify({ color: colorHex }));

        const successMsg = `✅ Purchased **${item.name}**!\n🎨 Your XP card color is now ${colorHex}`;
        if (ctx.reply) {
            await ctx.reply(successMsg);
        } else {
            await ctx.channel.send(successMsg);
        }
        return;
    }

    // Handle boost purchases
    if (item.type === 'boost') {
        // Check if already have active boost of this type
        if (dbManager.hasActiveBoost(serverId, userId, itemId)) {
            const errorMsg = `❌ You already have an active **${item.name}**!`;
            if (ctx.reply) {
                return ctx.reply({ content: errorMsg, ephemeral: true });
            } else {
                return ctx.channel.send(errorMsg);
            }
        }

        // Purchase
        const expiresAt = Date.now() + item.duration;
        dbManager.removeGems(serverId, userId, item.cost);
        dbManager.purchaseItem(serverId, userId, itemId, expiresAt);

        const durationText = formatDuration(item.duration);
        const successMsg = `✅ Purchased **${item.name}**!\n⏱️ Active for **${durationText}**`;
        if (ctx.reply) {
            await ctx.reply(successMsg);
        } else {
            await ctx.channel.send(successMsg);
        }
        return;
    }
}

function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${Math.floor(ms / 60000)} minutes`;
}

function setup(client) {
    client.commands.set('gems', gems);
    client.commands.set('gem', gems);
    client.commands.set('balgem', gems);

    client.commands.set('gemshop', gemshop);
    client.commands.set('gemsshop', gemshop);
    client.commands.set('gemstop', gemstop);

    // Owner-only gem management commands
    client.commands.set('addgems', addgems);
    client.commands.set('givegems', addgems);
    client.commands.set('removegems', removegems);
    client.commands.set('takegems', removegems);
    client.commands.set('setgems', setgems);

    console.log('✅ Gem commands registered (including owner commands)');
}

module.exports = {
    gems,
    gemshop,
    addgems,
    removegems,
    setgems,
    gemstop,
    setup,
    GEM_SHOP // Export for use in other systems

};
