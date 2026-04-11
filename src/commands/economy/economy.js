//======================================================================
//                   ECONOMY COMMANDS (DATABASE VERSION)
//======================================================================

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { ECONOMY_CONFIG, checkCooldown } = require('../../systems/economySystem');
const DatabaseManager = require('../../utils/DatabaseManager');

const dbManager = new DatabaseManager();

function weightedRandom(outcomes) {
  const items = Object.keys(outcomes);
  const weights = items.map(item => outcomes[item].weight);

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

// ============ GAMBLE COMMAND ============
const gamble = {
  name: 'gbl',
  category: 'Economy',
  description: 'Gamble your money with various outcomes',
  aliases: ['gamble'],

  data: new SlashCommandBuilder()
    .setName('gbl')
    .setDescription('Gamble your money')
    .addStringOption(opt => opt
      .setName('amount')
      .setDescription('Amount to gamble (or "all")')
      .setRequired(true)
    ),

  async execute(interaction, client, config) {
    if (!interaction || !interaction.guild) return;
    const cooldown = checkCooldown(interaction.user.id, 'gbl', 2);
    if (cooldown.onCooldown) {
      return interaction.reply({
        content: `⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`,
        ephemeral: true
      });
    }

    const amount = interaction.options.getString('amount');
    let userBalance = dbManager.getBalance(interaction.guild.id, interaction.user.id);

    let betAmount;
    let isAllIn = false;

    if (amount.toLowerCase() === 'all') {
      if (userBalance < ECONOMY_CONFIG.MIN_BET) {
        return interaction.reply(`You need at least **$${ECONOMY_CONFIG.MIN_BET.toLocaleString()}** to gamble all!`);
      }
      betAmount = userBalance;
      isAllIn = true;
    } else {
      betAmount = parseInt(amount);

      if (isNaN(betAmount)) {
        return interaction.reply('Invalid amount! Use a number or `all`');
      }

      if (betAmount < ECONOMY_CONFIG.MIN_BET) {
        return interaction.reply(`Minimum bet is **$${ECONOMY_CONFIG.MIN_BET.toLocaleString()}**!`);
      }

      if (betAmount > ECONOMY_CONFIG.MAX_BET) {
        return interaction.reply(`Maximum bet is **$${ECONOMY_CONFIG.MAX_BET.toLocaleString()}**! Use \`/gbl all\` to bet everything.`);
      }
    }

    if (betAmount > userBalance) {
      return interaction.reply(`You don't have enough balance! You only have **$${userBalance.toLocaleString()}**`);
    }

    // Gambling outcomes
    const outcome = weightedRandom(ECONOMY_CONFIG.GAMBLING_OUTCOMES);
    const multiplier = ECONOMY_CONFIG.GAMBLING_OUTCOMES[outcome].multiplier;

    let resultText;
    let resultColor;

    if (multiplier < 0) {
      userBalance -= betAmount;
      resultText = `💸 You lost **$${betAmount.toLocaleString()}**!`;
      resultColor = 0xFF0000; // Red
    } else {
      const winnings = betAmount * multiplier;
      userBalance += winnings;

      if (outcome === 'win') {
        resultText = `✅ You won **$${winnings.toLocaleString()}**!`;
        resultColor = 0x00FF00; // Green
      } else if (outcome === 'big_win') {
        resultText = `🎉 Big Win! You won **$${winnings.toLocaleString()}**!`;
        resultColor = 0x0000FF; // Blue
      } else if (outcome === 'very_high_win') {
        resultText = `🌟 Very High Win! You won **$${winnings.toLocaleString()}**!`;
        resultColor = 0x800080; // Purple
      } else if (outcome === 'jackpot_win') {
        resultText = `💰 JACKPOT WIN! You won **$${winnings.toLocaleString()}**!`;
        resultColor = 0xFFD700; // Gold
      } else if (outcome === 'LEGENDARY') {
        resultText = `🔥💎 **LEGENDARY WIN!!** 💎🔥\n**YOU WON $${winnings.toLocaleString()}!!**\n✨ You're a LEGEND! ✨`;
        resultColor = 0xFFD700; // Gold
      }
    }

    // Save balance to database
    dbManager.setBalance(interaction.guild.id, interaction.user.id, userBalance);

    // Create progress bar
    const progressBarLength = 30;
    const maxBalance = 1e50; // Match Python's huge number
    const filledLength = Math.min(
      Math.floor(progressBarLength * (userBalance / maxBalance)),
      progressBarLength
    );
    const bar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('🎰 Gambling Results')
      .setColor(resultColor)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .addFields(
        {
          name: '💵 Bet Amount',
          value: isAllIn ? `**ALL IN:** $${betAmount.toLocaleString()}` : `**$${betAmount.toLocaleString()}**`,
          inline: false
        },
        { name: '🎲 Result', value: resultText, inline: false },
        { name: '💰 New Balance', value: `**$${userBalance.toLocaleString()}**`, inline: false },
        { name: '📊 Balance Progress', value: `\`[${bar}]\``, inline: false }
      )
      .setFooter({ text: 'Gamble responsibly! Use /gbl all to bet everything!' });

    await interaction.reply({ embeds: [embed] });
  },

  async run(message, args, client, config) {
    const cooldown = checkCooldown(message.author.id, 'gbl', 2);
    if (cooldown.onCooldown) {
      return message.reply(`⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`);
    }

    if (args.length === 0) {
      return message.reply('Usage: `%gbl <amount>` or `%gbl all`');
    }

    const amount = args[0];
    let userBalance = dbManager.getBalance(message.guild.id, message.author.id);

    let betAmount;
    let isAllIn = false;

    if (amount.toLowerCase() === 'all') {
      if (userBalance < ECONOMY_CONFIG.MIN_BET) {
        return message.reply(`You need at least **$${ECONOMY_CONFIG.MIN_BET.toLocaleString()}** to gamble all!`);
      }
      betAmount = userBalance;
      isAllIn = true;
    } else {
      betAmount = parseInt(amount);

      if (isNaN(betAmount)) {
        return message.reply('Invalid amount! Use a number or `all`');
      }

      if (betAmount < ECONOMY_CONFIG.MIN_BET) {
        return message.reply(`Minimum bet is **$${ECONOMY_CONFIG.MIN_BET.toLocaleString()}**!`);
      }

      if (betAmount > ECONOMY_CONFIG.MAX_BET) {
        return message.reply(`Maximum bet is **$${ECONOMY_CONFIG.MAX_BET.toLocaleString()}**! Use \`%gbl all\` to bet everything.`);
      }
    }

    if (betAmount > userBalance) {
      return message.reply(`You don't have enough balance! You only have **$${userBalance.toLocaleString()}**`);
    }

    // Gambling outcomes
    const outcome = weightedRandom(ECONOMY_CONFIG.GAMBLING_OUTCOMES);
    const multiplier = ECONOMY_CONFIG.GAMBLING_OUTCOMES[outcome].multiplier;

    let resultText;
    let resultColor;

    if (multiplier < 0) {
      userBalance -= betAmount;
      resultText = `💸 You lost **$${betAmount.toLocaleString()}**!`;
      resultColor = 0xFF0000;
    } else {
      const winnings = betAmount * multiplier;
      userBalance += winnings;

      if (outcome === 'win') {
        resultText = `✅ You won **$${winnings.toLocaleString()}**!`;
        resultColor = 0x00FF00;
      } else if (outcome === 'big_win') {
        resultText = `🎉 Big Win! You won **$${winnings.toLocaleString()}**!`;
        resultColor = 0x0000FF;
      } else if (outcome === 'very_high_win') {
        resultText = `🌟 Very High Win! You won **$${winnings.toLocaleString()}**!`;
        resultColor = 0x800080;
      } else if (outcome === 'jackpot_win') {
        resultText = `💰 JACKPOT WIN! You won **$${winnings.toLocaleString()}**!`;
        resultColor = 0xFFD700;
      } else if (outcome === 'LEGENDARY') {
        resultText = `🔥💎 **LEGENDARY WIN!!** 💎🔥\n**YOU WON $${winnings.toLocaleString()}!!**\n✨ You're a LEGEND! ✨`;
        resultColor = 0xFFD700;
      }
    }

    // Save balance to database
    dbManager.setBalance(message.guild.id, message.author.id, userBalance);

    // Create progress bar
    const progressBarLength = 30;
    const maxBalance = 1e50;
    const filledLength = Math.min(
      Math.floor(progressBarLength * (userBalance / maxBalance)),
      progressBarLength
    );
    const bar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('🎰 Gambling Results')
      .setColor(resultColor)
      .setAuthor({
        name: message.author.username,
        iconURL: message.author.displayAvatarURL()
      })
      .addFields(
        {
          name: '💵 Bet Amount',
          value: isAllIn ? `**ALL IN:** $${betAmount.toLocaleString()}` : `**$${betAmount.toLocaleString()}**`,
          inline: false
        },
        { name: '🎲 Result', value: resultText, inline: false },
        { name: '💰 New Balance', value: `**$${userBalance.toLocaleString()}**`, inline: false },
        { name: '📊 Balance Progress', value: `\`[${bar}]\``, inline: false }
      )
      .setFooter({ text: 'Gamble responsibly! Use %gbl all to bet everything!' });

    await message.reply({ embeds: [embed] });
  }
};

// ============ BALANCE COMMAND ============
const balance = {
  name: 'bal',
  category: 'Economy',
  description: 'Check your balance',
  aliases: ['balance', 'money'],

  data: new SlashCommandBuilder()
    .setName('bal')
    .setDescription('Check your balance'),

  async execute(interaction, client, config) {
    const userBalance = dbManager.getBalance(interaction.guild.id, interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Balance`)
      .setColor(0x00FF00)
      .addFields({ name: 'Balance', value: `**$${userBalance.toLocaleString()}**`, inline: false });

    await interaction.reply({ embeds: [embed] });
  },

  async run(message, args, client, config) {
    const userBalance = dbManager.getBalance(message.guild.id, message.author.id);

    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username}'s Balance`)
      .setColor(0x00FF00)
      .addFields({ name: 'Balance', value: `**$${userBalance.toLocaleString()}**`, inline: false });

    await message.reply({ embeds: [embed] });
  }
};

// ============ ADD MONEY (OWNER ONLY) ============
const addmoney = {
  name: 'addmoney',
  category: 'Economy',
  description: 'Add money to a user (Owner only)',

  async execute(message, args, client) {
    const config = client.config || require('../config');
    if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
      return message.reply({ content: '❌ You need Manage Server permission!', ephemeral: true });
    }

    if (args.length < 2) {
      return message.reply('Usage: `%addmoney <@user> <amount>`');
    }

    const member = message.mentions.members.first();
    const amount = parseInt(args[1]);

    if (!member) {
      return message.reply('❌ Please mention a user');
    }

    if (isNaN(amount) || amount <= 0) {
      return message.reply('❌ Amount must be positive');
    }

    dbManager.addUserBalance(message.guild.id, member.id, amount);

    await message.reply(`✅ Added **$${amount.toLocaleString()}** to ${member.user.tag}'s balance`);
  }
};

// ============ REMOVE MONEY (OWNER ONLY) ============
const removemoney = {
  name: 'removemoney',
  category: 'Economy',
  description: 'Remove money from a user (Owner only)',

  async execute(message, args, client) {
    const config = client.config || require('../config');
    if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need Manage Server permission!');
    }

    if (args.length < 2) {
      return message.reply('Usage: `%removemoney <@user> <amount>`');
    }

    const member = message.mentions.members.first();
    const amount = parseInt(args[1]);

    if (!member) {
      return message.reply('❌ Please mention a user');
    }

    if (isNaN(amount) || amount <= 0) {
      return message.reply('❌ Amount must be positive');
    }

    const current = dbManager.getBalance(message.guild.id, member.id);
    const newBalance = Math.max(0, current - amount);
    dbManager.setBalance(message.guild.id, member.id, newBalance);

    await message.reply(`✅ Removed **$${amount.toLocaleString()}** from ${member.user.tag}'s balance`);
  }
};

// ============ SET MONEY (OWNER ONLY) ============
const setmoney = {
  name: 'setmoney',
  category: 'Economy',
  description: 'Set a user\'s balance (Owner only)',

  async execute(message, args, client) {
    const config = client.config || require('../config');
    if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need Manage Server permission');
    }

    if (args.length < 2) {
      return message.reply('Usage: `%setmoney <@user> <amount>`');
    }

    const member = message.mentions.members.first();
    const amount = parseInt(args[1]);

    if (!member) {
      return message.reply('❌ Please mention a user');
    }

    if (isNaN(amount) || amount < 0) {
      return message.reply('❌ Amount cannot be negative');
    }

    dbManager.setBalance(message.guild.id, member.id, amount);

    await message.reply(`✅ Set ${member.user.tag}'s balance to **$${amount.toLocaleString()}**`);
  }
};

// ============ BALTOP / BALANCETOP (PER SERVER) ============
const baltop = {
  name: 'baltop',
  category: 'Economy',
  description: 'Show top 10 richest users in this server',
  aliases: ['balancetop', 'leaderboard'],

  data: new SlashCommandBuilder()
    .setName('baltop')
    .setDescription('Show top 10 richest users in this server'),

  async execute(interaction, client, config) {
    if (!interaction || !interaction.guild) return;

    const topUsers = dbManager.getTopBalances(interaction.guild.id, 10);

    if (topUsers.length === 0) {
      return interaction.reply('💭 No one has any money yet!');
    }

    const embed = new EmbedBuilder()
      .setTitle(`💰 ${interaction.guild.name} - Top 10 Richest`)
      .setColor(0xFFD700)
      .setThumbnail(interaction.guild.iconURL())
      .setTimestamp();

    let description = '';

    for (let i = 0; i < topUsers.length; i++) {
      const { user_id, balance } = topUsers[i];
      const user = await client.users.fetch(user_id).catch(() => null);
      const name = user ? user.tag : 'Unknown User';

      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
      description += `${medal} **${name}**: $${balance.toLocaleString()}\n`;
    }

    embed.setDescription(description);

    await interaction.reply({ embeds: [embed] });
  },

  async run(message, args, client, config) {
    const topUsers = dbManager.getTopBalances(message.guild.id, 10);

    if (topUsers.length === 0) {
      return message.reply('💭 No one has any money yet!');
    }

    const embed = new EmbedBuilder()
      .setTitle(`💰 ${message.guild.name} - Top 10 Richest`)
      .setColor(0xFFD700)
      .setThumbnail(message.guild.iconURL())
      .setTimestamp();

    let description = '';

    for (let i = 0; i < topUsers.length; i++) {
      const { user_id, balance } = topUsers[i];
      const user = await client.users.fetch(user_id).catch(() => null);
      const name = user ? user.tag : 'Unknown User';

      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
      description += `${medal} **${name}**: $${balance.toLocaleString()}\n`;
    }

    embed.setDescription(description);

    await message.reply({ embeds: [embed] });
  }
};

// ============ TOPGLOBAL (ALL SERVERS) ============
const topglobal = {
  name: 'topglobal',
  category: 'Economy',
  description: 'Show top 10 richest users across ALL servers',
  aliases: ['globaltop', 'globalleaderboard'],

  data: new SlashCommandBuilder()
    .setName('topglobal')
    .setDescription('Show top 10 richest users across ALL servers'),

  async execute(interaction, client, config) {
    if (!interaction || !interaction.deferReply) {
      console.error('topglobal: This function is for slash commands only');
      return;
    }
    await interaction.deferReply();

    const topUsers = dbManager.getGlobalTopBalances(10);

    if (topUsers.length === 0) {
      return interaction.editReply('💭 No one has any money yet!');
    }

    const embed = new EmbedBuilder()
      .setTitle('🌎 Global Top 10 Richest Users')
      .setColor(0xFFD700)
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp();

    let description = '';

    for (let i = 0; i < topUsers.length; i++) {
      const { user_id, total_balance } = topUsers[i];
      const user = await client.users.fetch(user_id).catch(() => null);

      if (user) {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
        description += `${medal} **${user.tag}**: $${total_balance.toLocaleString()}\n`;
      }
    }

    embed.setDescription(description);

    // Add top user's avatar
    if (topUsers.length > 0) {
      const topUser = await client.users.fetch(topUsers[0].user_id).catch(() => null);
      if (topUser) {
        embed.setThumbnail(topUser.displayAvatarURL({ size: 256 }));
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },

  async run(message, args, client, config) {
    const loadingMsg = await message.reply('🔄 Loading global leaderboard...');

    const topUsers = dbManager.getGlobalTopBalances(10);

    if (topUsers.length === 0) {
      return loadingMsg.edit('💭 No one has any money yet!');
    }

    const embed = new EmbedBuilder()
      .setTitle('🌎 Global Top 10 Richest Users')
      .setColor(0xFFD700)
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp();

    let description = '';

    for (let i = 0; i < topUsers.length; i++) {
      const { user_id, total_balance } = topUsers[i];
      const user = await client.users.fetch(user_id).catch(() => null);

      if (user) {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
        description += `${medal} **${user.tag}**: $${total_balance.toLocaleString()}\n`;
      }
    }

    embed.setDescription(description);

    // Add top user's avatar
    if (topUsers.length > 0) {
      const topUser = await client.users.fetch(topUsers[0].user_id).catch(() => null);
      if (topUser) {
        embed.setThumbnail(topUser.displayAvatarURL({ size: 256 }));
      }
    }

    await loadingMsg.edit({ content: null, embeds: [embed] });
  }
};

function setup(client) {
  client.commands.set('gbl', gamble);
  client.commands.set('gamble', gamble);
  client.commands.set('bal', balance);
  client.commands.set('balance', balance);
  client.commands.set('money', balance);
  client.commands.set('addmoney', addmoney);
  client.commands.set('removemoney', removemoney);
  client.commands.set('setmoney', setmoney);
  client.commands.set('baltop', baltop);
  client.commands.set('balancetop', baltop);
  client.commands.set('leaderboard', baltop);
  client.commands.set('topglobal', topglobal);
  client.commands.set('globaltop', topglobal);
  client.commands.set('globalleaderboard', topglobal);

  console.log('✅ Economy commands registered (DATABASE VERSION)');
}

module.exports = {
  gamble,
  balance,
  addmoney,
  removemoney,
  setmoney,
  baltop,
  topglobal,
  setup
};