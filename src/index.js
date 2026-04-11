///////////////////////////////////////////////////////////////////////
//                    DISCORD BOT v1.0.4 - NODE.JS VERSION           //
///////////////////////////////////////////////////////////////////////

// Developed by @Orange225673
// Contributors: Huỳnh Gia Kiệt, Hoàng Thanh Trúc
// DISCORD OWNER: orange225673
// GITHUB: @orange225673

// Change the version here (for dev only DO NOT CHANGE)


// Note: Only change if got permission by Owner!
///////////////////////////////////////////////////////////////////////

// Main import
require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType, EmbedBuilder } = require('discord.js');


// Import configs
const config = require('./config');
const DatabaseManager = require('./utils/DatabaseManager');
const { checkSpam } = require('./utils/spamDetector');
const { setupSlashCommands } = require('./slashHandler');
const { deployCommands } = require('./deployCommands');

// Import systems
const economySystem = require('./systems/economySystem');
const mathSystem = require('./systems/mathSystem');
const pollSystem = require('./systems/pollSystem');
const reminderSystem = require('./systems/reminderSystem');
const xpSystem = require('./systems/xpSystem');
const helpers = require('./utils/helpers');

// Import command

const funCommands = require('./commands/funcom/fun');
const moderationCommands = require('./commands/moderator/moderation');
const statsCommands = require('./commands/economy/stats');
const adminCommands = require('./commands/admin');
const reminderCommands = require('./commands/reminder');
const pollCommands = require('./commands/poll');
const economyCommands = require('./commands/economy/economy');
const chessCommands = require('./commands/chess');
const minecraftCommands = require('./commands/minecraft');
const permissionCommands = require('./commands/moderator/permissions');
const codeCommands = require('./commands/code');
const mathCommands = require('./commands/math/math');
const gemsCommands = require('./commands/economy/gems');
const xpCommands = require('./commands/economy/xp');
const enablexpCommand = require('./commands/economy/enableXP');
const levelupCommand = require('./commands/levelup');
const calculatorCommand = require('./commands/calculator');
const musicCommands = require('./commands/music/commands');


// Initialize bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Initialize data manager
const dataManager = new DatabaseManager();

// Global variables
const afkUsers = new Map();
client.commands = new Collection();
client.dataManager = dataManager;
client.config = config;
client.afkUsers = afkUsers;

console.log('⚙️  Loading systems...');

// Setup slash command handler
setupSlashCommands(client);

// Load systems
economySystem.setup(client);
mathSystem.setup(client);
pollSystem.setup(client);
reminderSystem.setup(client);
xpSystem.setup(client);

// Initialize music player
const { initializePlayer } = require('./utils/musicPlayer/musicService');
initializePlayer(client);

console.log('⚙️  Loading commands...');

// Load commands
funCommands.setup(client, afkUsers);
moderationCommands.setup(client);
statsCommands.setup(client);
adminCommands.setup(client);
reminderCommands.setup = () => {
    client.commands.set('remindme', reminderCommands);
    client.commands.set('remind', reminderCommands);
    client.commands.set('reminder', reminderCommands);
};
reminderCommands.setup();
pollCommands.setup(client);
economyCommands.setup(client);
chessCommands.setup(client);
minecraftCommands.setup(client);
codeCommands.setup(client);
permissionCommands.setup(client);
mathCommands.setup(client);
gemsCommands.setup(client);
xpCommands.setup(client);
client.commands.set('enablexp', enablexpCommand);
client.commands.set('xpenable', enablexpCommand);
client.commands.set('levelup', levelupCommand);
client.commands.set('lvlup', levelupCommand);
client.commands.set('levelconfig', levelupCommand);
calculatorCommand.setup(client);
musicCommands.setup(client);

console.log('✅ All systems and commands loaded');

// ============ ON_READY EVENT ============
client.once('ready', async () => {
    console.log('='.repeat(50));
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📊 Connected to ${client.guilds.cache.size} server(s)`);
    console.log('='.repeat(50));

    // Load afk data
    const afkData = dataManager.getAllAFK();
    afkData.forEach(data => {
        // Key có thể là userId hoặc kết hợp serverId_userId tùy nhu cầu của bạn
        // Ở đây tôi dùng userId cho đơn giản giống logic cũ của bạn
        client.afkUsers.set(data.user_id, {
            reason: data.reason,
            time: data.timestamp,
            server: data.server_id
        });
    });
    console.log(`✅ Loaded {${afkData.length}} AFK users from Database`);

    // Preload chess piece images
    const { preloadPieceImages } = require('./systems/boardRenderer');
    await preloadPieceImages();

    // Generate invite link
    if (config.CLIENT_ID) {
        const permissions_interger = 8;
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${config.CLIENT_ID}&permissions=${permissions_interger}&scope=bot%20applications.commands`;

        console.log('');
        console.log('🔗 Bot Invite Link:');
        console.log('   Click this link to invite the bot to your server:');
        console.log(`   ${inviteLink}`);
        console.log('');
    }

    // Deploy slash commands if CLIENT_ID is set
    if (config.CLIENT_ID) {
        await deployCommands();
    }

    // Set bot status
    client.user.setActivity(`Watching ${client.guilds.cache.size} server(s)`,
        { type: ActivityType.Watching });

    // Ensure data folders for all guilds
    client.guilds.cache.forEach(guild => {
        dataManager.ensureServer(guild.id);
    });

    setInterval(() => {
        dataManager.cleanExpiredBoosts();
        console.log('Cleaned expired gem shop boosts');
    }, 3600000);

});

// ============ ON_GUILD_JOIN EVENT ============
client.on('guildCreate', async (guild) => {
    console.log(`👋 Joined new server: ${guild.name} (${guild.id})`);
    dataManager.ensureServer(guild.id);

    // Send DM to the server owner
    try {
        // Fetch owner from User API (more reliable than member cache)
        const ownerUser = await client.users.fetch(guild.ownerId);
        if (ownerUser) {
            const embed = new EmbedBuilder()
                .setTitle('🎉 Bot Added to Your Server!')
                .setDescription(`Thanks for inviting me to **${guild.name}**!`)
                .setColor(0xe94560)

            await ownerUser.send({ embeds: [embed] });
            console.log(`✅ DM sent to server owner: ${ownerUser.tag}`);
        }
    } catch (error) {
        console.warn(`⚠️ Could not DM owner (${guild.ownerId}):`, error.message);
    }
});


// ============ ON_MESSAGE EVENT ============
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;


    // 1. Kiểm tra người gửi đang AFK để gỡ bỏ
    if (client.afkUsers.has(message.author.id)) {
        const data = client.afkUsers.get(message.author.id);
        if (Math.floor(Date.now() / 1000) - data.time > 5) {

            client.afkUsers.delete(message.author.id); // Xóa khỏi Map
            dataManager.removeAFK(message.guild.id, message.author.id); // Xóa khỏi SQL

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setDescription(`👋 Welcome back ${message.author}! You were AFK <t:${data.time}:R>.`);

            message.reply({ embeds: [welcomeEmbed] }).then(m => setTimeout(() => m.delete().catch(() => { }), 10000));
        }
    }

    // 2. Thông báo khi có người bị nhắc tên (mention) đang AFK
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (user.id !== message.author.id && client.afkUsers.has(user.id)) {
                const data = client.afkUsers.get(user.id);

                const notifyEmbed = new EmbedBuilder()
                    .setColor('#f1c40f')
                    .setAuthor({ name: `${user.username} is AFK`, iconURL: user.displayAvatarURL() })
                    .setDescription(`💬 **Reason:** ${data.reason}\n⏰ **Since:** <t:${data.time}:R>`)

                message.reply({
                    embeds: [notifyEmbed],
                    allowedMentions: { repliedUser: false }
                });
            }
        });
    }

    // Anti-spam check
    const spamWarning = await checkSpam(message, client);
    if (spamWarning) return;

    // Record message in database (per guild)
    const dbManager = new DatabaseManager();
    dbManager.recordUserMessage(message.guild.id, message.author.id);

    // Economy - earn money per message
    await economySystem.onMessageEarnMoney(message);
    // XP - earn XP per message
    await xpSystem.onMessageXPGain(message, client);


    // Process commands
    if (!message.content.startsWith(config.COMMAND_PREFIX)) return;

    const args = message.content.slice(config.COMMAND_PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;



    // Check if command is enabled
    if (!dataManager.isCommandEnabled(message.guild.id, commandName)) {
        return message.reply('❌ This command is disabled on this server.');
    }

    // Execute command
    try {        // Use 'run' function for prefix commands if it exists, otherwise use 'execute'
        if (command.run && typeof command.run === 'function') {
            await command.run(message, args, client, config);
        } else if (command.execute && typeof command.execute === 'function') {
            await command.execute(message, args, client);
        } else {
            console.error(`Command ${commandName} has no run or execute function`);
            return message.reply('❌ Command not properly implemented.');
        }
    } catch (error) {
        console.error(`❌ Error executing command ${commandName}:`, error);
        message.reply('❌ An error occurred while executing that command.');
    }
});

// Handle chess moves outside commands
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild || message.content.startsWith(config.COMMAND_PREFIX)) return;

    try {
        const { handleChessMove } = require('./commands/chess');
        await handleChessMove(message, client);
    } catch (error) {
        console.error('Chess move error:', error.message);
    }
});
// ======================== MESSAGE_DELETE ===================
client.snipes = new Map();
client.on('messageDelete', (message) => {
    if (message.partial || message.author?.bot) return; // Bỏ qua tin nhắn cũ hoặc của bot

    let snipes = client.snipes.get(message.channel.id) || [];

    // Thêm tin nhắn mới vào đầu mảng
    snipes.unshift({
        content: message.content,
        author: message.author,
        image: message.attachments.first()?.proxyURL,
        timestamp: message.createdAt
    });

    // Giới hạn chỉ lưu 99 tin nhắn gần nhất
    if (snipes.length > 99) snipes.pop();

    client.snipes.set(message.channel.id, snipes);
});

// ============ ON_MEMBER_JOIN EVENT ============
client.on('guildMemberAdd', async (member) => {
    dataManager.updateAnalytics(member.guild.id, 'join', member.guild.memberCount)
    console.log(`👋 ${member.user.tag} joined ${member.guild.name}`);

    const config = dataManager.getGuildMsgs(member.guild.id);
    if (config?.welcome_channel && config?.welcome_message) {
        const channel = member.guild.channels.cache.get(config.welcome_channel);
        if (channel) channel.send(helpers.formatMsg(config.welcome_message, member)).catch(() => { });
    }
});

// ============ ON_MEMBER_REMOVE EVENT ============
client.on('guildMemberRemove', async (member) => {
    dataManager.updateAnalytics(member.guild.id, 'leave', member.guild.memberCount);
    console.log(`👋 ${member.user.tag} left ${member.guild.name}`);

    const config = dataManager.getGuildMsgs(member.guild.id);
    if (config?.leave_channel && config?.leave_message) {
        const channel = member.guild.channels.cache.get(config.leave_channel);
        if (channel) channel.send(helpers.formatMsg(config.leave_message, member)).catch(() => { });
    }
});

// ============ ON_REACTION_ADD EVENT ============
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    // Poll system reactions
    await pollSystem.onReactionAdd(reaction, user);
});

// ============ ON_INTERACTION_CREATE EVENT ============
client.on('interactionCreate', async (interaction) => {
    // Handle chess button interactions
    if (interaction.isButton() && interaction.customId.startsWith('chess_')) {
        const { handleInteraction } = require('./commands/chess');
        await handleInteraction(interaction, client);
    }

});

// ============ ERROR HANDLERS ============
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

// ============ START BOT ============

const startBot = () => {
    console.log('Starting Discord Bot...');

    setTimeout(async () => {
        try {
            await client.login(config.DISCORD_TOKEN);
            console.log("Login request sent successfully!");
        } catch (err) {
            console.error("Login failed:", err.message);
            process.exit(1);
        }
    }, 1000);
};

startBot();

