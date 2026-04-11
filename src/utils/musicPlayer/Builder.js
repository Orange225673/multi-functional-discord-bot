
const music = require('../../utils/musicPlayer/musicService');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const PAGE_SIZE = 5;

function buildEmbed(query, source, tracks, page, selectedIndex) {
    const start = page * PAGE_SIZE;
    const pageItems = tracks.slice(start, start + PAGE_SIZE);

    const lines = pageItems.map((t, i) => {
        const realIndex = start + i;
        const mark = realIndex === selectedIndex ? '👉' : '•';
        return `${mark} **${realIndex + 1}.** ${t.title}\n   \`${t.duration}\` • ${t.channel}`;
    });

    return new EmbedBuilder()
        .setTitle('🎵 Music Search')
        .setDescription(
            [
                `**Query:** ${query}`,
                `**Source:** ${source.toUpperCase()}`,
                '',
                lines.length ? lines.join('\n') : 'No results found.'
            ].join('\n')
        )
        .setColor(0x5865F2)
        .setFooter({ text: `${tracks.length} results • page ${page + 1}` });
}

function buildSourceRow(source) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_src_youtube')
            .setLabel('YouTube')
            .setStyle(source === 'youtube' ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
}

function buildNavRow(page, tracks) {
    const maxPage = Math.max(0, Math.ceil(tracks.length / PAGE_SIZE) - 1);

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_prev')
            .setLabel('◀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId('music_next')
            .setLabel('▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= maxPage),
        new ButtonBuilder()
            .setCustomId('music_play')
            .setLabel('Play')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('music_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
    );
}

function buildSelectMenu(tracks, page, selectedIndex) {
    const start = page * PAGE_SIZE;
    const pageItems = tracks.slice(start, start + PAGE_SIZE);

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('music_pick')
            .setPlaceholder('Select a song/video...')
            .addOptions(
                pageItems.map((t, i) => {
                    const realIndex = start + i;
                    return {
                        label: t.title.slice(0, 100),
                        description: `${t.duration} • ${t.channel}`.slice(0, 100),
                        value: String(realIndex),
                        default: realIndex === selectedIndex
                    };
                })
            )
    );
}

function buildComponents(source, tracks, page, selectedIndex) {
    return [
        buildSourceRow(source),
        buildSelectMenu(tracks, page, selectedIndex),
        buildNavRow(page, tracks)
    ];
}

function getSelectedTrack(tracks, selectedIndex) {
    return tracks[selectedIndex] || null;
}

module.exports = {
    buildEmbed,
    buildComponents,
    buildSelectMenu,
    buildSourceRow,
    buildNavRow
}