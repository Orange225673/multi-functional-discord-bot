const play = require('play-dl');
const ytSearch = require('yt-search');
const service = require('./musicService');
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 2;

function cleanQuery(q) {
    return String(q || '').trim();
}

function shorten(text, max = 60) {
    const s = String(text || '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function formatResult(video, source) {
    return {
        title: video.title,
        url: video.url,
        duration: video.timestamp || video.durationRaw || '',
        channel: video.author?.name || video.channel?.name || 'YouTube',
        source
    };
}

async function searchYouTube(query, limit = 10) {
    try {
        const res = await ytSearch(cleanQuery(query));
        const results = res.videos
            .slice(0, limit)
            .filter(video => video.url)
            .map(video => formatResult(video, 'youtube'));

        console.log(`✅ Found ${results.length} valid YouTube results`);
        return results;
    } catch (err) {
        console.error('❌ YouTube search error:', err.message);
        return [];
    }
}

async function searchBySource(query, source, limit = 10) {
    const key = service.getCacheKey(query, source);

    if (cache.has(key)) {
        const data = cache.get(key);
        if (Date.now() < data.expire) {
            return data.results;
        }
        cache.delete(key);
    }

    let results = [];
    try {
        if (source === 'youtube') {
            results = await searchYouTube(query, limit);
        }
    } catch (err) {
        console.error('Search fail → fallback to youtube:', err);
        results = await searchYouTube(query, limit);
    }

    cache.set(key, {
        results,
        expire: Date.now() + CACHE_TTL
    });

    return results;
}

module.exports = {
    searchBySource,
    shorten
};