const music = require('../../utils/musicPlayer/musicService');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder
} = require('discord.js');

const searchService = require('../../utils/musicPlayer/musicSearchService');
const builder = require('../../utils/musicPlayer/Builder')

const PAGE_SIZE = 5;
const TIMEOUT = 120000;
function getSelectedTrack(tracks, index) {
    return tracks?.[index] || null;
}
function setup(client) {

    function checkVoice(message, queue) {
        if (!message.member.voice.channel) {
            message.reply("❌ You must join a voice channel!");
            return false;
        }

        // Nếu bot đang ở VC khác → chặn
        if (queue?.connection &&
            message.member.voice.channelId !== queue.connection.joinConfig.channelId) {
            message.reply("❌ You must be in the same voice channel!");
            return false;
        }

        return true;
    }

    // ⏸️ PAUSE
    client.commands.set('pause', {
        name: 'pause',
        async execute(message) {
            const queue = music.getQueue(message.guild.id);
            if (!checkVoice(message, queue)) return;

            const ok = music.pause(message.guild.id);
            if (!ok) return message.reply("❌ Nothing playing!");

            message.reply("⏸️ Paused!");
        }
    });

    // ▶️ RESUME
    client.commands.set('resume', {
        name: 'resume',
        async execute(message) {
            const queue = music.getQueue(message.guild.id);
            if (!checkVoice(message, queue)) return;

            const ok = music.resume(message.guild.id);
            if (!ok) return message.reply("❌ Nothing to resume!");

            message.reply("▶️ Resumed!");
        }
    });

    // ⏭️ SKIP
    client.commands.set('skip', {
        name: 'skip',
        async execute(message) {
            const queue = music.getQueue(message.guild.id);
            if (!checkVoice(message, queue)) return;

            if (!queue || !queue.playing) {
                return message.reply("❌ Nothing to skip!");
            }

            music.skip(message.guild.id);
            message.reply("⏭️ Skipped!");
        }
    });

    // 🔁 LOOP
    client.commands.set('loop', {
        name: 'loop',
        async execute(message, args) {
            const queue = music.getQueue(message.guild.id);
            if (!queue || !queue.playing) {
                return message.reply("❌ Nothing playing!");
            }

            const mode = args[0]?.toLowerCase() || 'toggle';
            let currentLoop = music.getLoop(message.guild.id);
            let newMode;

            if (mode === 'off' || mode === '0') {
                newMode = 0;
            } else if (mode === 'one' || mode === '1') {
                newMode = 1;
            } else if (mode === 'all' || mode === '2') {
                newMode = 2;
            } else if (mode === 'toggle') {
                newMode = (currentLoop + 1) % 3;
            } else {
                return message.reply("❌ Usage: `%loop [off|one|all|toggle]`");
            }

            music.setLoop(message.guild.id, newMode);
            const loopNames = ['🔁 Off', '🔂 Loop One', '🔁 Loop All'];
            message.reply(`${loopNames[newMode]}`);
        }
    });

    // 🔊 VOLUME
    client.commands.set('volume', {
        name: 'volume',
        async execute(message, args) {
            const queue = music.getQueue(message.guild.id);
            if (!queue) {
                return message.reply("❌ Nothing playing!");
            }

            if (!args[0]) {
                const vol = music.getVolume(message.guild.id);
                return message.reply(`🔊 Volume: ${vol}%`);
            }

            const volume = parseInt(args[0]);
            if (isNaN(volume) || volume < 1 || volume > 100) {
                return message.reply("❌ Volume must be 1-100");
            }

            const newVol = music.setVolume(message.guild.id, volume);
            message.reply(`🔊 Volume: ${newVol}%`);
        }
    });

    // 🎵 PLAY
    client.commands.set('play', {
        name: 'play',
        async execute(message, args) {
            const query = args.join(' ').trim();
            if (!query) {
                return message.reply('❌ Usage: `%play <keyword or link>`');
            }

            if (!message.member.voice.channel) {
                return message.reply('❌ You must join a voice channel first!');
            }

            let source = 'youtube';
            let page = 0;
            let selectedIndex = 0;
            let tracks = [];

            try {
                tracks = await searchService.searchBySource(query, source, 10);

                if (!tracks.length) {
                    return message.reply('❌ No music found!');
                }

                const embed = builder.buildEmbed(query, source, tracks, page, selectedIndex);
                const components = builder.buildComponents(source, tracks, page, selectedIndex);

                const sent = await message.reply({
                    embeds: [embed],
                    components
                });

                const collector = sent.createMessageComponentCollector({
                    time: TIMEOUT,
                    filter: (i) => i.user.id === message.author.id
                });

                collector.on('collect', async (i) => {
                    try {
                        if (i.isButton()) {
                            if (i.customId === 'music_cancel') {
                                await i.update({
                                    content: '❎ Cancelled.',
                                    embeds: [],
                                    components: []
                                });
                                return collector.stop('cancelled');
                            }

                            if (i.customId === 'music_prev') {
                                page = Math.max(0, page - 1);
                            }

                            if (i.customId === 'music_next') {
                                const maxPage = Math.max(0, Math.ceil(tracks.length / PAGE_SIZE) - 1);
                                page = Math.min(maxPage, page + 1);
                            }

                            if (i.customId === 'music_src_youtube') {
                                source = 'youtube';
                                page = 0;
                                selectedIndex = 0;
                                tracks = await searchService.searchBySource(query, source, 10);
                            }

                            if (i.customId === 'music_play') {
                                const track = getSelectedTrack(tracks, selectedIndex);
                                if (!track) {
                                    await i.reply({ content: '❌ No track selected!', ephemeral: true });
                                    return;
                                }

                                // Defer the interaction immediately to prevent timeout
                                await i.deferUpdate();

                                const song = await music.addSong(message, track.url);
                                if (!song) {
                                    // addSong already sent an error message
                                    return collector.stop('failed');
                                }

                                // Edit the original message (deferred)
                                try {
                                    await i.editReply({
                                        content: `🎶 Added to queue: **${song.title}**`,
                                        embeds: [],
                                        components: []
                                    });
                                } catch (err) {
                                    console.warn("Could not edit deferred reply:", err.message);
                                }

                                return collector.stop('played');
                            }

                            const updatedEmbed = builder.buildEmbed(query, source, tracks, page, selectedIndex);
                            const updatedComponents = builder.buildComponents(source, tracks, page, selectedIndex);

                            await i.update({
                                embeds: [updatedEmbed],
                                components: updatedComponents
                            });
                        }

                        if (i.isStringSelectMenu()) {
                            selectedIndex = Number(i.values[0]);
                            const updatedEmbed = builder.buildEmbed(query, source, tracks, page, selectedIndex);
                            const updatedComponents = builder.buildComponents(source, tracks, page, selectedIndex);

                            await i.update({
                                embeds: [updatedEmbed],
                                components: updatedComponents
                            });
                        }
                    } catch (err) {
                        console.error(err);
                        if (!i.replied && !i.deferred) {
                            await i.reply({ content: '❌ Interaction failed.', ephemeral: true }).catch(() => { });
                        }
                    }
                });

                collector.on('end', async () => {
                    if (!sent.editable) return;
                    await sent.edit({ components: [] }).catch(() => { });
                });
            } catch (err) {
                console.error(err);
                return message.reply('❌ Failed to search music.');
            }
        }
    });
}
console.log("✅ Music commands & systems loaded!")
module.exports = { setup };