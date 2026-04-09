///////////////////////////////////////////////////////////////////////
//                      MODERATION COMMANDS                           //
///////////////////////////////////////////////////////////////////////

const { PermissionFlagsBits, EmbedBuilder, ButtonStyle, ButtonBuilder, ComponentType, ActionRowBuilder, AttachmentBuilder, PermissionsBitField } = require('discord.js');
const { parseTime } = require('../utils/helpers');
const { createCanvas } = require('@napi-rs/canvas');
const DatabaseManager = require("../utils/DatabaseManager");
const dataManager = new DatabaseManager();

// Helper function to check if user is owner or has ManageGuild permission
function canManageServer(member, config) {
    return member.id === config.OWNER_ID || member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function setup(client) {
    // --- Lệnh SETJOIN ---
    client.commands.set('setjoin', {
        name: 'setjoin',
        async execute(message, args, client) {
            if (!canManageServer(message.member, client.config)) return message.reply("❌ No permission!");

            const channel = message.mentions.channels.first();
            const content = args.slice(1).join(' ');

            if (!channel || !content) return message.reply("❌ Usage: `%setjoin #channel Welcome {user} to {server}!`");

            dataManager.setGuildMsg(message.guild.id, 'welcome', channel.id, content);
            return message.reply(`✅ **Welcome message** set to ${channel}.`);
        }
    });

    // --- Lệnh SETLEAVE ---
    client.commands.set('setleave', {
        name: 'setleave',
        async execute(message, args, client) {
            if (!canManageServer(message.member, client.config)) return message.reply("❌ No permission!");

            const channel = message.mentions.channels.first();
            const content = args.slice(1).join(' ');

            if (!channel || !content) return message.reply("❌ Usage: `%setleave #channel {user} just left us.`");

            dataManager.setGuildMsg(message.guild.id, 'leave', channel.id, content);
            return message.reply(`✅ **Leave message** set to ${channel}.`);
        }
    });

    client.commands.set('membercount', {
        name: 'membercount',
        description: 'Shows server member statistics',
        aliases: ['members', 'serverinfo'],

        async execute(message, args, client) {
            try {
                const guild = message.guild;

                // FIX 1: Fetch all members to ensure cache is full (vô cùng quan trọng)
                const allMembers = await guild.members.fetch();

                const totalMembers = guild.memberCount; // Luôn chính xác từ API
                const humanMembers = allMembers.filter(member => !member.user.bot).size;
                const botMembers = allMembers.filter(member => member.user.bot).size;

                // FIX 2: Online status (Chỉ hoạt động nếu có GuildPresences intent)
                const onlineMembers = allMembers.filter(member =>
                    member.presence && ['online', 'idle', 'dnd'].includes(member.presence.status)
                ).size;

                const activityRate = ((onlineMembers / totalMembers) * 100).toFixed(1);

                const embed = new EmbedBuilder()
                    .setTitle(`👥 ${guild.name} Statistics`)
                    .setColor(0x5865F2)
                    .setThumbnail(guild.iconURL({ dynamic: true }))
                    .addFields(
                        { name: '📊 Total', value: `\`${totalMembers}\``, inline: true },
                        { name: 'Humans', value: `\`${humanMembers}\``, inline: true },
                        { name: 'Bots', value: `\`${botMembers}\``, inline: true },
                        { name: 'Online', value: `\`${onlineMembers || '0'}\``, inline: true },
                        { name: 'Bot %', value: `\`${((botMembers / totalMembers) * 100).toFixed(1)}%\``, inline: true },
                        { name: '⚡ Activity Rate', value: `\`${activityRate}%\``, inline: true },

                    )
                    .setFooter({ text: `Created: ${guild.createdAt.toLocaleDateString()}` })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });

            } catch (error) {
                console.error('Error:', error);
                await message.reply('❌ Failed to fetch statistics!');
            }
        }
    });

    // Aliases
    client.commands.set('members', client.commands.get('membercount'));
    client.commands.set('serverinfo', client.commands.get('membercount'));

    client.commands.set('clearbot', {
        name: 'clearbot',
        description: 'Delete bot messages',
        aliases: ['purgebot', 'deletebot', 'delbot'],
        async execute(message, args, client) {
            // 1. Permission Check
            if (!canManageServer(message.member, client.config)) {
                return message.reply("❌ You do not have permission!");
            }

            // 2. Usage Check: Ensure a number between 1-99 is provided
            const amount = parseInt(args[0]); // Using args[0] for command handlers

            if (!args[0] || isNaN(amount) || amount < 1 || amount > 99) {
                return message.reply("⚠️ **Usage:** `%clearbot <1-99>`\n*Example: %clearbot 20*");
            }

            try {
                // 3. DELETE AUTHOR MESSAGE: Immediately delete the %clearbot command
                // We use .catch() to prevent errors if the message was already deleted
                await message.delete().catch(() => null);

                // 4. Fetch the last 100 messages to scan for bots
                const fetched = await message.channel.messages.fetch({ limit: 100 });

                // 5. THE BOT CHECK: Filter messages where author.bot is true
                const botMessages = fetched.filter(m => m.author.bot).first(amount);

                if (botMessages.length === 0) {
                    const noMsg = await message.channel.send("🔍 No bot messages found.");
                    return setTimeout(() => noMsg.delete().catch(() => null), 3000);
                }

                // 6. Bulk Delete (true skips messages older than 14 days)
                const deleted = await message.channel.bulkDelete(botMessages, true);

                const status = await message.channel.send(`✅ Cleaned up **${deleted.size}** bot messages.`);

                // Self-destruct status message after 3 seconds
                setTimeout(() => status.delete().catch(() => null), 3000);

            } catch (error) {
                console.error("Clearbot Error:", error);
                // Don't use message.reply here as the original message is deleted
                message.channel.send("❌ Error: Messages may be older than 14 days");
            }
        }
    });

    // ============ CHANGE MEMBER NAME COMMAND ============
    client.commands.set('setnick', {
        name: 'setnick',
        description: 'Change a member\'s nickname in the server',
        async execute(message, args, client) {
            // 1. Owner Security Check
            if (!canManageServer(message.member, client.config)) {
                return message.reply("❌ You do not have permission to manage nicknames in this server!");
            }
            // 2. Identify the Target Member and the New Nickname
            const targetMember = message.mentions.members.first();
            const newNickname = args.slice(1).join(' ').trim() // Skip the mention, take the rest

            if (!targetMember) {
                return message.reply('❌ Please mention a member! Usage: `!setnick @user New Name`');
            }

            if (!newNickname) {
                return message.reply('❌ Please provide a new nickname!');
            }

            // 3. Permission & Hierarchy Check
            if (!message.guild.members.me.permissions.has('ManageNicknames')) {
                return message.reply('❌ I do not have the **Manage Nicknames** permission!');
            }

            if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
                return message.reply('❌ I cannot change the nickname of this user because their role is higher than or equal to mine!');
            }

            try {
                // 4. Perform the change
                const oldName = targetMember.displayName;
                await targetMember.setNickname(newNickname);

                return message.reply(`✅ Changed **${oldName}**'s nickname to **${newNickname}**`);
            } catch (error) {
                console.error(error);
                return message.reply('❌ An error occurred while trying to change the nickname.');
            }
        }
    });

    // ============ CLEAR COMMAND ============
    client.commands.set('clear', {
        name: 'clear',
        aliases: ['purge', 'delete'],
        description: 'Clear messages',
        async execute(message, args, client) {
            if (!canManageServer(message.member, client.config)) {
                return message.reply('❌ You need Manage Server permission!');
            }

            if (args.length === 0) {
                return message.reply('❌ Usage: `%clear <amount>`');
            }

            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 99) {
                return message.reply('❌ Please provide a number between 1-99!');
            }

            try {
                const deleted = await message.channel.bulkDelete(amount + 1, true);
                const reply = await message.channel.send(`✅ Deleted **${deleted.size - 1}** messages!`);

                setTimeout(() => reply.delete().catch(() => { }), 5000);
            } catch (error) {
                await message.reply(`❌ Failed to delete messages: ${error.message}`);
            }
        }
    });

    client.commands.set('purge', client.commands.get('clear'));
    client.commands.set('delete', client.commands.get('clear'));

    // =============== LOCK & UNLOCK CHANNEL COMMAND ================
    client.commands.set('lock', {
        name: 'lock',
        async execute(message, args, client) {
            if (!canManageServer(message.member, client.config)) return message.reply('❌ No permission!');
            const channel = message.mentions.channels.first() || message.channel;

            try {
                // CHỈ sửa đúng role @everyone, các role khác giữ nguyên 100%
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });
                return message.reply(`🔒 **${channel.name}** has been locked for @everyone.`);
            } catch (error) {
                return message.reply('❌ Missing Permissions! Check my Role position.');
            }
        }
    });


    client.commands.set('unlock', {
        name: 'unlock',
        async execute(message, args, client) {
            if (!canManageServer(message.member, client.config)) return message.reply('❌ No permission!');
            const channel = message.mentions.channels.first() || message.channel;

            try {
                // Trả quyền @everyone về mặc định, KHÔNG xóa các role khác
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: null
                });
                return message.reply(`🔓 **${channel.name}** has been unlocked.`);
            } catch (error) {
                return message.reply('❌ Missing Permissions!');
            }
        }
    });


    client.commands.set('lockchannel', client.commands.get('lock'));
    client.commands.set('unlockchannel', client.commands.get('unlock'));
    client.commands.set('open', client.commands.get('unlock'));

    // ============== SNIPE MESSAGE ====================
    client.commands.set('snipe', {
        name: 'snipe',
        description: 'View the last 99 deleted messages in this channel',
        async execute(message, args, client) {
            // 1. Permission Check
            if (!canManageServer(message.member, client.config)) {
                return message.reply('❌ You need **Manage Server** permission to use this command!');
            }

            // 2. Check if snipes map exists and has data for this channel
            if (!client.snipes) client.snipes = new Map();
            const snipes = client.snipes.get(message.channel.id);

            if (!snipes || snipes.length === 0) {
                return message.reply("❌ There are no recently deleted messages in this channel!");
            }

            let currentPage = 0;

            const generateEmbed = (page) => {
                const data = snipes[page];
                const embed = new EmbedBuilder()
                    .setAuthor({ name: data.author.tag, iconURL: data.author.displayAvatarURL() })
                    .setDescription(data.content || "*[No text content / Attachment only]*")
                    .addFields({ name: 'Message', value: `\`${page + 1}\` of \`${snipes.length}\``, inline: true })
                    .setColor('#2f3136')
                    .setTimestamp(data.timestamp)
                    .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

                if (data.image) embed.setImage(data.image);
                return embed;
            };

            const getButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === snipes.length - 1)
                );
            };

            const mainMessage = await message.reply({
                embeds: [generateEmbed(currentPage)],
                components: [getButtons(currentPage)]
            });

            const collector = mainMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({
                        content: "❌ Only the person who used the command can switch pages.",
                        ephemeral: true
                    });
                }

                if (interaction.customId === 'prev') currentPage--;
                if (interaction.customId === 'next') currentPage++;

                await interaction.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [getButtons(currentPage)]
                }).catch(() => { });
            });

            collector.on('end', () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('p').setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('n').setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                mainMessage.edit({ components: [disabledRow] }).catch(() => { });
            });
        }
    });


    client.commands.set('serverstats', {
        name: 'serverstats',
        aliases: ['growth', 'analytics'],
        description: 'Show server growth statistics',

        async execute(message) {
            try {
                if (!message.guild) {
                    return message.reply("❌ Server only command!");
                }

                // ===== SAFE HELPERS =====
                const safeText = (v) => (v === undefined || v === null) ? "" : String(v);
                const safeNum = (v) => {
                    const n = Number(v);
                    return Number.isFinite(n) ? n : 0;
                };

                const drawText = (ctx, text, x, y) => {
                    ctx.fillText(safeText(text), safeNum(x), safeNum(y));
                };

                const roundRectPath = (ctx, x, y, w, h, r) => {
                    const radius = Math.min(r, w / 2, h / 2);
                    ctx.beginPath();
                    ctx.moveTo(x + radius, y);
                    ctx.lineTo(x + w - radius, y);
                    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
                    ctx.lineTo(x + w, y + h - radius);
                    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
                    ctx.lineTo(x + radius, y + h);
                    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
                    ctx.lineTo(x, y + radius);
                    ctx.quadraticCurveTo(x, y, x + radius, y);
                    ctx.closePath();
                };

                // ===== DATA =====
                const raw = dataManager.getRecentAnalytics(message.guild.id, 7) || [];

                const rows = raw
                    .map(r => ({
                        joined: safeNum(r?.joined),
                        left: safeNum(r?.left),
                        total_at_day: safeNum(r?.total_at_day),
                        date: typeof r?.date === "string" ? r.date : null
                    }))
                    .filter(r => r);

                if (rows.length < 2) {
                    return message.reply("📊 Need at least 2 days of data!");
                }

                // ===== CANVAS =====
                const canvas = createCanvas(760, 480);
                const ctx = canvas.getContext('2d');

                const paddingLeft = 70;
                const paddingRight = 30;
                const paddingTop = 70;
                const paddingBottom = 70;

                const chartWidth = canvas.width - paddingLeft - paddingRight;
                const chartHeight = canvas.height - paddingTop - paddingBottom;

                // ===== BACKGROUND =====
                const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
                bg.addColorStop(0, '#101820');
                bg.addColorStop(1, '#1b2430');
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Subtle panel
                ctx.fillStyle = 'rgba(255,255,255,0.03)';
                roundRectPath(ctx, 18, 18, canvas.width - 36, canvas.height - 36, 18);
                ctx.fill();

                // ===== TITLE =====
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px sans-serif';
                drawText(ctx, `${message.guild.name} Growth Analytics`, paddingLeft, 38);

                ctx.fillStyle = 'rgba(255,255,255,0.70)';
                ctx.font = '13px sans-serif';
                drawText(ctx, `Last ${rows.length} days • Join vs Leave`, paddingLeft, 58);

                // ===== SCALE =====
                const maxValue = Math.max(
                    ...rows.map(r => Math.max(r.joined, r.left)),
                    5
                );

                const yTicks = 5;
                const stepY = chartHeight / yTicks;

                // ===== GRID + Y AXIS LABELS =====
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 1;
                ctx.font = '12px sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.65)';

                for (let i = 0; i <= yTicks; i++) {
                    const y = paddingTop + (chartHeight - (i * stepY));
                    const val = Math.round((maxValue / yTicks) * i);

                    ctx.beginPath();
                    ctx.moveTo(paddingLeft, y);
                    ctx.lineTo(canvas.width - paddingRight, y);
                    ctx.stroke();

                    drawText(ctx, val, 22, y + 4);
                }

                // Y-axis line
                ctx.strokeStyle = 'rgba(255,255,255,0.18)';
                ctx.beginPath();
                ctx.moveTo(paddingLeft, paddingTop);
                ctx.lineTo(paddingLeft, paddingTop + chartHeight);
                ctx.stroke();

                // ===== BAR LAYOUT =====
                const groupCount = rows.length;
                const groupGap = 16;
                const plotWidth = chartWidth;
                const groupWidth = (plotWidth - groupGap * (groupCount - 1)) / groupCount;
                const barGap = 8;
                const barWidth = Math.max(8, (groupWidth - barGap) / 2);

                const chartBottom = paddingTop + chartHeight;
                const scaleY = (value) => {
                    const safe = safeNum(value);
                    return chartBottom - ((safe / maxValue) * (chartHeight - 20));
                };

                // ===== LEGEND =====
                const legendY = 26;

                const legendItem = (x, color, label) => {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(x, legendY, 5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = 'rgba(255,255,255,0.90)';
                    ctx.font = '13px sans-serif';
                    drawText(ctx, label, x + 10, legendY + 4);
                };

                legendItem(paddingLeft + 0, '#43b581', 'Join');
                legendItem(paddingLeft + 110, '#f04747', 'Leave');

                // ===== BAR DRAWER =====
                const drawBar = (x, y, w, h, color) => {
                    const radius = 8;
                    const topY = Math.min(y, y + h);
                    const height = Math.abs(h);

                    const gradient = ctx.createLinearGradient(0, topY, 0, topY + height);
                    gradient.addColorStop(0, color);
                    gradient.addColorStop(1, 'rgba(255,255,255,0.20)');

                    ctx.fillStyle = gradient;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 10;

                    roundRectPath(ctx, x, topY, w, height, radius);
                    ctx.fill();

                    ctx.shadowBlur = 0;
                };

                // ===== DRAW BARS =====
                rows.forEach((row, i) => {
                    const groupX = paddingLeft + i * (groupWidth + groupGap);
                    const bar1X = groupX;
                    const bar2X = groupX + barWidth + barGap;

                    const joinY = scaleY(row.joined);
                    const leaveY = scaleY(row.left);

                    const joinH = chartBottom - joinY;
                    const leaveH = chartBottom - leaveY;

                    drawBar(bar1X, joinY, barWidth, joinH, '#43b581');
                    drawBar(bar2X, leaveY, barWidth, leaveH, '#f04747');

                    // Value labels on top
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px sans-serif';
                    drawText(ctx, row.joined, bar1X + (barWidth / 2) - 6, joinY - 8);
                    drawText(ctx, row.left, bar2X + (barWidth / 2) - 6, leaveY - 8);

                    // Date label
                    let dateStr = `D${i + 1}`;
                    if (row.date) {
                        const parts = row.date.split('-');
                        if (parts.length >= 3) {
                            dateStr = `${parts[2]}/${parts[1]}`;
                        }
                    }

                    ctx.fillStyle = 'rgba(255,255,255,0.68)';
                    ctx.font = '12px sans-serif';
                    drawText(ctx, dateStr, groupX + (groupWidth / 2) - 16, chartBottom + 24);
                });

                // ===== FOOTER SUMMARY =====
                const last = rows[rows.length - 1] || {};
                const totalJoined = rows.reduce((sum, r) => sum + safeNum(r.joined), 0);
                const totalLeft = rows.reduce((sum, r) => sum + safeNum(r.left), 0);

                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                roundRectPath(ctx, paddingLeft, canvas.height - 48, canvas.width - paddingLeft - paddingRight, 34, 12);
                ctx.fill();

                ctx.fillStyle = 'rgba(255,255,255,0.92)';
                ctx.font = '13px sans-serif';
                drawText(ctx, `Total joins: ${totalJoined}`, paddingLeft + 14, canvas.height - 26);
                drawText(ctx, `Total leaves: ${totalLeft}`, paddingLeft + 170, canvas.height - 26);
                drawText(ctx, `Today: +${safeNum(last.joined)} / -${safeNum(last.left)}`, paddingLeft + 330, canvas.height - 26);

                // ===== EXPORT =====
                const attachment = new AttachmentBuilder(
                    canvas.toBuffer('image/png'),
                    { name: 'growth-bar-chart.png' }
                );

                const embed = new EmbedBuilder()
                    .setTitle(`📊 ${safeText(message.guild.name)} Growth Stats`)
                    .setDescription('Bar chart: **green = joins**, **red = leaves**')
                    .addFields(
                        { name: 'Today Joins', value: `\`${safeNum(last.joined)}\``, inline: true },
                        { name: 'Today Leaves', value: `\`${safeNum(last.left)}\``, inline: true },
                        { name: 'Current Total', value: `\`${safeNum(message.guild.memberCount)}\``, inline: true }
                    )
                    .setColor('#5865F2')
                    .setImage('attachment://growth-bar-chart.png')
                    .setFooter({ text: 'Data updates from join/leave history' })
                    .setTimestamp();

                return message.reply({
                    embeds: [embed],
                    files: [attachment]
                });

            } catch (err) {
                console.error("Growth error:", err);
                return message.reply("❌ Error generating chart!");
            }
        }
    });

    // Aliases
    client.commands.set('growth', client.commands.get('serverstats'));
    client.commands.set('analytics', client.commands.get('serverstats'));

    client.commands.set('createrole', {
        name: 'createrole',
        aliases: ['cr', 'newrole'],
        description: 'Create a role with Name, Color (Hex), and Permission (Name or Integer)',
        async execute(message, args, client) {
            // 1. Permission Check
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.reply('❌ You need **Manage Roles** permission!');
            }

            // 2. Validate Args: %createrole <name> <color> <permission>
            if (args.length < 1) {
                return message.reply('⚠️ Usage: `%createrole <name> [color_hex] [permission]`\nExample: `%createrole VIP #f1c40f 8` (8 = Admin)');
            }

            const roleName = args[0];
            const roleColor = args[1] || 'Default';
            const rawPerm = args[2] || '0'; // Mặc định là 0 (Không quyền đặc biệt)

            try {
                let finalPerms;

                // Kiểm tra nếu người dùng nhập số (Integer) hay chữ (String)
                if (!isNaN(rawPerm)) {
                    finalPerms = BigInt(rawPerm); // Chuyển chuỗi số thành BigInt
                } else {
                    finalPerms = PermissionsBitField.Flags[rawPerm];
                    if (!finalPerms && rawPerm !== '0') throw new Error('INVALID_PERM');
                }

                // 3. Tạo Role
                const newRole = await message.guild.roles.create({
                    name: roleName,
                    color: roleColor,
                    permissions: [finalPerms],
                    reason: `Created by ${message.author.tag}`
                });

                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Role Created')
                    .setColor(newRole.color || '#ffffff')
                    .addFields(
                        { name: 'Name', value: `\`${newRole.name}\``, inline: true },
                        { name: 'Color', value: `\`${roleColor}\``, inline: true },
                        { name: 'Perm Bitfield', value: `\`${finalPerms.toString()}\``, inline: true }
                    )
                    .setTimestamp();

                return message.reply({ embeds: [successEmbed] });

            } catch (error) {
                // 4. HIỂN THỊ GỢI Ý KHI SAI PERMISSION
                const helpEmbed = new EmbedBuilder()
                    .setTitle('❌ Invalid Permission!')
                    .setDescription('Please use a valid **Permission Name** or **Integer (Bitfield)**.')
                    .setColor('#ff4742')
                    .addFields(
                        { name: 'Common Integers', value: '`8`: Administrator\n`32`: Manage Server\n`2`: Kick Members\n`4`: Ban Members\n`2048`: Send Messages', inline: true },
                        { name: 'Common Names', value: '`Administrator` (Full access)\n`ManageMessages` (Clear chat)\n`MentionEveryone` (Ping all)\n`ManageChannels` (Edit rooms)', inline: true }
                    )
                    .setFooter({ text: 'Tip: You can use 0 for no special permissions.' });

                return message.reply({ embeds: [helpEmbed] });
            }
        }
    });



    console.log('✅ Moderation commands loaded');
}

module.exports = { setup };
