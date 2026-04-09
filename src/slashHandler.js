///////////////////////////////////////////////////////////////////////
//                    SLASH COMMAND HANDLER                           //
///////////////////////////////////////////////////////////////////////

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { formatNumber, parseTime, formatTime, isOwner, randomInt } = require('./utils/helpers');
const DataManager = require('./utils/dataManager');
const DatabaseManager = require('./utils/DatabaseManager');
const { Easy, Hard } = require('./systems/mathProblems');

const dataManager = new DataManager();
const dbManager = new DatabaseManager();

function setupSlashCommands(client) {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const { commandName, options } = interaction;

        try {
            // ============ DAILY COMMAND ============
            if (commandName === 'daily') {
                const lastDaily = dbManager.getDailyCooldown(interaction.guild.id, interaction.user.id);
                const now = Date.now();
                const cooldownTime = 86400000; // 24 hours

                if (lastDaily && (now - lastDaily) < cooldownTime) {
                    const timeLeft = cooldownTime - (now - lastDaily);
                    const hours = Math.floor(timeLeft / 3600000);
                    const minutes = Math.floor((timeLeft % 3600000) / 60000);
                    return interaction.reply(`⏰ You already claimed your daily! Try again in ${hours}h ${minutes}m`);
                }

                // Give reward
                const reward = randomInt(10000, 500000);
                dbManager.addUserBalance(interaction.guild.id, interaction.user.id, reward);
                dbManager.setDailyCooldown(interaction.guild.id, interaction.user.id, now);

                await interaction.reply(`🎁 You claimed your daily reward of **$${reward.toLocaleString()}**!`);
            }

            // ============ WORK COMMAND ============
            else if (commandName === 'work') {
                const jobs = [
                    'mowed lawns', 'washed dishes', 'delivered pizzas',
                    'coded websites', 'wrote articles', 'taught classes'
                ];
                const job = jobs[Math.floor(Math.random() * jobs.length)];
                const earned = randomInt(5000, 2500000);

                dataManager.addUserBalance(interaction.guild.id, interaction.user.id, earned);

                await interaction.reply(`💼 You ${job} and earned **$${formatNumber(earned)}**!`);
            }

            // ============ GAMBLE COMMAND ============
            else if (commandName === 'gamble') {
                const amountStr = options.getString('amount');
                const balance = dataManager.getUserBalance(interaction.guild.id, interaction.user.id);

                let betAmount = amountStr.toLowerCase() === 'all' ? balance : parseInt(amountStr);

                if (isNaN(betAmount) || betAmount < 10000) {
                    return await interaction.reply('❌ Minimum bet is **$10,000**!');
                }

                if (betAmount > balance) {
                    return await interaction.reply(`❌ You only have **$${formatNumber(balance)}**!`);
                }

                // Simple gambling
                const win = Math.random() > 0.5;
                const multiplier = win ? 2 : -1;
                const winAmount = Math.floor(betAmount * multiplier);

                dataManager.setUserBalance(
                    interaction.guild.id,
                    interaction.user.id,
                    balance + winAmount
                );

                const emoji = win ? '✨' : '💸';
                const result = win ? 'You won!' : 'You lost!';

                await interaction.reply(
                    `${emoji} **Gambling Result** ${emoji}\n\n` +
                    `${result}\n` +
                    `Bet: **$${formatNumber(betAmount)}**\n` +
                    `Result: **${multiplier > 0 ? '+' : ''}$${formatNumber(winAmount)}**\n` +
                    `New Balance: **$${formatNumber(balance + winAmount)}**`
                );
            }

            // ============ GIVE COMMAND ============
            else if (commandName === 'give') {
                const target = options.getUser('user');
                const amount = options.getInteger('amount');

                if (target.id === interaction.user.id) {
                    return await interaction.reply('❌ You can\'t give money to yourself!');
                }

                if (target.bot) {
                    return await interaction.reply('❌ You can\'t give money to bots!');
                }

                const balance = dataManager.getUserBalance(interaction.guild.id, interaction.user.id);
                if (amount > balance) {
                    return await interaction.reply(`❌ You only have **$${formatNumber(balance)}**!`);
                }

                dataManager.addUserBalance(interaction.guild.id, interaction.user.id, -amount);
                dataManager.addUserBalance(interaction.guild.id, target.id, amount);

                await interaction.reply(`💸 You gave **$${formatNumber(amount)}** to **${target.username}**!`);
            }

            // ============ LEADERBOARD COMMAND ============
            else if (commandName === 'leaderboard') {
                const economy = dataManager.getEconomy(interaction.guild.id);
                const sorted = Object.entries(economy).sort((a, b) => b[1] - a[1]).slice(0, 10);

                if (sorted.length === 0) {
                    return await interaction.reply('📭 No one has any money yet!');
                }

                let text = '**💰 Richest Users**\n\n';
                for (let i = 0; i < sorted.length; i++) {
                    const [userId, balance] = sorted[i];
                    const user = await client.users.fetch(userId).catch(() => null);
                    const name = user ? user.username : 'Unknown User';
                    text += `\`#${i + 1}\` **${name}**: $${formatNumber(balance)}\n`;
                }

                await interaction.reply(text);
            }

            // ============ ME COMMAND ============
            else if (commandName === 'me') {
                const target = options.getUser('user') || interaction.user;
                const stats = dbManager.getUserStats(interaction.guild.id, target.id);

                const embed = new EmbedBuilder()
                    .setTitle(`📊 Stats: ${target.username}`)
                    .setThumbnail(target.displayAvatarURL())
                    .setColor(0x00FFFF)
                    .addFields(
                        { name: 'Daily Messages', value: `\`${formatNumber(stats.daily_messages || 0)}\``, inline: true },
                        { name: 'Total Messages', value: `\`${formatNumber(stats.total_messages || 0)}\``, inline: true }
                    )
                    .setFooter({ text: 'Keep chatting to increase your giveaway chances!' });

                await interaction.reply({ embeds: [embed] });
            }

            // ============ TOPTOTAL COMMAND ============
            else if (commandName === 'toptotal') {
                const topUsers = dbManager.getTopMessageSenders(interaction.guild.id, 10);

                if (topUsers.length === 0) {
                    return await interaction.reply('💭 Leaderboard is empty!');
                }

                const embed = new EmbedBuilder()
                    .setTitle('🏆 All-Time Leaderboard')
                    .setColor(0xFFD700);

                let description = '';
                for (let i = 0; i < topUsers.length; i++) {
                    const { user_id, total_messages } = topUsers[i];
                    const user = await client.users.fetch(user_id).catch(() => null);
                    const name = user ? user.username : 'Unknown User';
                    description += `\`#${i + 1}\` **${name}**: ${formatNumber(total_messages)} msgs\n`;
                }

                embed.setDescription(description);
                await interaction.reply({ embeds: [embed] });
            }

            // ============ TOPDAILY COMMAND ============
            else if (commandName === 'topdaily') {
                const topDaily = dbManager.getTopDailyMessageSenders(interaction.guild.id, 10);

                if (topDaily.length === 0) {
                    return await interaction.reply('💭 Leaderboard is empty!');
                }

                const embed = new EmbedBuilder()
                    .setTitle('🔥 Daily Leaderboard')
                    .setColor(0xFF4500);

                let description = '';
                for (let i = 0; i < topDaily.length; i++) {
                    const { user_id, daily_messages } = topDaily[i];
                    const user = await client.users.fetch(user_id).catch(() => null);
                    const name = user ? user.username : 'Unknown User';
                    description += `\`#${i + 1}\` **${name}**: ${formatNumber(daily_messages)} msgs\n`;
                }

                embed.setDescription(description);
                await interaction.reply({ embeds: [embed] });
            }
            // ============ MATH COMMAND ============
            else if (commandName === 'math') {

            }

            // ============ POLL COMMAND ============
            else if (commandName === 'poll') {
                const question = options.getString('question');
                const opts = [];

                for (let i = 1; i <= 5; i++) {
                    const opt = options.getString(`option${i}`);
                    if (opt) opts.push(opt);
                }

                const reactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
                const embed = new EmbedBuilder()
                    .setTitle(`📊 ${question}`)
                    .setColor(0x00D4FF)
                    .setFooter({ text: `Poll by ${interaction.user.username}` })
                    .setTimestamp();

                let description = '';
                for (let i = 0; i < opts.length; i++) {
                    description += `${reactions[i]} ${opts[i]}\n`;
                }
                embed.setDescription(description);

                const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

                for (let i = 0; i < opts.length; i++) {
                    await msg.react(reactions[i]);
                }
            }

            // ============ REMIND COMMAND ============
            else if (commandName === 'remind') {
                const time = options.getString('time');
                const message = options.getString('message');

                const timeMs = parseTime(time);
                if (!timeMs) {
                    return await interaction.reply('❌ Invalid time format! Use: 10s, 5m, 1h, 2d');
                }

                await interaction.reply(`⏰ Reminder set! I'll remind you in **${formatTime(timeMs)}**`);

                setTimeout(async () => {
                    try {
                        await interaction.user.send(
                            `⏰ **Reminder**\n\n${message}\n\n` +
                            `Set in **${interaction.guild.name}**`
                        );
                    } catch {
                        interaction.channel.send(`⏰ ${interaction.user}, reminder: ${message}`);
                    }
                }, timeMs);
            }

            // ============ PING COMMAND ============
            else if (commandName === 'ping') {
                const latency = Date.now() - interaction.createdTimestamp;
                const apiLatency = Math.round(client.ws.ping);

                await interaction.reply(
                    `🏓 Pong!\n` +
                    `📡 Latency: **${latency}ms**\n` +
                    `💓 API Latency: **${apiLatency}ms**`
                );
            }

            // ============ AFK COMMAND ============
            else if (commandName === 'afk') {
                const reason = options.getString('reason') || 'AFK';
                const timestamp = Math.floor(Date.now() / 1000);

                // Get afkUsers from client (passed from index.js)
                if (!client.afkUsers) {
                    client.afkUsers = new Map();
                }

                client.afkUsers.set(interaction.user.id, {
                    reason: reason,
                    time: timestamp
                });

                try {
                    await interaction.member.setNickname(`[AFK] ${interaction.member.displayName}`);
                } catch (error) {
                    // No permission to change nickname
                }

                await interaction.reply(
                    `✅ You are now AFK: **${reason}**\n` +
                    `I'll notify others when they mention you!`
                );
            }

            // ============ GIVEAWAY COMMANDS ============
            else if (commandName === 'giveaway-start') {
                // Check permissions
                const hasPermission =
                    interaction.user.id === '972306366599397427' || // Full access user
                    interaction.user.id === client.config.OWNER_ID || // Bot owner
                    interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) || // Manage Server
                    (interaction.guild.id === '1360887797417902310' && // Special server
                        (interaction.member.roles.cache.has('1389454897669214358') ||
                            interaction.member.roles.cache.has('1389470511381348352'))); // Required roles

                if (!hasPermission) {
                    return await interaction.reply({ content: '❌ Admin/Owner only!', ephemeral: true });
                }

                const duration = options.getString('duration');
                const claimTime = options.getString('claim_time');
                const winners = options.getInteger('winners');
                const host = options.getUser('host');
                const prize = options.getString('prize');
                const totalMsgs = options.getInteger('total_messages') || 0;
                const dailyMsgs = options.getInteger('daily_messages') || 0;
                const requiredRole = options.getRole('required_role');
                const bypassRole = options.getRole('bypass_role');

                const { parseTime, formatTime } = require('./utils/helpers');
                const { getExtraEntries, createGiveawayEmbed } = require('./systems/giveaway/core');
                const { activeGiveaways } = require('./systems/giveaway/core');

                const durationMs = parseTime(duration);
                if (!durationMs || durationMs < 60000) {
                    return await interaction.reply({ content: '❌ Invalid duration! Min 1m', ephemeral: true });
                }

                const claimMs = parseTime(claimTime);
                if (!claimMs || claimMs < 60000) {
                    return await interaction.reply({ content: '❌ Invalid claim time! Min 1m', ephemeral: true });
                }

                if (winners < 1 || winners > 20) {
                    return await interaction.reply({ content: '❌ Winners must be 1-20!', ephemeral: true });
                }

                const endTime = new Date(Date.now() + durationMs);
                const extraEntries = getExtraEntries(interaction.guild.id);

                const giveawayData = {
                    prize,
                    winners,
                    host_id: host.id,
                    channel_id: interaction.channel.id,
                    guild_id: interaction.guild.id,
                    end_time: endTime.toISOString(),
                    claim_time: Math.floor(claimMs / 1000),
                    requirements: {
                        role: requiredRole ? requiredRole.id : 'None',
                        bypass: bypassRole ? bypassRole.id : 'None',
                        total_messages: totalMsgs,
                        daily_messages: dailyMsgs
                    },
                    extra_entries: extraEntries,
                    message_id: null
                };

                const embed = await createGiveawayEmbed(giveawayData, 'ACTIVE');
                const giveawayMessage = await interaction.channel.send({ embeds: [embed] });
                await giveawayMessage.react('🎉');

                giveawayData.message_id = giveawayMessage.id;

                // Save to SQLite database
                dbManager.createGiveaway(
                    interaction.guild.id,
                    giveawayMessage.id,
                    interaction.channel.id,
                    prize,
                    winners,
                    new Date(endTime).getTime(),
                    host.id,
                    Math.floor(claimMs / 1000),
                    giveawayData.requirements,
                    giveawayData.extra_entries
                );

                if (!activeGiveaways.has(interaction.guild.id.toString())) {
                    activeGiveaways.set(interaction.guild.id.toString(), new Map());
                }
                activeGiveaways.get(interaction.guild.id.toString()).set(giveawayMessage.id, giveawayData);

                await interaction.reply({ content: `✅ Giveaway started! Ends in **${formatTime(durationMs)}**`, ephemeral: true });

                // Schedule giveaway end
                const { endGiveaway } = require('./systems/giveaway/core');
                setTimeout(async () => {
                    await endGiveaway(client, interaction.guild.id, giveawayMessage.id);
                }, durationMs);
            }

            else if (commandName === 'giveaway-delete') {
                // Check permissions
                const hasPermission =
                    interaction.user.id === '972306366599397427' ||
                    interaction.user.id === client.config.OWNER_ID ||
                    interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                    (interaction.guild.id === '1360887797417902310' &&
                        (interaction.member.roles.cache.has('1389454897669214358') ||
                            interaction.member.roles.cache.has('1389470511381348352')));

                if (!hasPermission) {
                    return await interaction.reply({ content: '❌ Admin/Owner only!', ephemeral: true });
                }

                const messageId = options.getString('message_id');
                const reason = options.getString('reason');

                const data = dataManager.loadFile(interaction.guild.id, 'giveaway_data.json');

                if (!data.giveaways || !data.giveaways[messageId]) {
                    return await interaction.reply({ content: '❌ Giveaway not found!', ephemeral: true });
                }

                const giveaway = data.giveaways[messageId];

                try {
                    const channel = interaction.guild.channels.cache.get(giveaway.channel_id.toString());
                    const giveawayMsg = await channel.messages.fetch(messageId);
                    await giveawayMsg.delete();
                } catch (error) {
                    // Message already deleted
                }

                delete data.giveaways[messageId];
                dataManager.saveFile(interaction.guild.id, 'giveaway_data.json', data);

                const { activeGiveaways } = require('./systems/giveaway/core');
                if (activeGiveaways.has(interaction.guild.id.toString())) {
                    activeGiveaways.get(interaction.guild.id.toString()).delete(parseInt(messageId));
                }

                await interaction.reply(`✅ Giveaway deleted! Reason: ${reason}`);
            }

            else if (commandName === 'giveaway-done') {
                // Check permissions
                const hasPermission =
                    interaction.user.id === '972306366599397427' ||
                    interaction.user.id === client.config.OWNER_ID ||
                    interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                    (interaction.guild.id === '1360887797417902310' &&
                        (interaction.member.roles.cache.has('1389454897669214358') ||
                            interaction.member.roles.cache.has('1389470511381348352')));

                if (!hasPermission) {
                    return await interaction.reply({ content: '❌ Admin/Owner only!', ephemeral: true });
                }

                const messageId = options.getString('message_id');
                const winner = options.getUser('winner');

                const data = dataManager.loadFile(interaction.guild.id, 'giveaway_data.json');

                if (!data.giveaways || !data.giveaways[messageId]) {
                    return await interaction.reply({ content: '❌ Giveaway not found!', ephemeral: true });
                }

                const giveaway = data.giveaways[messageId];
                giveaway.claimed = true;
                giveaway.reroll_enabled = false;
                giveaway.claimed_by = winner.id;
                giveaway.claimed_at = new Date().toISOString();

                data.giveaways[messageId] = giveaway;
                dataManager.saveFile(interaction.guild.id, 'giveaway_data.json', data);

                await interaction.reply(`✅ Giveaway marked as claimed by ${winner}!`);
            }

            else if (commandName === 'giveaway-reroll') {
                // Check permissions
                const hasPermission =
                    interaction.user.id === '972306366599397427' ||
                    interaction.user.id === client.config.OWNER_ID ||
                    interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                    (interaction.guild.id === '1360887797417902310' &&
                        (interaction.member.roles.cache.has('1389454897669214358') ||
                            interaction.member.roles.cache.has('1389470511381348352')));

                if (!hasPermission) {
                    return await interaction.reply({ content: '❌ Admin/Owner only!', ephemeral: true });
                }

                const messageId = parseInt(options.getString('message_id'));
                const { rerollGiveaway } = require('./systems/giveaway/core');

                const result = await rerollGiveaway(client, interaction.guild.id, messageId);

                if (result.success) {
                    await interaction.reply(`✅ Rerolled! New winner: ${result.message}`);
                } else {
                    await interaction.reply(`❌ Failed: ${result.message}`);
                }
            }

            else if (commandName === 'giveaway-set-ext') {
                // Check permissions
                const hasPermission =
                    interaction.user.id === '972306366599397427' ||
                    interaction.user.id === client.config.OWNER_ID ||
                    interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                    (interaction.guild.id === '1360887797417902310' &&
                        (interaction.member.roles.cache.has('1389454897669214358') ||
                            interaction.member.roles.cache.has('1389470511381348352')));

                if (!hasPermission) {
                    return await interaction.reply({ content: '❌ Admin/Owner only!', ephemeral: true });
                }

                const role = options.getRole('role');
                const multiplier = options.getInteger('multiplier');

                if (multiplier < 1 || multiplier > 10) {
                    return await interaction.reply({ content: '❌ Multiplier must be 1-10!', ephemeral: true });
                }

                const data = dataManager.loadFile(interaction.guild.id, 'giveaway_data.json');

                if (!data.guild_config) data.guild_config = {};
                if (!data.guild_config.extra_entry_roles) data.guild_config.extra_entry_roles = {};

                data.guild_config.extra_entry_roles[role.id] = multiplier;
                dataManager.saveFile(interaction.guild.id, 'giveaway_data.json', data);

                await interaction.reply(`✅ ${role} now gets **${multiplier}x** entries in giveaways!`);
            }

            else if (commandName === 'giveaway-remove-ext') {
                // Check permissions
                const hasPermission =
                    interaction.user.id === '972306366599397427' ||
                    interaction.user.id === client.config.OWNER_ID ||
                    interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
                    (interaction.guild.id === '1360887797417902310' &&
                        (interaction.member.roles.cache.has('1389454897669214358') ||
                            interaction.member.roles.cache.has('1389470511381348352')));

                if (!hasPermission) {
                    return await interaction.reply({ content: '❌ Admin/Owner only!', ephemeral: true });
                }

                const role = options.getRole('role');

                const data = dataManager.loadFile(interaction.guild.id, 'giveaway_data.json');

                if (!data.guild_config?.extra_entry_roles?.[role.id]) {
                    return await interaction.reply({ content: '❌ This role doesn\'t have extra entries!', ephemeral: true });
                }

                delete data.guild_config.extra_entry_roles[role.id];
                dataManager.saveFile(interaction.guild.id, 'giveaway_data.json', data);

                await interaction.reply(`✅ Removed extra entries from ${role}`);
            }

            else if (commandName === 'giveaway-list-ext') {
                const { getExtraEntries } = require('./systems/giveaway/core');
                const extraEntries = getExtraEntries(interaction.guild.id);

                if (Object.keys(extraEntries).length === 0) {
                    return await interaction.reply('📭 No extra entry roles configured!');
                }

                let text = '**🎁 Extra Entry Roles**\n\n';
                for (const [roleId, multiplier] of Object.entries(extraEntries)) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    if (role) {
                        text += `${role}: ${multiplier}x entries\n`;
                    }
                }

                await interaction.reply(text);
            }

            // ============ 8BALL COMMAND ============
            else if (commandName === '8ball') {
                const responses = [
                    'Yes, definitely!', 'It is certain.', 'Without a doubt.',
                    'You may rely on it.', 'As I see it, yes.', 'Most likely.',
                    'Outlook good.', 'Signs point to yes.', 'Reply hazy, try again.',
                    'Ask again later.', 'Better not tell you now.', 'Cannot predict now.',
                    'Concentrate and ask again.', 'Don\'t count on it.', 'My reply is no.',
                    'My sources say no.', 'Outlook not so good.', 'Very doubtful.'
                ];

                const answer = responses[Math.floor(Math.random() * responses.length)];
                await interaction.reply(`🎱 ${answer}`);
            }

            // ============ ROLL COMMAND ============
            else if (commandName === 'roll') {
                const sides = options.getInteger('sides') || 6;
                const result = Math.floor(Math.random() * sides) + 1;
                await interaction.reply(`🎲 You rolled a **${result}** (1-${sides})`);
            }

            // ============ FLIP COMMAND ============
            else if (commandName === 'flip') {
                const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
                await interaction.reply(`🪙 ${result}!`);
            }

            // ============ MODERATION COMMANDS ============
            else if (commandName === 'kick') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
                    return await interaction.reply({ content: '❌ You don\'t have permission!', ephemeral: true });
                }

                const target = options.getMember('user');
                const reason = options.getString('reason') || 'No reason';

                await target.kick(reason);
                await interaction.reply(`✅ Kicked **${target.user.tag}** | Reason: ${reason}`);
            }

            else if (commandName === 'ban') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                    return await interaction.reply({ content: '❌ You don\'t have permission!', ephemeral: true });
                }

                const target = options.getMember('user');
                const reason = options.getString('reason') || 'No reason';

                await target.ban({ reason });
                await interaction.reply(`✅ Banned **${target.user.tag}** | Reason: ${reason}`);
            }

            else if (commandName === 'timeout') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return await interaction.reply({ content: '❌ You don\'t have permission!', ephemeral: true });
                }

                const target = options.getMember('user');
                const duration = options.getString('duration');
                const reason = options.getString('reason') || 'No reason';

                const durationMs = parseTime(duration);
                if (!durationMs) {
                    return await interaction.reply('❌ Invalid duration!');
                }

                await target.timeout(durationMs, reason);
                await interaction.reply(`✅ Timed out **${target.user.tag}** for ${duration}`);
            }

            else if (commandName === 'clear') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    return await interaction.reply({ content: '❌ You don\'t have permission!', ephemeral: true });
                }

                const amount = options.getInteger('amount');
                await interaction.channel.bulkDelete(amount, true);
                await interaction.reply({ content: `✅ Deleted **${amount}** messages!`, ephemeral: true });
            }

            // ============ AI COMMANDS ============
            else if (commandName === 'minecraft') {
                const aiCommands = require('./commands/ai');
                await aiCommands.minecraft.execute(interaction, client, client.config);
            }

            else if (commandName === 'mathhelper') {
                const aiCommands = require('./commands/ai');
                await aiCommands.mathhelper.execute(interaction, client, client.config);
            }

            else if (commandName === 'chemistryhelper') {
                const aiCommands = require('./commands/ai');
                await aiCommands.chemistryhelper.execute(interaction, client, client.config);
            }

            else if (commandName === 'physichelper') {
                const aiCommands = require('./commands/ai');
                await aiCommands.physicshelper.execute(interaction, client, client.config);
            }

            else if (commandName === 'codinghelper') {
                const aiCommands = require('./commands/ai');
                await aiCommands.codinghelper.execute(interaction, client, client.config);
            }

            // ============ REMINDER COMMAND ============
            else if (commandName === 'remindme') {
                const reminderCommands = require('./commands/reminder');
                await reminderCommands.execute(interaction, client, client.config);
            }

            // ============ ECONOMY COMMANDS ============
            else if (commandName === 'gbl') {
                const economyCommands = require('./commands/economy');
                await economyCommands.gamble.execute(interaction, client, client.config);
            }

            else if (commandName === 'bal') {
                const economyCommands = require('./commands/economy');
                await economyCommands.balance.execute(interaction, client, client.config);
            }

            else if (commandName === 'baltop') {
                const economyCommands = require('./commands/economy');
                await economyCommands.baltop.execute(interaction, client, client.config);
            }

            else if (commandName === 'topglobal') {
                const economyCommands = require('./commands/economy');
                await economyCommands.topglobal.execute(interaction, client, client.config);
            }

            // ============ CHESS COMMANDS ============
            else if (commandName === 'chess') {
                const opponent = options.getUser('opponent');
                const minutes = options.getInteger('minutes') || 10;

                if (opponent.id === interaction.user.id) {
                    return await interaction.reply({ content: '❌ You cannot play against yourself!', ephemeral: true });
                }

                if (opponent.bot) {
                    return await interaction.reply({ content: '❌ You cannot play against bots!', ephemeral: true });
                }

                if (minutes < 1 || minutes > 60) {
                    return await interaction.reply({ content: '❌ Time must be between 1-60 minutes!', ephemeral: true });
                }

                const { createPendingGame } = require('./systems/chessManager');
                const durationMs = minutes * 60000;
                createPendingGame(interaction.user.id, opponent.id, durationMs);

                await interaction.reply(`♟️ Chess challenge sent to ${opponent}!\nThey should type: \`%chess confirm @${interaction.user.username}\``);
            }

            else if (commandName === 'board') {
                const { getGameByPlayer } = require('./systems/chessManager');
                const { renderBoard } = require('./systems/boardRenderer');
                const { formatTime } = require('./systems/chessManager');
                const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

                const game = getGameByPlayer(interaction.user.id);
                if (!game) {
                    return await interaction.reply({ content: '❌ You are not in an active chess game!', ephemeral: true });
                }

                const flipped = game.chess.turn() === 'b';
                const boardImage = await renderBoard(game.chess.fen(), game.lastMove, flipped);
                const turn = game.chess.turn() === 'w' ? 'White' : 'Black';
                const currentPlayer = game.chess.turn() === 'w' ? game.players.white : game.players.black;

                const embed = new EmbedBuilder()
                    .setTitle('♟️ Current Board')
                    .setColor(game.chess.turn() === 'w' ? 0xFFFFFF : 0x000000)
                    .addFields(
                        { name: '⚪ White Time', value: formatTime(game.clocks.white), inline: true },
                        { name: '⚫ Black Time', value: formatTime(game.clocks.black), inline: true },
                        { name: '🎯 Turn', value: `${turn} <@${currentPlayer}>`, inline: true }
                    )
                    .setImage('attachment://board.png');

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('chess_resign')
                            .setLabel('Resign')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('chess_draw')
                            .setLabel('Offer Draw')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.reply({
                    embeds: [embed],
                    components: [buttons],
                    files: [{ attachment: boardImage, name: 'board.png' }]
                });
            }

            else if (commandName === 'chesstotal') {
                const { getServerLeaderboard } = require('./systems/chessElo');
                const leaderboard = getServerLeaderboard(interaction.guild.id, 10);

                if (leaderboard.length === 0) {
                    return await interaction.reply('📊 No rated players yet! Play 5 games to get rated.');
                }

                const embed = new EmbedBuilder()
                    .setTitle(`♟️ ${interaction.guild.name} - Chess Leaderboard`)
                    .setColor(0xFFD700)
                    .setDescription('*Top 10 players (minimum 5 games)*')
                    .setTimestamp();

                leaderboard.forEach((player, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    embed.addFields({
                        name: `${medal} <@${player.userId}>`,
                        value: `**ELO:** ${player.elo} | **W/L/D:** ${player.wins}/${player.losses}/${player.draws} | **WR:** ${player.winRate}%`,
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [embed] });
            }

            else if (commandName === 'chessglobal') {
                const { getGlobalLeaderboard } = require('./systems/chessElo');
                const leaderboard = getGlobalLeaderboard(10);

                if (leaderboard.length === 0) {
                    return await interaction.reply('📊 No rated players yet! Play 5 games to get rated.');
                }

                const embed = new EmbedBuilder()
                    .setTitle('🌍 Global Chess Leaderboard')
                    .setColor(0x5865F2)
                    .setDescription('*Top 10 players worldwide (minimum 5 games)*')
                    .setTimestamp();

                leaderboard.forEach((player, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    embed.addFields({
                        name: `${medal} <@${player.userId}>`,
                        value: `**ELO:** ${player.elo} | **Games:** ${player.games} | **Servers:** ${player.servers} | **WR:** ${player.winRate}%`,
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [embed] });
            }

            else if (commandName === 'chesselo') {
                const { getPlayerStats, PROVISIONAL_GAMES } = require('./systems/chessElo');
                const userId = options.getUser('user')?.id || interaction.user.id;
                const stats = getPlayerStats(interaction.guild.id, userId);

                const embed = new EmbedBuilder()
                    .setTitle(`♟️ Chess Stats - <@${userId}>`)
                    .setColor(0x00FF00)
                    .setTimestamp();

                // Server stats
                if (stats.server.games < PROVISIONAL_GAMES) {
                    embed.addFields({
                        name: `📊 ${interaction.guild.name} Stats`,
                        value: `**Status:** Provisional (${stats.server.games}/${PROVISIONAL_GAMES} games)\n**Games:** ${stats.server.games} | **W/L/D:** ${stats.server.wins}/${stats.server.losses}/${stats.server.draws}\n*Play ${PROVISIONAL_GAMES - stats.server.games} more games to get rated!*`,
                        inline: false
                    });
                } else {
                    embed.addFields({
                        name: `📊 ${interaction.guild.name} Stats`,
                        value: `**ELO:** ${stats.server.elo}\n**Games:** ${stats.server.games} | **W/L/D:** ${stats.server.wins}/${stats.server.losses}/${stats.server.draws}\n**Win Rate:** ${stats.server.winRate}%`,
                        inline: false
                    });
                }

                // Global stats
                if (stats.global.games < PROVISIONAL_GAMES) {
                    embed.addFields({
                        name: '🌍 Global Stats',
                        value: `**Status:** Provisional (${stats.global.games}/${PROVISIONAL_GAMES} games)\n**Games:** ${stats.global.games} | **Servers:** ${stats.global.servers}\n*Play ${PROVISIONAL_GAMES - stats.global.games} more games to get rated!*`,
                        inline: false
                    });
                } else {
                    embed.addFields({
                        name: '🌍 Global Stats',
                        value: `**ELO:** ${stats.global.elo}\n**Games:** ${stats.global.games} | **Servers:** ${stats.global.servers}\n**Win Rate:** ${stats.global.winRate}%`,
                        inline: false
                    });
                }

                await interaction.reply({ embeds: [embed] });
            }

            // ============ PERMISSION COMMANDS ============
            else if (commandName === 'membercount') {
                // Permission check (optional - remove if everyone should use it)
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return await interaction.reply({ content: '❌ No permission!', ephemeral: true });
                }

                try {
                    const guild = interaction.guild; // ✅ Fixed: was message.guild

                    // Get member counts
                    const totalMembers = guild.memberCount;
                    const humanMembers = guild.members.cache.filter(member => !member.user.bot).size;
                    const botMembers = guild.members.cache.filter(member => member.user.bot).size;

                    // Get online members (requires presence intent)
                    const onlineMembers = guild.members.cache.filter(
                        member => member.presence?.status === 'online' ||
                            member.presence?.status === 'idle' ||
                            member.presence?.status === 'dnd'
                    ).size;

                    // Get role with most members
                    const topRole = guild.roles.cache
                        .filter(role => role.id !== guild.id) // Exclude @everyone
                        .sort((a, b) => b.members.size - a.members.size)
                        .first();

                    // Create embed
                    const embed = new EmbedBuilder()
                        .setTitle(`👥 ${guild.name} - Member Statistics`)
                        .setColor(0x5865F2)
                        .setThumbnail(guild.iconURL({ dynamic: true }))
                        .addFields(
                            {
                                name: '📊 Total Members',
                                value: `\`${totalMembers}\``,
                                inline: true
                            },
                            {
                                name: '👤 Humans',
                                value: `\`${humanMembers}\``,
                                inline: true
                            },
                            {
                                name: '🤖 Bots',
                                value: `\`${botMembers}\``,
                                inline: true
                            },
                            {
                                name: '🟢 Online',
                                value: `\`${onlineMembers || 'N/A'}\``,
                                inline: true
                            },
                            {
                                name: '📈 Bot %',
                                value: `\`${((botMembers / totalMembers) * 100).toFixed(1)}%\``,
                                inline: true
                            },
                            {
                                name: '👑 Top Role',
                                value: topRole ? `${topRole} (${topRole.members.size} members)` : 'None',
                                inline: true
                            }
                        )
                        .setFooter({
                            text: `Server created • ${guild.createdAt.toLocaleDateString()}`
                        })
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] }); // ✅ Fixed: was message.reply

                } catch (error) {
                    console.error('Error in membercount command:', error);
                    await interaction.reply({ content: '❌ Failed to fetch member statistics!', ephemeral: true }); // ✅ Fixed
                }
            }

            else if (commandName === 'whitelist-add') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return await interaction.reply({ content: '❌ Admin/Owner only!', ephemeral: true });
                }

                const role = options.getRole('role');
                const PermissionManager = require('./systems/permissionManager');
                const permManager = new PermissionManager();

                permManager.addWhitelistedRole(interaction.guild.id, role.id);
                await interaction.reply(`✅ ${role} can now use admin commands!`);
            }

            else if (commandName === 'whitelist-remove') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return await interaction.reply({ content: '❌ Admin/Owner only!', ephemeral: true });
                }

                const role = options.getRole('role');
                const PermissionManager = require('./systems/permissionManager');
                const permManager = new PermissionManager();

                permManager.removeWhitelistedRole(interaction.guild.id, role.id);
                await interaction.reply(`✅ ${role} removed from whitelist!`);
            }

            else if (commandName === 'whitelist-list') {
                const PermissionManager = require('./systems/permissionManager');
                const permManager = new PermissionManager();
                const roles = await permManager.listWhitelistedRoles(interaction.guild);

                if (roles.length === 0) {
                    return await interaction.reply('📝 No whitelisted roles!');
                }

                const embed = new EmbedBuilder()
                    .setTitle('🔓 Whitelisted Roles')
                    .setDescription(roles.map(r => `<@&${r.id}> - ${r.name}`).join('\n'))
                    .setColor(0x00FF00);

                await interaction.reply({ embeds: [embed] });
            }

            else if (commandName === 'command-toggle') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return await interaction.reply({ content: '❌ Admin/Owner only!', ephemeral: true });
                }

                const command = options.getString('command');
                const commandStates = dataManager.loadFile(interaction.guild.id, 'command_states.json');

                commandStates[command] = !commandStates[command];
                dataManager.saveFile(interaction.guild.id, 'command_states.json', commandStates);

                const status = commandStates[command] ? '✅ Enabled' : '❌ Disabled';
                await interaction.reply(`${status} command: \`${command}\``);
            }

            else if (commandName === 'command-list') {
                const commandStates = dataManager.loadFile(interaction.guild.id, 'command_states.json');

                const embed = new EmbedBuilder()
                    .setTitle('📜 Command Status')
                    .setColor(0x5865F2);

                let enabled = [];
                let disabled = [];

                for (const [cmd, state] of Object.entries(commandStates)) {
                    if (state) {
                        enabled.push(cmd);
                    } else {
                        disabled.push(cmd);
                    }
                }

                if (enabled.length > 0) {
                    embed.addFields({ name: '✅ Enabled', value: enabled.join(', '), inline: false });
                }
                if (disabled.length > 0) {
                    embed.addFields({ name: '❌ Disabled', value: disabled.join(', '), inline: false });
                }

                await interaction.reply({ embeds: [embed] });
            }

            // ============ MATH QUIZ COMMAND ============
            else if (commandName === 'math') {
                const mathSystem = require('./systems/mathSystem');
                const difficulty = options.getString('difficulty') || 'easy';

                // Check if difficulty is valid
                if (!['easy', 'hard'].includes(difficulty)) {
                    return await interaction.reply('❌ Difficulty must be "easy" or "hard"!');
                }

                // Initialize problem classes
                const easyProbs = new Easy();
                const hardProbs = new Hard();

                // Get problem generators based on difficulty
                const easyProblems = [
                    () => easyProbs.addition(),
                    () => easyProbs.subtraction(),
                    () => easyProbs.multiplication(),
                    () => easyProbs.division(),
                ];

                const hardProblemsArray = [
                    () => hardProbs.addition(),
                    () => hardProbs.subtraction(),
                    () => hardProbs.multiplication(),
                    () => hardProbs.division(),
                    // TODO: Add more hard problems when implemented
                ];

                const problemArray = difficulty === 'hard' ? hardProblemsArray : easyProblems;

                // Select 5 random problems
                const selectedProblems = [];
                for (let i = 0; i < 5; i++) {
                    const randomIndex = mathSystem.randomInt(0, problemArray.length - 1);
                    selectedProblems.push(problemArray[randomIndex]);
                }

                // Reset active players
                mathSystem.activePlayers.clear();

                // Defer the interaction
                await interaction.deferReply();

                // Wait for join reactions (30 seconds)
                try {
                    await mathSystem.waitForJoinReactions(interaction, 30000);

                    // Check if anyone joined
                    if (mathSystem.activePlayers.size === 0) {
                        return await interaction.followUp('❌ No one joined the quiz. Game cancelled.');
                    }

                    // Announce quiz start
                    const playerList = Array.from(mathSystem.activePlayers.keys())
                        .map(userId => `<@${userId}>`)
                        .join(', ');

                    await interaction.channel.send(
                        `🎮 **Quiz Started!** Players: ${playerList}\n\n**${difficulty.toUpperCase()} Difficulty - 5 Questions**`
                    );

                    // Run the quiz
                    await mathSystem.runQuiz(interaction, selectedProblems);
                } catch (error) {
                    console.error('Error in math quiz:', error);
                    await interaction.followUp(`❌ Error: ${error.message}`);
                }
            }

            // ============ ADMIN COMMANDS ============
            else if (commandName === 'killbot') {
                if (interaction.user.id !== client.config.OWNER_ID) {
                    return await interaction.reply({ content: '❌ Owner only!', ephemeral: true });
                }

                await interaction.reply('🛑 Shutting down...');
                process.exit(0);
            }

            else if (commandName === 'restart') {
                if (interaction.user.id !== client.config.OWNER_ID) {
                    return await interaction.reply({ content: '❌ Owner only!', ephemeral: true });
                }

                await interaction.reply('🔄 Restarting bot...');
                process.exit(1); // PM2 will restart it
            }

            // ============ CAT/DOG COMMANDS ============
            else if (commandName === 'cat') {
                const funCommands = require('./commands/fun');
                // Call the cat command if it exists
                if (funCommands.cat && funCommands.cat.execute) {
                    await funCommands.cat.execute(interaction, [], client);
                } else {
                    await interaction.reply('🐱 Meow!');
                }
            }

            else if (commandName === 'dog') {
                const funCommands = require('./commands/fun');
                // Call the dog command if it exists
                if (funCommands.dog && funCommands.dog.execute) {
                    await funCommands.dog.execute(interaction, [], client);
                } else {
                    await interaction.reply('🐶 Woof!');
                }
            }
            // ==================== SAY COMMANDS =======
            else if (commandName === 'say') {
                const funCommands = require('./commands/fun');

                if (funCommands.say && funCommands.say.execute) {
                    await funCommands.say.execute(interaction, [], client);
                }
            }
            //======================================================================
            //          SLASH COMMAND HANDLERS - ADD TO slashHandler.js
            //======================================================================

            // ============ ADD THESE HANDLERS AFTER THE EXISTING COMMANDS ============

            // ============ GEMS COMMAND ============
            else if (commandName === 'gems') {
                const gemsCommands = require('./commands/gems');
                await gemsCommands.gems.execute(interaction, client, client.config);
            }

            // ============ GEMSHOP COMMAND ============
            else if (commandName === 'gemshop') {
                const gemsCommands = require('./commands/gems');
                await gemsCommands.gemshop.execute(interaction, client, client.config);
            }

            // ============ XP COMMAND ============
            else if (commandName === 'xp') {
                const xpCommands = require('./commands/xp');
                await xpCommands.xp.execute(interaction, client, client.config);
            }

            // ============ XPTOP COMMAND ============
            else if (commandName === 'xptop') {
                const xpCommands = require('./commands/xp');
                await xpCommands.xptop.execute(interaction, client, client.config);
            }

            // ============ XPGLOBAL COMMAND ============
            else if (commandName === 'xpglobal') {
                const xpCommands = require('./commands/xp');
                await xpCommands.xpglobal.execute(interaction, client, client.config);
            }

            // ==================== INSTRUCTIONS ====================
            // 1. Find the section in your slashHandler.js where commands are handled
            //    (around line 800+ where you have "else if (commandName === 'say')")
            //
            // 2. Add the above handlers AFTER your existing commands
            //
            // 3. Make sure they're inside the try-catch block
            //
            // 4. Make sure they're before the final catch block


        } catch (error) {
            console.error(`❌ Error handling slash command ${commandName}:`, error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ An error occurred!', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ An error occurred!', ephemeral: true });
            }
        }
    });

    console.log('✅ Slash command handler loaded');
}

module.exports = { setupSlashCommands };
