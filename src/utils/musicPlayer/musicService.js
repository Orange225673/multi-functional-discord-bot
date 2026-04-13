const play = require('play-dl');
const ytdl = require('@distube/ytdl-core');
const exec = require('youtube-dl-exec');
const { spawn } = require('child_process');
const ytdlp = require('yt-dlp-exec');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    StreamType
} = require('@discordjs/voice');
const path = require('path');

const queues = new Map();
const voiceConnecting = new Map();  // Prevent concurrent connection attempts
const ffmpegProcesses = new Set();  // Track all ffmpeg processes for cleanup


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

    // Kill any active ffmpeg process
    if (queue.ffmpegProcess) {
        try {
            queue.ffmpegProcess.kill('SIGTERM');
            ffmpegProcesses.delete(queue.ffmpegProcess);
        } catch (e) {
            // Already killed
        }
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
                let ffmpegError = null;  // Declare here so it's always available

                if (extractionMethod === 3) {
                    // Try youtube-dl-exec with geo-bypass
                    try {
                        const http = require('http');
                        const https = require('https');

                        // Try multiple format options
                        const formatOptions = [
                            'bestaudio',              // Primary: best audio only
                            'best[ext=m4a]/best',     // Fallback: best m4a or best
                            'best',                   // Last resort: best overall
                        ];

                        let info = null;
                        let lastErr = null;

                        for (const format of formatOptions) {
                            try {
                                info = await exec(streamUrl, {
                                    dumpSingleJson: true,
                                    noWarnings: true,
                                    format: format,
                                    geoBypass: true,
                                    geoBypassCountry: 'VN',
                                    noCheckCertificates: true,
                                    preferFreeFormats: true,
                                    ignoreErrors: true
                                }).catch(() => null);

                                if (info?.url) {
                                    break;  // Found valid stream
                                }
                                lastErr = `No URL for format: ${format}`;
                            } catch (e) {
                                lastErr = e.message;
                            }
                        }

                        if (!info || !info.url) {
                            throw new Error(lastErr || 'youtube-dl-exec: No playable stream');
                        }

                        const directUrl = info.url;
                        console.log(`📡 Got stream URL from youtube-dl-exec: ${directUrl.substring(0, 50)}...`);

                        // Get raw audio stream (ffmpeg handles redirects automatically)
                        const audioStream = await new Promise((resolve, reject) => {
                            const protocol = directUrl.startsWith('https') ? https : http;
                            const req = protocol.get(directUrl, {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                },
                                timeout: 15000,
                                followRedirect: true
                            }, (res) => {
                                // Accept any 2xx or 3xx status (redirects)
                                if (res.statusCode >= 400) {
                                    reject(new Error(`HTTP ${res.statusCode}`));
                                } else {
                                    res.on('error', (err) => {
                                        // Handle network errors like ECONNRESET
                                        if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
                                            reject(new Error(`Network error: ${err.code}`));
                                        } else {
                                            reject(err);
                                        }
                                    });
                                    resolve(res);
                                }
                            });

                            req.on('error', (err) => {
                                // Handle connection errors gracefully
                                if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
                                    reject(new Error(`Network error: ${err.code}`));
                                } else {
                                    reject(err);
                                }
                            });

                            req.on('timeout', () => {
                                req.destroy();
                                reject(new Error('Stream connection timeout'));
                            });

                            req.on('abort', () => {
                                reject(new Error('Stream connection aborted'));
                            });

                        });

                        // Pipe through ffmpeg to convert to proper audio format
                        const ffmpeg = require('ffmpeg-static');
                        const ffmpegProcess = spawn(ffmpeg, [
                            '-i', 'pipe:0',
                            '-f', 's16le',
                            '-ar', '48000',
                            '-ac', '2',
                            'pipe:1'
                        ], {
                            stdio: ['pipe', 'pipe', 'pipe']  // Capture stderr to detect errors
                        });

                        // Track for cleanup
                        ffmpegProcesses.add(ffmpegProcess);
                        queue.ffmpegProcess = ffmpegProcess;

                        // Handle FFmpeg stderr for diagnostics
                        let ffmpegErrorMsg = null;
                        ffmpegProcess.stderr?.on('data', (data) => {
                            const msg = data.toString();
                            if (msg.includes('Invalid') || msg.includes('error') || msg.includes('Invalid key frame') || msg.includes('not found')) {
                                ffmpegErrorMsg = new Error(`FFmpeg error: ${msg.split('\n')[0]}`);
                                ffmpegError = ffmpegErrorMsg;
                            }
                            // console.log(`📡 FFmpeg outputting: ${data.length} bytes`);
                        });

                        ffmpegProcess.on('error', (err) => {
                            ffmpegError = err;
                            console.error('❌ FFmpeg spawn error:', err.message);
                        });

                        ffmpegProcess.on('exit', (code) => {
                            ffmpegProcesses.delete(ffmpegProcess);
                            queue.ffmpegProcess = null;
                            // Don't log exit codes - FFmpeg exits for various reasons
                            // Only set error state if player is still active
                            if (code !== 0 && code !== null && queue.playing) {
                                // FFmpeg crashed while playing - stop the player to move to next song
                                try {
                                    queue.player.stop();
                                } catch (e) {
                                    // Already stopped
                                }
                            }
                        });

                        // Pipe with error handling - gracefully handle stream errors
                        audioStream.on('error', (err) => {
                            // Log but don't throw - let the stream end normally
                            // The FFmpeg will handle any data that was piped before the error
                            if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
                                console.warn(`⚠️ Audio stream disconnected (${err.code})`);
                            } else {
                                console.warn(`⚠️ Audio stream error: ${err.message}`);
                            }
                            // Signal end of input to FFmpeg gracefully
                            ffmpegProcess.stdin?.end?.();
                        });

                        ffmpegProcess.stdin?.on('error', (err) => {
                            if (err.code !== 'EPIPE') {
                                console.error('❌ FFmpeg stdin error:', err.message);
                            }
                        });

                        // Monitor stdout for flow
                        ffmpegProcess.stdout?.on('data', (chunk) => {
                            if (!queue.ffmpegProducingOutput) {
                                console.log(`✓ FFmpeg producing output (${chunk.length} bytes)`);
                                queue.ffmpegProducingOutput = true;
                            }
                        });

                        // Cleanup on stdout end/close
                        ffmpegProcess.stdout?.on('end', () => {
                            ffmpegProcesses.delete(ffmpegProcess);
                            queue.ffmpegProcess = null;
                        });

                        ffmpegProcess.stdout?.on('close', () => {
                            // Expected when skipping
                            ffmpegProcesses.delete(ffmpegProcess);
                            if (queue.ffmpegProcess === ffmpegProcess) {
                                queue.ffmpegProcess = null;
                            }
                        });

                        ffmpegProcess.stdout?.on('error', (err) => {
                            // Silently ignore expected errors from skipping/stopping
                            if (err.code === 'ERR_STREAM_PREMATURE_CLOSE' || err.code === 'EPIPE' || err.code === 'ECONNRESET') {
                                // Expected when skipping - don't log
                                return;
                            }
                            console.error('❌ FFmpeg stdout error:', err.message);
                        });

                        try {
                            audioStream.pipe(ffmpegProcess.stdin);
                        } catch (pipeErr) {
                            console.warn('⚠️ Pipe error:', pipeErr.message);
                            ffmpegProcess.kill();
                            ffmpegProcesses.delete(ffmpegProcess);
                            // Don't throw - let next method try
                        }

                        // CRITICAL: Use FFmpeg output (PCM) as the audio stream, not the input
                        stream = ffmpegProcess.stdout;

                    } catch (fallbackErr) {
                        console.warn(`❌ youtube-dl-exec failed:`, fallbackErr.message);
                        throw fallbackErr;
                    }
                } else if (extractionMethod === 2) {
                    // Try play-dl
                    console.log(`⚠️ Trying fallback #1: play-dl.stream()`);
                    try {
                        stream = await play.stream(streamUrl);
                        if (!stream) throw new Error('play-dl returned null');
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
                        filter: 'audioonly',
                        requestOptions: {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                            }
                        }
                    });
                }

                // For FFmpeg (method 3), skip validation - let Discord handle errors  
                // For other methods, validate before creating resource
                if (extractionMethod !== 3) {
                    await new Promise((resolve, reject) => {
                        let isResolved = false;

                        stream.on('error', (err) => {
                            if (!isResolved) {
                                isResolved = true;
                                console.warn(`⚠️ Stream error: ${err.message}`);
                                reject(err);
                            }
                        });

                        stream.once('readable', () => {
                            if (!isResolved) {
                                isResolved = true;
                                console.log('✓ Stream readable');
                                resolve();
                            }
                        });

                        stream.once('data', () => {
                            if (!isResolved) {
                                isResolved = true;
                                console.log('✓ Stream producing data');
                                resolve();
                            }
                        });

                        stream.once('close', () => {
                            if (!isResolved) {
                                isResolved = true;
                                reject(new Error('Stream closed unexpectedly'));
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
                } else {
                    // FFmpeg method: just ensure piping completed
                    console.log('✓ FFmpeg pipeline established');
                    await new Promise(r => setTimeout(r, 500));  // Give FFmpeg time to start
                }

                const resource = createAudioResource(stream, {
                    inputType: extractionMethod === 3 ? StreamType.Raw : StreamType.Arbitrary,
                    inlineVolume: true
                });

                if (resource.volume) {
                    resource.volume.setVolume(queue.volume / 100);
                }
                queue.player.play(resource);
                if (queue.connection && !queue.subscribed) {
                    queue.connection.subscribe(queue.player);
                    queue.subscribed = true; // Đánh dấu để không subscribe nhiều lần
                }

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

        console.warn("⚠️ Could not extract audio from this video");
        queue.tracks.shift();
        return playNext(queue);

    } catch (err) {
        console.warn("⚠️ Play error:", err.message);
        queue.tracks.shift();
        return playNext(queue);
    }
}

process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || reason?.code || String(reason);
    // Silently ignore all expected network/stream errors
    if (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) return;
    if (msg.includes('EPIPE') || msg.includes('aborted')) return;
    if (msg.includes('Premature close') || msg.includes('Destroyed')) return;
    // Ignore unknown errors - don't spam console
});

process.on('uncaughtException', (err) => {
    const msg = err?.message || String(err);
    if (msg.includes('ECONNRESET') || msg.includes('EPIPE') || msg.includes('aborted')) return;
    if (msg.includes('Premature close')) return;
    // Prevent hard crash
});

async function createQueue(message) {
    const guildId = message.guild.id;

    // Check if already connecting
    if (voiceConnecting.has(guildId)) {
        throw new Error("Voice connection already in progress");
    }

    const existingQueue = queues.get(guildId);
    if (existingQueue && existingQueue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        return existingQueue;
    }

    voiceConnecting.set(guildId, true);

    try {
        const voiceChannel = message.member.voice.channel;
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        // Retry logic for voice connection
        let retries = 3;
        let lastErr;

        while (retries > 0) {
            try {
                await entersState(connection, VoiceConnectionStatus.Ready, 45_000);
                break;  // Success
            } catch (err) {
                lastErr = err;
                retries--;
                if (retries > 0) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }

        if (retries === 0) {
            throw lastErr;
        }

        const player = createAudioPlayer();
        connection.subscribe(player);

        const queue = {
            guildId,
            voiceChannel: message.member.voice.channel,
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
                if (queue.loop === 1) {
                    // Loop current track
                    const currentTrack = queue.tracks[0];
                    if (currentTrack) {
                        queue.tracks.shift();
                        queue.tracks.unshift(currentTrack);
                    }
                } else if (queue.loop === 2) {
                    // Loop all tracks
                    const currentTrack = queue.tracks.shift();
                    if (currentTrack) {
                        queue.tracks.push(currentTrack);
                    }
                } else {
                    // No loop
                    queue.tracks.shift();
                }
                await playNext(queue);
            }
        });

        player.on('error', () => {
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
    } catch (err) {
        console.error("❌ Voice connection failed:", err.message);
        voiceConnecting.delete(guildId);
        throw new Error("Voice connection failed");
    } finally {
        voiceConnecting.delete(guildId);
    }
}


async function addSong(message, url) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('❌ Please join voice channel first!');

    try {
        let queue = await createQueue(message);

        // 1. Join Voice Channel
        if (!queue.connection) {
            console.log('🔗 Connecting to Voice Channel...');
            queue.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            try {
                await entersState(queue.connection, VoiceConnectionStatus.Ready, 5_000);
                console.log('✅ Voice Connection Ready');
            } catch (connErr) {
                console.error('❌ Connection Timeout:', connErr);
                if (queue.connection) queue.connection.destroy();
                queue.connection = null;
                return message.reply('❌ Could not connect to voice channel!');
            }
        }

        console.log(`📥 Fetching info with yt-dlp: ${url}`);
        const cookiesPath = path.join(__dirname, '../../cookies.txt');

        let track;
        try {
            // 2. CHỖ SỬA: Dùng yt-dlp với Cookie để lấy metadata
            const details = await ytdlp(url, {
                dumpSingleJson: true,
                noWarnings: true,
                noCheckCertificates: true,
                cookies: cookiesPath,
                addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0']
            });

            track = {
                title: details.title || 'Unknown Title',
                url: details.webpage_url || url,
                duration: details.duration_string || '',
                channel: details.uploader || 'Unknown'
            };
        } catch (metadataErr) {
            // 3. CHIẾN THUẬT BẤT TỬ: Nếu lỗi Metadata (Sign in), vẫn tạo track để phát
            console.warn('⚠️ Metadata Error (Bot detection?):', metadataErr.message);
            track = {
                title: "Requested Music (No Metadata)",
                url: url,
                duration: '??:??',
                channel: 'YouTube'
            };
            message.channel.send('⚠️ Cannot fetch video info, but I will try to play it anyway!');
        }

        queue.tracks.push(track);
        console.log(`✅ Added song: "${track.title}" (Queue: ${queue.tracks.length})`);

        if (!queue.playing) {
            queue.playing = true;
            console.log('▶️ Starting playback...');
            // Đảm bảo playNext dùng youtube-dl-exec hoặc yt-dlp để lấy stream
            await playNext(queue).catch(err => {
                console.error('❌ PlayNext Error:', err);
                queue.playing = false;
            });
        }

        return track;

    } catch (err) {
        console.error('❌ Critical Error in addSong:', err);
        message.reply('❌ Bot encountered an error while processing.');
        return null;
    }
}




function skip(guildId) {
    const queue = queues.get(guildId);
    if (!queue || !queue.playing) return false;

    // Stop player immediately
    queue.player.stop();

    // Kill FFmpeg process if running
    if (queue.ffmpegProcess) {
        try {
            // Just send SIGTERM - don't destroy streams
            queue.ffmpegProcess.kill('SIGTERM');
            ffmpegProcesses.delete(queue.ffmpegProcess);
            queue.ffmpegProcess = null;
        } catch (e) {
            ffmpegProcesses.delete(queue.ffmpegProcess);
            queue.ffmpegProcess = null;
        }
    }

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

function setLoop(guildId, mode) {
    const queue = queues.get(guildId);
    if (!queue) return null;
    queue.loop = mode; // 0: no loop, 1: loop current, 2: loop all
    return queue.loop;
}

function getLoop(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return null;
    return queue.loop;
}

function setVolume(guildId, volume) {
    const queue = queues.get(guildId);
    if (!queue) return null;
    volume = Math.max(1, Math.min(100, volume));
    queue.volume = volume;

    // Update current resource volume if playing
    if (queue.player.state?.resource?.volume) {
        queue.player.state.resource.volume.setVolume(queue.volume / 100);
    }
    return queue.volume;
}

function getVolume(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return null;
    return queue.volume;
}

// Periodic cleanup for zombie processes (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    ffmpegProcesses.forEach((proc) => {
        if (!proc.connected && proc.exitCode === null) {
            try {
                // Process is dead but wasn't cleaned up
                proc.kill('SIGKILL');
            } catch (e) { }
            ffmpegProcesses.delete(proc);
        }
    });

    // Cleanup inactive queues
    queues.forEach((queue, guildId) => {
        if (!queue.playing && queue.tracks.length === 0) {
            // Auto-cleanup empty queues after 10 minutes  
            if (!queue.idleTimer) {
                queue.idleTimer = now;
            } else if (now - queue.idleTimer > 600000) {
                destroyQueue(guildId);
            }
        } else {
            queue.idleTimer = null;
        }
    });

    // Force garbage collection hint
    if (global.gc) {
        global.gc();
    }
}, 300000);

// Memory monitor (every 30 minutes)
setInterval(() => {
    const mem = process.memoryUsage();
    console.log(`📊 Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB | FFmpeg: ${ffmpegProcesses.size} | Queues: ${queues.size}`);
}, 1800000);

module.exports = {
    initializePlayer,
    addSong,
    skip,
    pause,
    resume,
    getQueue,
    destroyQueue,
    setLoop,
    getLoop,
    setVolume,
    getVolume,
    getCacheKey(query, source) {
        return `${source}:${query.toLowerCase()}`;
    }
};