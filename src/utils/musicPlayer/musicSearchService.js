const play = require('play-dl');

function cleanQuery(q) {
    return String(q || '').trim();
}

function shorten(text, max = 60) {
    const s = String(text || '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

async function searchYouTube(query, limit = 10) {
    const results = await play.search(cleanQuery(query), { limit });

    return results.map((r) => ({
        title: r.title,
        url: r.url,
        duration: r.durationRaw || '??:??',
        channel: r.channel?.name || 'Unknown',
        source: 'youtube'
    }));
}

/**
 * The function `searchSpotify` searches for tracks on Spotify based on a query and returns relevant
 * information about the tracks.
 * @param query - The `query` parameter is the search term that you want to use to search for tracks on
 * Spotify. It can be a song title, artist name, album name, or any other keyword related to music that
 * you want to search for.
 * @param [limit=10] - The `limit` parameter in the `searchSpotify` function specifies the maximum
 * number of search results to return from the Spotify search. By default, if the `limit` parameter is
 * not provided, it is set to 10. This means that the function will return up to 10 search results
 * @returns The `searchSpotify` function is returning an array of objects with the following properties
 * for each result: `title`, `url`, `duration`, `channel`, and `source`. The `title` is the title of
 * the result, `url` is the URL of the result, `duration` is the duration of the result in a specific
 * format or `??:??` if not available
 */
async function searchSpotify(query, limit = 10) {
    const q = cleanQuery(query);

    const results = await play.search(q, { limit });

    return results.map((r) => ({
        title: r.title,
        url: r.url,
        duration: r.durationRaw || '??:??',
        channel: r.channel?.name || 'Unknown',
        source: 'spotify'
    }));
}

async function searchOther(query, limit = 10) {
    const results = await play.search(cleanQuery(query), { limit });

    return results.map((r) => ({
        title: r.title,
        url: r.url,
        duration: r.durationRaw || '??:??',
        channel: r.channel?.name || 'Unknown',
        source: 'other'
    }));
}

async function searchBySource(query, source, limit = 10) {
    const key = getCacheKey(query, source);

    // ✅ Check cache
    if (cache.has(key)) {
        const data = cache.get(key);

        // còn hạn
        if (Date.now() < data.expire) {
            return data.results;
        }

        // hết hạn → xóa
        cache.delete(key);
    }

    // ❗ nếu không có cache → gọi API
    let results = [];

    if (source === 'youtube') {
        results = await searchYouTube(query, limit);
    } else if (source === 'spotify') {
        results = await searchSpotify(query, limit);
    } else {
        results = await searchOther(query, limit);
    }

    // ✅ Save cache
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