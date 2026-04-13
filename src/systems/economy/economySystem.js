//======================================================================
//                   ECONOMY & GAMBLING SYSTEM (DATABASE VERSION)
//======================================================================

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const DatabaseManager = require('../../utils/DatabaseManager');
const config = require('../../config');

const dbManager = new DatabaseManager();

// Economy Configuration
const ECONOMY_CONFIG = config.ECONOMY_CONFIG;

// Cooldowns
const cooldowns = new Map();

function checkCooldown(userId, commandName, seconds) {
  const key = `${userId}-${commandName}`;
  const now = Date.now();

  if (cooldowns.has(key)) {
    const expirationTime = cooldowns.get(key) + seconds * 1000;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return { onCooldown: true, timeLeft };
    }
  }

  cooldowns.set(key, now);
  setTimeout(() => cooldowns.delete(key), seconds * 1000);

  return { onCooldown: false };
}

async function onMessageEarnMoney(message) {
  if (message.author.bot || !message.guild) return;

  // Random earn between 1,000 and 100,000
  let earnAmount = Math.floor(Math.random() * (100000 - 1000 + 1)) + 1000;

  // Money boost from gem shop
  if (dbManager.hasActiveBoost(message.guild.id, message.author.id, 'money_boost_1h')) {
    earnAmount *= 2;
  }

  // Server booster bonus (optional)
  if (message.member && message.member.premiumSince) {
    earnAmount = Math.floor(earnAmount * 1.5); // 50% bonus
  }

  // Add money to database
  dbManager.addUserBalance(message.guild.id, message.author.id, earnAmount);
}

function setup(client) {
  console.log('✅ Economy system loaded (DATABASE VERSION)');
}

module.exports = {
  setup,
  onMessageEarnMoney,
  ECONOMY_CONFIG,
  checkCooldown
};