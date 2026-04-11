const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const play = require("play-dl")

const queues = new Map()
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 5;

function getCacheKey(query, source) {
    return `${source}:${query.toLowerCase()}`;
}

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, {
            connection: null,
            player: createAudioPlayer(),
            songs: [],
            playing: false
        });
    }
    return queues.get(guildId);
}

async function playSong(guild, song) {
    const queue = getQueue(guild.id);
    if (!song) {
        queue.playing = false;
        return;
    }

    try {
        const stream = await play.stream(song.url);

        const resource = createAudioResource(stream.stream, {
            inputType: stream.type
        });

        queue.player.play(resource);
        queue.connection.subscribe(queue.player);

        queue.playing = true;

        queue.player.once(AudioPlayerStatus.Idle, () => {
            queue.songs.shift();
            playSong(guild, queue.songs[0]);
        });

    } catch (err) {
        console.error("Play error:", err);
        queue.songs.shift();
        playSong(guild, queue.songs[0]);
    }
}

async function addSong(message, url) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply("❌ Please join voice channel first!");

    const queue = getQueue(message.guild.id);

    if (!queue.connection) {
        queue.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator
        });
    }

    const info = await play.video_basic_info(url);

    const song = {
        title: info.video_details.title,
        url: url
    };

    queue.songs.push(song);

    if (!queue.playing) {
        playSong(message.guild, queue.songs[0]);
    }

    return song;
}

function skip(guildId) {
    const queue = getQueue(guildId);
    queue.player.stop();
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
    addSong,
    skip,
    pause,
    resume
};