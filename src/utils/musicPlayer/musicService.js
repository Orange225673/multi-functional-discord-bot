const play = require('play-dl');
const ytdl = require('@distube/ytdl-core');
const exec = require('youtube-dl-exec');
const { spawn } = require('child_process');
const path = require('path');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState
} = require('@discordjs/voice');
const fs = require('fs');
const helpers = require('../helpers');

const queues = new Map();

async function initializePlayer(client) {
    console.log('✅ play-dl music system initialized');
}

function getQueue(guildId) {
    return queues.get(guildId) || null;
}

function destroyQueue(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;

    if (queue.disconnectTimeout) {
        clearTimeout(queue.disconnectTimeout);
    }

    if (queue.connection) {
        queue.connection.destroy();
    }

    queues.delete(guildId);
}

async function playNext(queue) {
    if (!queue.tracks.length) {
        queue.playing = false;
        return;
    }

    const track = queue.tracks[0];

    if (!track || !track.title) {
        console.error("❌ Invalid track:", track);
        queue.tracks.shift();
        return playNext(queue);
    }

    try {
        let streamUrl = track.url;

        // Ensure proper URL format
        if (streamUrl.includes('youtu.be/')) {
            const videoId = streamUrl.split('youtu.be/')[1]?.split('?')[0];
            if (videoId) streamUrl = `https://www.youtube.com/watch?v=${videoId}`;
        } else if (streamUrl.includes('youtube.com') && !streamUrl.includes('www.youtube.com')) {
            streamUrl = streamUrl.replace('https://youtube.com', 'https://www.youtube.com');
        }

        console.log(`🔗 Stream URL: ${streamUrl}`);

        let retries = 3;
        let lastError;
        let extractionMethod = 1; // 1=ytdl, 2=play-dl, 3=youtube-dl-exec

        while (retries > 0) {
            try {
                let stream;

                if (extractionMethod === 3) {
                    // Try youtube-dl-exec - get direct stream URL
                    console.log(`⚠️ Trying fallback #2: youtube-dl-exec`);
                    try {
                        const http = require('http');
                        const https = require('https');

                        const info = await exec(streamUrl, {
                            dumpSingleJson: true,
                            noWarnings: true,
                            format: 'bestaudio'
                        }).catch(() => null);

                        if (!info || !info.url) {
                            throw new Error('youtube-dl-exec: No stream URL returned');
                        }

                        const directUrl = info.url;
                        console.log(`📡 Got direct stream URL from youtube-dl-exec`);

                        // Get raw audio stream
                        const audioStream = await new Promise((resolve, reject) => {
                            const protocol = directUrl.startsWith('https') ? https : http;
                            const req = protocol.get(directUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                                },
                                timeout: 15000
                            }, (res) => {
                                if (res.statusCode !== 200) {
                                    reject(new Error(`HTTP ${res.statusCode}`));
                                } else {
                                    resolve(res);
                                }
                            });

                            req.on('error', reject);
                            req.on('timeout', () => {
                                req.destroy();
                                reject(new Error('Stream connection timeout'));
                            });
                        });

                        // Pipe through ffmpeg to convert to proper audio format
                        const ffmpeg = require('ffmpeg-static');
                        stream = spawn(ffmpeg, [
                            '-i', 'pipe:0',
                            '-f', 's16le',
                            '-ar', '48000',
                            '-ac', '2',
                            'pipe:1'
                        ], {
                            stdio: ['pipe', 'pipe', 'ignore']
                        });

                        audioStream.pipe(stream.stdin);
                        stream = stream.stdout;

                    } catch (fallbackErr) {
                        console.warn(`❌ youtube-dl-exec failed:`, fallbackErr.message);
                        throw fallbackErr;
                    }
                } else if (extractionMethod === 2) {
                    // Try play-dl
                    console.log(`⚠️ Trying fallback #1: play-dl.stream()`);
                    try {
                        stream = await play.stream(streamUrl);
                        if (!stream) throw new Error('play-dl returned null stream');
                    } catch (fallbackErr) {
                        console.warn(`❌ play-dl fallback failed:`, fallbackErr.message);
                        throw fallbackErr;
                    }
                } else {
                    // Use ytdl-core with various quality options
                    const qualities = ['highestaudio', 'highest', 'highestvideo+bestaudio/best'];
                    let qualityIndex = Math.max(0, 2 - retries);

                    stream = ytdl(streamUrl, {
                        quality: qualities[qualityIndex],
                        highWaterMark: 1 << 25,
                        requestOptions: {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                            }
                        }
                    });
                }

                // Handle stream errors and validation
                await new Promise((resolve, reject) => {
                    let isResolved = false;

                    stream.on('error', (err) => {
                        if (!isResolved) {
                            isResolved = true;
                            console.warn(`⚠️ Stream error:`, err.message);
                            reject(err);
                        }
                    });

                    stream.once('readable', () => {
                        if (!isResolved) {
                            isResolved = true;
                            resolve();
                        }
                    });

                    stream.once('data', () => {
                        if (!isResolved) {
                            isResolved = true;
                            resolve();
                        }
                    });

                    // Timeout after 3 seconds
                    setTimeout(() => {
                        if (!isResolved) {
                            isResolved = true;
                            reject(new Error('Stream timeout: No data within 3s'));
                        }
                    }, 3000);
                });

                const resource = createAudioResource(stream, {
                    inputType: extractionMethod === 3 ? 'raw' : undefined,
                    inlineVolume: true
                });

                resource.volume.setVolume(0.75);
                queue.player.play(resource);
                queue.playing = true;

                console.log(`🎵 Now playing: ${track.title}`);
                console.log(`   Using extraction method: ${extractionMethod === 1 ? 'ytdl-core' : extractionMethod === 2 ? 'play-dl' : 'youtube-dl-exec'}`);
                return;

            } catch (err) {
                lastError = err;
                retries--;

                // Rotate to next extraction method
                extractionMethod = (extractionMethod % 3) + 1;

                if (retries > 0) {
                    console.warn(`⚠️ Retry attempt ${4 - retries}, ${retries} left... (Method: ${extractionMethod}, Error: ${err.message})`);
                    await new Promise(r => setTimeout(r, 800));
                } else {
                    console.error(`❌ All extraction methods exhausted.`);
                }
            }
        }

        throw lastError;

    } catch (err) {
        console.error("❌ Play error:", err.message);
        queue.tracks.shift();
        playNext(queue);
    }
}

async function createQueue(message) {
    const guildId = message.guild.id;
    const existingQueue = queues.get(guildId);
    if (existingQueue && existingQueue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        return existingQueue;
    }

    const voiceChannel = message.member.voice.channel;
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        console.log("✅ Voice connection ready");
    } catch (err) {
        console.error("❌ Voice connection failed:", err);
        connection.destroy();
        throw new Error("Voice connection failed");
    }

    const player = createAudioPlayer();
    connection.subscribe(player);

    const queue = {
        guildId,
        voiceChannel,
        textChannel: message.channel,
        connection,
        player,
        tracks: [],
        playing: false,
        disconnectTimeout: null,
        loop: 0,    // 0: no loop, 1: loop current, 2: loop all
        volume: 75  // 0-100
    };

    player.on('stateChange', async (oldState, newState) => {
        if (oldState.status !== AudioPlayerStatus.Idle && newState.status === AudioPlayerStatus.Idle) {
            queue.tracks.shift();
            await playNext(queue);
        }
    });

    player.on('error', (error) => {
        console.error(`❌ Audio player error in guild ${guildId}:`, error.message);
        console.error(`   Stack:`, error.stack);
        queue.tracks.shift();
        playNext(queue);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
            ]);
        } catch {
            destroyQueue(guildId);
        }
    });

    queues.set(guildId, queue);
    return queue;
}

async function addSong(message, url) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('❌ Please join voice channel first!');
    if (!url || typeof url !== 'string') return message.reply('❌ Invalid URL provided!');

    try {
        console.log(`📥 Fetching info for URL: ${url}`);

        let track;
        let streamUrl = url;

        // Normalize URL format
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1]?.split('?')[0];
            if (videoId) streamUrl = `https://www.youtube.com/watch?v=${videoId}`;
        } else if (url.includes('youtube.com') && !url.includes('www.youtube.com')) {
            streamUrl = url.replace('https://youtube.com', 'https://www.youtube.com');
        }

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            // Get video info from yt-search
            const ytSearch = require('yt-search');
            const urlObj = new URL(streamUrl);
            const videoId = urlObj.searchParams.get("v");
            const video = await ytSearch({ videoId });

            if (!video) {
                throw new Error('Video not found on YouTube');
            }

            track = {
                title: video.title || url,
                url: streamUrl,
                duration: video.timestamp || '',
                channel: video.author?.name || 'Unknown'
            };
        } else {
            // Non-YouTube URL
            track = {
                title: url,
                url: streamUrl,
                duration: '',
                channel: 'Unknown'
            };
        }

        if (!track || !track.url) {
            console.error("❌ Track invalid:", track);
            return message.reply("❌ Invalid track!");
        }

        let queue = await createQueue(message);
        queue.tracks.push(track);
        console.log(`✅ Added song: "${track.title}"`);
        console.log(`   URL: ${track.url}`);
        console.log(`   Queue size: ${queue.tracks.length}`);

        if (!queue.playing) {
            console.log('▶️ Starting playback...');
            await playNext(queue);
        }

        return track;
    } catch (err) {
        console.error('❌ Failed to add song:', err.message);
        console.error(`   URL: ${url}`);
        message.reply('❌ Unable to play this music source. Try a different link or search result.');
        return null;
    }
}

function skip(guildId) {
    const queue = queues.get(guildId);
    if (!queue || !queue.playing) return false;
    queue.player.stop();
    return true;
}

function pause(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return false;
    queue.player.pause();
    return true;
}

function resume(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return false;
    queue.player.unpause();
    return true;
}

module.exports = {
    initializePlayer,
    addSong,
    skip,
    pause,
    resume,
    getQueue,
    getCacheKey(query, source) {
        return `${source}:${query.toLowerCase()}`;
    }
};