///////////////////////////////////////////////////////////////////////
//                         FUN COMMANDS                               //
///////////////////////////////////////////////////////////////////////

const { description, aliases } = require('./math');
const databaseManager = require('../utils/DatabaseManager');
const { EmbedBuilder } = require('discord.js');

const dataManager = new databaseManager();
function setup(client, afkUsers) {
    // ============ PING COMMAND ============
    client.commands.set('ping', {
        name: 'ping',
        description: 'Check bot latency',
        async execute(message, args, client) {
            const sent = await message.reply('🏓 Pinging...');
            const latency = sent.createdTimestamp - message.createdTimestamp;
            const apiLatency = Math.round(client.ws.ping);

            await sent.edit(
                `🏓 Pong!\n` +
                `📡 Latency: **${latency}ms**\n` +
                `💓 API Latency: **${apiLatency}ms**`
            );
        }
    });

    // ============ AFK COMMAND ============
    client.commands.set('afk', {
        name: 'afk',
        description: 'Set AFK status',
        async execute(message, args, client) {
            const reason = args.join(' ') || 'AFK';
            const timestamp = Math.floor(Date.now() / 1000);

            // Lưu vào Map (để truy xuất nhanh)
            client.afkUsers.set(message.author.id, { reason, time: timestamp });

            // Lưu vào SQL (để lưu vĩnh viễn)
            dataManager.setAFK(message.guild.id, message.author.id, reason, timestamp);

            const embed = new EmbedBuilder().setColor('#3498db').setDescription(`✅ You are now AFK: **${reason}**`);
            await message.reply({ embeds: [embed] });
        }
    });


    // ============ 8BALL COMMAND ============
    client.commands.set('8ball', {
        name: '8ball',
        description: 'Ask the magic 8ball',
        async execute(message, args, client) {
            if (args.length === 0) {
                return message.reply('❌ Ask me a question!');
            }

            const responses = [
                'Yes, definitely!', 'It is certain.', 'Without a doubt.',
                'You may rely on it.', 'As I see it, yes.', 'Most likely.',
                'Outlook good.', 'Signs point to yes.', 'Reply hazy, try again.',
                'Ask again later.', 'Better not tell you now.', 'Cannot predict now.',
                'Concentrate and ask again.', 'Don\'t count on it.', 'My reply is no.',
                'My sources say no.', 'Outlook not so good.', 'Very doubtful.'
            ];

            const answer = responses[Math.floor(Math.random() * responses.length)];
            await message.reply(`🎱 ${answer}`);
        }
    });

    // ============ ROLL COMMAND ============
    client.commands.set('roll', {
        name: 'roll',
        aliases: ['dice'],
        description: 'Roll a dice',
        async execute(message, args, client) {
            const sides = parseInt(args[0]) || 6;

            if (sides < 2 || sides > 100) {
                return message.reply('❌ Dice must have 2-100 sides!');
            }

            const result = Math.floor(Math.random() * sides) + 1;
            await message.reply(`🎲 You rolled a **${result}** (1-${sides})`);
        }
    });

    client.commands.set('dice', client.commands.get('roll'));

    // ============ FLIP COMMAND ============
    client.commands.set('flip', {
        name: 'flip',
        aliases: ['coin', 'coinflip'],
        description: 'Flip a coin',
        async execute(message, args, client) {
            const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
            await message.reply(`🪙 ${result}!`);
        }
    });

    client.commands.set('coin', client.commands.get('flip'));
    client.commands.set('coinflip', client.commands.get('flip'));

    // ============ SAY COMMAND ============
    client.commands.set('say', {
        name: 'say',
        aliases: ['echo'],
        description: 'Make the bot say something, optionally in a specific channel',
        async execute(message, args, client) {
            if (args.length === 0) return

            const logIndex = args.indexOf('-c');
            let targetChannel = message.channel;
            let contentArgs = [...args];

            if (logIndex !== -1) {
                const channelMention = args[logIndex + 1];
                const foundChannel = message.mentions.channels.first() ||
                    message.guild.channels.cache.get(channelMention);

                if (foundChannel) {
                    targetChannel = foundChannel;

                    contentArgs.splice(logIndex, 2);
                } else {
                    return
                }
            }

            const text = contentArgs.join(' ');
            if (!text) return message.reply('❌ What should i say?');

            try {
                await message.delete();
            } catch (error) {

            }

            try {
                await targetChannel.send(text);
            } catch (error) {

            }
        }
    });

    client.commands.set('echo', client.commands.get('say'));

    // ============ CAT COMMAND ============
    client.commands.set('cat', {
        name: 'cat',
        description: 'Get a random cat image',
        async execute(message, args, client) {
            const CAT_API_KEY = process.env.CAT_API_KEY;

            if (!CAT_API_KEY) {
                return message.reply('❌ Cat API key is not configured! Please add CAT_API_KEY to .env file.');
            }

            try {
                const { EmbedBuilder } = require('discord.js');
                const fetch = require('undici').fetch;

                const response = await fetch('https://api.thecatapi.com/v1/images/search', {
                    headers: {
                        'x-api-key': CAT_API_KEY
                    }
                });

                if (!response.ok) {
                    return message.reply('❌ Failed to fetch cat image. API returned an error.');
                }

                const data = await response.json();

                if (!data || data.length === 0) {
                    return message.reply('❌ No cat images found!');
                }

                const catImage = data[0].url;

                const embed = new EmbedBuilder()
                    .setTitle('🐱 Random Cat')
                    .setImage(catImage)
                    .setColor(0xFF9500)
                    .setFooter({ text: `Requested by ${message.author.username}` });

                await message.reply({ embeds: [embed] });

            } catch (error) {
                console.error('Cat command error:', error);
                await message.reply('❌ Failed to fetch cat image. Please try again later.');
            }
        }
    });

    // ============ DOG COMMAND ============
    client.commands.set('dog', {
        name: 'dog',
        description: 'Get a random dog image',
        async execute(message, args, client) {
            const DOG_API_KEY = process.env.DOG_API_KEY;

            if (!DOG_API_KEY) {
                return message.reply('❌ Dog API key is not configured! Please add DOG_API_KEY to .env file.');
            }

            try {
                const { EmbedBuilder } = require('discord.js');
                const fetch = require('undici').fetch;

                const response = await fetch('https://api.thedogapi.com/v1/images/search', {
                    headers: {
                        'x-api-key': DOG_API_KEY
                    }
                });

                if (!response.ok) {
                    return message.reply('❌ Failed to fetch dog image. API returned an error.');
                }

                const data = await response.json();

                if (!data || data.length === 0) {
                    return message.reply('❌ No dog images found!');
                }

                const dogImage = data[0].url;

                const embed = new EmbedBuilder()
                    .setTitle('🐶 Random Dog')
                    .setImage(dogImage)
                    .setColor(0xD2691E)
                    .setFooter({ text: `Requested by ${message.author.username}` });

                await message.reply({ embeds: [embed] });

            } catch (error) {
                console.error('Dog command error:', error);
                await message.reply('❌ Failed to fetch dog image. Please try again later.');
            }
        }
    });
    // ============ GAYRATE COMMAND ============
    client.commands.set('gayrate', {
        name: 'gayrate',
        description: 'Calculate gay rate',
        async execute(message, args, client) {
            const user = message.mentions.users.first() || message.author;
            const rate = Math.floor(Math.random() * 101);

            let emoji = '🏳️‍🌈';
            if (rate < 30) emoji = '😐';
            else if (rate < 70) emoji = '🏳️‍🌈';
            else emoji = '🌈✨';

            await message.reply(`${emoji} **${user.username}** is **${rate}%** gay!`);
        }
    });

    // ============ IQTEST COMMAND ============
    client.commands.set('iqtest', {
        name: 'iqtest',
        aliases: ['iq'],
        description: 'Test IQ',
        async execute(message, args, client) {
            const user = message.mentions.users.first() || message.author;
            const iq = Math.floor(Math.random() * 151) + 50; // 50-200

            let emoji = '🧠';
            let comment = '';

            if (iq < 70) {
                emoji = '🤔';
                comment = '(Below Average)';
            } else if (iq < 90) {
                emoji = '😐';
                comment = '(Average)';
            } else if (iq < 110) {
                emoji = '🙂';
                comment = '(Good)';
            } else if (iq < 130) {
                emoji = '🧠';
                comment = '(Very Good)';
            } else if (iq < 150) {
                emoji = '🤓';
                comment = '(Superior)';
            } else {
                emoji = '🧙‍♂️';
                comment = '(Genius!)';
            }

            await message.reply(`${emoji} **${user.username}**'s IQ is **${iq}** ${comment}`);
        }
    });
    client.commands.set('iq', client.commands.get('iqtest'));

    // ============ SHIP COMMAND ============
    client.commands.set('ship', {
        name: 'ship',
        description: 'Ship two users',
        async execute(message, args, client) {
            const mentions = message.mentions.users;

            if (mentions.size < 2) {
                return message.reply('❌ Please mention 2 users to ship! Example: `%ship @user1 @user2`');
            }

            const users = Array.from(mentions.values()).slice(0, 2);
            const compatibility = Math.floor(Math.random() * 101);

            let emoji = '💔';
            let comment = 'Not compatible...';

            if (compatibility < 30) {
                emoji = '💔';
                comment = 'Not meant to be...';
            } else if (compatibility < 50) {
                emoji = '😐';
                comment = 'Could work...';
            } else if (compatibility < 70) {
                emoji = '❤️';
                comment = 'Good match!';
            } else if (compatibility < 90) {
                emoji = '💕';
                comment = 'Great couple!';
            } else {
                emoji = '💖✨';
                comment = 'Perfect match!';
            }

            await message.reply(
                `${emoji} **${users[0].username}** x **${users[1].username}**\n` +
                `💘 Compatibility: **${compatibility}%**\n` +
                `${comment}`
            );
        }
    });

    console.log('✅ Fun commands loaded');
}

module.exports = { setup };
