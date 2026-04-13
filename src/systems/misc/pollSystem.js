//======================================================================
//                          POLL SYSTEM
//======================================================================

const { EmbedBuilder } = require('discord.js');

// Global poll storage
const activePolls = new Map();

function parseTime(text) {
  const match = text.match(/(\d+)([smh])/);
  if (!match) return null;

  const num = parseInt(match[1]);
  const unit = match[2];

  if (unit === 's') return num * 1000;
  if (unit === 'm') return num * 60000;
  if (unit === 'h') return num * 3600000;

  return null;
}

async function closePollInternal(channel, messageId) {
  if (!activePolls.has(messageId)) return;

  const poll = activePolls.get(messageId);
  if (poll.closed) return;

  poll.closed = true;

  const embed = new EmbedBuilder()
    .setTitle('Poll Closed')
    .setColor(0xFF0000);

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

  await channel.send({ embeds: [embed] });
}

async function onReactionAdd(reaction, user) {
  if (user.bot) return;

  const msgId = reaction.message.id;
  if (!activePolls.has(msgId)) return;

  const poll = activePolls.get(msgId);
  if (poll.closed) return;

  const emoji = reaction.emoji.toString();
  if (!poll.votes[emoji]) return;

  if (poll.multiple) {
    // Multiple choice - can vote for multiple options
    if (!poll.votes[emoji].includes(user.id)) {
      poll.votes[emoji].push(user.id);
    }
  } else {
    // Single choice - remove from other options
    for (const e of Object.keys(poll.votes)) {
      const index = poll.votes[e].indexOf(user.id);
      if (index > -1) {
        poll.votes[e].splice(index, 1);
      }
    }
    poll.votes[emoji].push(user.id);
  }
}

function setup(client) {
  console.log('✅ Poll system loaded');
}

module.exports = {
  setup,
  activePolls,
  parseTime,
  closePollInternal,
  onReactionAdd
};
