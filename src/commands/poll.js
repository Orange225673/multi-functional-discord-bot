//======================================================================
//                      POLL COMMANDS
//======================================================================

const { EmbedBuilder } = require('discord.js');
const { activePolls, parseTime, closePollInternal } = require('../systems/misc/pollSystem');

module.exports = {
  name: 'poll',
  category: 'Utility',
  description: 'Create a poll',
  aliases: [],

  async execute(message, args, client) {
    if (args.length === 0) {
      return message.reply('❌ Usage: `%poll [time] <question>` or `%poll [time] multiple <question> | <option1> | <option2> | ...`');
    }

    let duration = null;
    let startIdx = 0;

    // Check if first arg is time
    const firstArgTime = parseTime(args[0]);
    if (firstArgTime) {
      duration = firstArgTime;
      startIdx = 1;
    }

    const content = args.slice(startIdx).join(' ');

    if (content.toLowerCase().startsWith('multiple')) {
      // Multiple choice poll
      const parts = content.split('|').map(p => p.trim());
      const question = parts[0].replace(/^multiple/i, '').trim();
      const options = parts.slice(1);

      if (options.length < 2) {
        return message.reply('❌ Need at least 2 options! Format: `%poll multiple <question> | 🎮 Option1 | 🎵 Option2`');
      }

      const embed = new EmbedBuilder()
        .setTitle('Multiple-Choice Poll')
        .setDescription(question)
        .setColor(0x0099FF)
        .setFooter({ text: `Poll by ${message.author.username}` });

      const msg = await message.channel.send({ embeds: [embed] });

      const votes = {};

      for (const opt of options) {
        try {
          const emoji = opt.split(' ')[0];
          await msg.react(emoji);
          votes[emoji] = [];
        } catch (err) {
          console.error('Failed to add reaction:', err);
        }
      }

      activePolls.set(msg.id, {
        multiple: true,
        votes,
        closed: false
      });

      if (duration) {
        setTimeout(async () => {
          await closePollInternal(message.channel, msg.id);
        }, duration);
      }
    } else {
      // Yes/No poll
      const embed = new EmbedBuilder()
        .setTitle('Poll')
        .setDescription(content)
        .setColor(0x0099FF)
        .setFooter({ text: `Poll by ${message.author.username}` });

      const msg = await message.channel.send({ embeds: [embed] });
      await msg.react('👍');
      await msg.react('👎');

      activePolls.set(msg.id, {
        multiple: false,
        votes: { '👍': [], '👎': [] },
        closed: false
      });

      if (duration) {
        setTimeout(async () => {
          await closePollInternal(message.channel, msg.id);
        }, duration);
      }
    }
  }
};

// Close poll command
const closepoll = {
  name: 'closepoll',
  category: 'Utility',
  description: 'Close a poll',

  async execute(message, args, client) {
    if (args.length === 0) {
      return message.reply('❌ Usage: `%closepoll <message_id>`');
    }

    const messageId = args[0];

    if (!activePolls.has(messageId)) {
      return message.reply('❌ Poll not found!');
    }

    await closePollInternal(message.channel, messageId);
    await message.react('✅');
  }
};

// Results command
const results = {
  name: 'results',
  category: 'Utility',
  description: 'Show poll results',

  async execute(message, args, client) {
    if (args.length === 0) {
      return message.reply('❌ Usage: `%results <message_id>`');
    }

    const messageId = args[0];

    if (!activePolls.has(messageId)) {
      return message.reply('❌ Poll not found!');
    }

    const poll = activePolls.get(messageId);
    const embed = new EmbedBuilder()
      .setTitle('Poll Results')
      .setColor(0x00FF00);

    let totalVotes = 0;
    for (const voters of Object.values(poll.votes)) {
      totalVotes += voters.length;
    }

    if (totalVotes === 0) totalVotes = 1;

    for (const [emoji, voters] of Object.entries(poll.votes)) {
      const percent = (voters.length / totalVotes) * 100;
      embed.addFields({
        name: emoji,
        value: `${voters.length} votes (${percent.toFixed(1)}%)`,
        inline: false
      });
    }

    await message.channel.send({ embeds: [embed] });
  }
};

function setup(client) {
  client.commands.set('poll', module.exports);
  client.commands.set('closepoll', closepoll);
  client.commands.set('results', results);

  console.log('✅ Poll commands registered');
}

module.exports.closepoll = closepoll;
module.exports.results = results;
module.exports.setup = setup;
