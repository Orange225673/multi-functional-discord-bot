//======================================================================
//                      AI COMMANDS
//======================================================================

const { SlashCommandBuilder } = require('discord.js');
const { generateResponse, getPrompts } = require('../systems/aiSystem');
const DataManager = require('../utils/dataManager');

const dataManager = new DataManager();

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

// Helper function to send long messages as multiple messages
async function sendLongMessage(target, text) {
  const MAX_LENGTH = 2000;

  if (text.length <= MAX_LENGTH) {
    if (target.editReply) {
      await target.editReply(text);
    } else {
      await target.reply(text);
    }
    return;
  }

  // Split text into chunks of 2000 characters
  const chunks = [];
  let currentChunk = '';

  const lines = text.split('\n');
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > MAX_LENGTH) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  // Send first message using editReply (if available) or reply
  if (target.editReply) {
    await target.editReply(chunks[0]);
    // Send remaining as follow-ups for interactions
    for (let i = 1; i < chunks.length; i++) {
      await target.followUp(chunks[i]);
    }
  } else {
    // For regular messages, just reply multiple times
    for (const chunk of chunks) {
      await target.reply(chunk);
    }
  }
}

// ============ MINECRAFT AI ============
const minecraft = {
  name: 'minecraft',
  category: 'AI',
  description: 'Minecraft expert AI',
  aliases: ['mc'],

  data: new SlashCommandBuilder()
    .setName('minecraft')
    .setDescription('Ask a Minecraft expert AI')
    .addStringOption(opt => opt
      .setName('question')
      .setDescription('Your Minecraft question')
      .setRequired(true)
    ),

  async execute(interaction, client, config) {
    // Check if this is a valid interaction with options
    if (!interaction || !interaction.options || !interaction.options.getString) {
      console.error('minecraft: Invalid interaction object');
      return;
    }
    const question = interaction.options.getString('question');

    const serverConfig = dataManager.loadFile(interaction.guild.id, 'server_config.json');

    if (serverConfig.features && serverConfig.features.minecraft_enabled === false) {
      return interaction.reply({ content: '🔒 The Minecraft command is currently locked!', ephemeral: true });
    }

    const cooldown = checkCooldown(interaction.user.id, 'minecraft', 15);
    if (cooldown.onCooldown) {
      return interaction.reply({
        content: `⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`,
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const prompts = getPrompts();
      const systemInstruction = prompts.minecraft;

      const answer = await generateResponse(question, systemInstruction);

      await sendLongMessage(interaction, answer);
    } catch (error) {
      await interaction.editReply(`❌ **Error:** ${error.message}`);
    }
  },

  async run(message, args, client, config) {
    if (args.length === 0) {
      return message.reply('❌ Usage: `%minecraft <question>`');
    }

    const question = args.join(' ');

    const serverConfig = dataManager.loadFile(message.guild.id, 'server_config.json');

    if (serverConfig.features && serverConfig.features.minecraft_enabled === false) {
      return message.reply('🔒 The Minecraft command is currently locked!');
    }

    const cooldown = checkCooldown(message.author.id, 'minecraft', 15);
    if (cooldown.onCooldown) {
      return message.reply(`⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`);
    }

    const typingInterval = setInterval(() => {
      message.channel.sendTyping();
    }, 5000);

    await message.channel.sendTyping();

    try {
      const prompts = getPrompts();
      const systemInstruction = prompts.minecraft;

      const answer = await generateResponse(question, systemInstruction);

      clearInterval(typingInterval);
      await sendLongMessage(message, answer);
    } catch (error) {
      clearInterval(typingInterval);
      await message.reply(`❌ **Error:** ${error.message}`);
    }
  }
};

// ============ MATH HELPER AI ============
const mathhelper = {
  name: 'mathhelper',
  category: 'AI',
  description: 'Math tutor AI',
  aliases: ['mathhelp', 'mh'],

  data: new SlashCommandBuilder()
    .setName('mathhelper')
    .setDescription('Ask a math tutor AI')
    .addStringOption(opt => opt
      .setName('question')
      .setDescription('Your math question')
      .setRequired(true)
    ),

  async execute(interaction, client, config) {
    // Check if this is a valid interaction with options
    if (!interaction || !interaction.options || !interaction.options.getString) {
      console.error('mathhelper: Invalid interaction object');
      return;
    }
    const question = interaction.options.getString('question');

    const cooldown = checkCooldown(interaction.user.id, 'mathhelper', 15);
    if (cooldown.onCooldown) {
      return interaction.reply({
        content: `⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`,
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const prompts = getPrompts();
      const systemInstruction = prompts.mathhelper;

      const answer = await generateResponse(question, systemInstruction);

      await sendLongMessage(interaction, answer);
    } catch (error) {
      await interaction.editReply(`❌ **Error:** ${error.message}`);
    }
  },

  async run(message, args, client, config) {
    if (args.length === 0) {
      return message.reply('❌ Usage: `%mathhelper <question>`');
    }

    const question = args.join(' ');

    const cooldown = checkCooldown(message.author.id, 'mathhelper', 15);
    if (cooldown.onCooldown) {
      return message.reply(`⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`);
    }

    const typingInterval = setInterval(() => {
      message.channel.sendTyping();
    }, 5000);

    await message.channel.sendTyping();

    try {
      const prompts = getPrompts();
      const systemInstruction = prompts.mathhelper;

      const answer = await generateResponse(question, systemInstruction);

      clearInterval(typingInterval);
      await sendLongMessage(message, answer);
    } catch (error) {
      clearInterval(typingInterval);
      await message.reply(`❌ **Error:** ${error.message}`);
    }
  }
};

// ============ PHYSIC HELPER AI ================
const physicshelper = {
  name: 'physicshelper',
  category: 'AI',
  description: 'Physics tutor AI',
  aliases: ['physicshelp', 'ph'],

  data: new SlashCommandBuilder()
    .setName('physicshelper')
    .setDescription('Ask a physics tutor AI')
    .addStringOption(opt => opt
      .setName('question')
      .setDescription('Your physics question')
      .setRequired(true)
    ),

  async execute(interaction, client, config) {
    // Check if this is a valid interaction with options
    if (!interaction || !interaction.options || !interaction.options.getString) {
      console.error('physicshelper: Invalid interaction object');
      return;
    }
    const question = interaction.options.getString('question');

    const cooldown = checkCooldown(interaction.user.id, 'physicshelper', 15);
    if (cooldown.onCooldown) {
      return interaction.reply({
        content: `⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`,
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const prompts = getPrompts();
      const systemInstruction = prompts.physicshelper;

      const answer = await generateResponse(question, systemInstruction);

      await sendLongMessage(interaction, answer);
    } catch (error) {
      await interaction.editReply(`❌ **Error:** ${error.message}`);
    }
  },

  async run(message, args, client, config) {
    if (args.length === 0) {
      return message.reply('❌ Usage: `%physicshelper <question>`');
    }

    const question = args.join(' ');

    const cooldown = checkCooldown(message.author.id, 'physicshelper', 15);
    if (cooldown.onCooldown) {
      return message.reply(`⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`);
    }

    const typingInterval = setInterval(() => {
      message.channel.sendTyping();
    }, 5000);

    await message.channel.sendTyping();

    try {
      const prompts = getPrompts();
      const systemInstruction = prompts.physicshelper;

      const answer = await generateResponse(question, systemInstruction);

      clearInterval(typingInterval);
      await sendLongMessage(message, answer);
    } catch (error) {
      clearInterval(typingInterval);
      await message.reply(`❌ **Error:** ${error.message}`);
    }
  }
};
// ============ CHEMISTRY HELPER AI ==============
const chemistryhelper = {
  name: 'chemistryhelper',
  category: 'AI',
  description: 'Chemistry tutor AI',
  aliases: ['chemhelp', 'ch'],

  data: new SlashCommandBuilder()
    .setName('chemistryhelper')
    .setDescription('Ask a chemistry tutor AI')
    .addStringOption(opt => opt
      .setName('question')
      .setDescription('Your chemistry question')
      .setRequired(true)
    ),

  async execute(interaction, client, config) {
    if (!interaction || !interaction.options || !interaction.options.getString) {
      console.error('chemistryhelper: Invalid interaction object');
      return;
    }
    const question = interaction.options.getString('question');

    const cooldown = checkCooldown(interaction.user.id, 'chemistryhelper', 15);
    if (cooldown.onCooldown) {
      return interaction.reply({
        content: `⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`,
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const prompts = getPrompts();
      const systemInstruction = prompts.chemistryhelper;

      const answer = await generateResponse(question, systemInstruction);

      await sendLongMessage(interaction, answer);
    } catch (error) {
      await interaction.editReply(`❌ **Error:** ${error.message}`);
    }
  },

  async run(message, args, client, config) {
    if (args.length === 0) {
      return message.reply('❌ Usage: `%chemistryhelper <question>`');
    }

    const question = args.join(' ');

    const cooldown = checkCooldown(message.author.id, 'chemistryhelper', 15);
    if (cooldown.onCooldown) {
      return message.reply(`⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`);
    }

    const typingInterval = setInterval(() => {
      message.channel.sendTyping();
    }, 5000);

    await message.channel.sendTyping();

    try {
      const prompts = getPrompts();
      const systemInstruction = prompts.chemistryhelper;

      const answer = await generateResponse(question, systemInstruction);

      clearInterval(typingInterval);
      await sendLongMessage(message, answer);
    } catch (error) {
      clearInterval(typingInterval);
      await message.reply(`❌ **Error:** ${error.message}`);
    }
  }
};

// ============ CODING HELPER ====================
const codinghelper = {
  name: 'codinghelper',
  category: 'AI',
  description: 'Coding assistant AI (Short & Direct)',
  aliases: ['codehelp'],

  data: new SlashCommandBuilder()
    .setName('codinghelper')
    .setDescription('Ask a coding assistant AI')
    .addStringOption(opt => opt
      .setName('question')
      .setDescription('Your coding question or task')
      .setRequired(true)
    ),

  async execute(interaction, client, config) {
    if (!interaction || !interaction.options || !interaction.options.getString) {
      console.error('codinghelper: Invalid interaction object');
      return;
    }
    const question = interaction.options.getString('question');

    const cooldown = checkCooldown(interaction.user.id, 'codinghelper', 15);
    if (cooldown.onCooldown) {
      return interaction.reply({
        content: `⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`,
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const prompts = getPrompts();
      const systemInstruction = prompts.codinghelper;

      const answer = await generateResponse(question, systemInstruction);

      await sendLongMessage(interaction, answer);
    } catch (error) {
      await interaction.editReply(`❌ **Error:** ${error.message}`);
    }
  },

  async run(message, args, client, config) {
    if (args.length === 0) {
      return message.reply('❌ Usage: `%codinghelper <question>`');
    }

    const question = args.join(' ');

    const cooldown = checkCooldown(message.author.id, 'codinghelper', 15);
    if (cooldown.onCooldown) {
      return message.reply(`⏰ Cooldown! Wait ${Math.ceil(cooldown.timeLeft)} seconds.`);
    }

    const typingInterval = setInterval(() => {
      message.channel.sendTyping();
    }, 5000);

    await message.channel.sendTyping();

    try {
      const prompts = getPrompts();
      const systemInstruction = prompts.codinghelper;

      const answer = await generateResponse(question, systemInstruction);

      clearInterval(typingInterval);
      await sendLongMessage(message, answer);
    } catch (error) {
      if (typingInterval) clearInterval(typingInterval);
      await message.reply(`❌ **Error:** ${error.message}`);
    }
  }
};
// ============ LOCK/UNLOCK MINECRAFT ============
const minecraftlock = {
  name: 'minecraftlock',
  category: 'Admin',
  description: 'Lock minecraft command',

  async execute(message, args, client) {
    // Get config from client
    const config = client.config || require('../config');
    if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need to be server owner or have Manage Server permission!');
    }

    const serverConfig = dataManager.loadFile(message.guild.id, 'server_config.json');

    if (!serverConfig.features) serverConfig.features = {};
    serverConfig.features.minecraft_enabled = false;

    dataManager.saveFile(message.guild.id, 'server_config.json', serverConfig);

    await message.reply('🔒 **Minecraft command has been LOCKED**');
  }
};

const minecraftunlock = {
  name: 'minecraftunlock',
  category: 'Admin',
  description: 'Unlock minecraft command',

  async execute(message, args, client) {
    // Get config from client
    const config = client.config || require('../config');
    if (message.author.id !== config.OWNER_ID && !message.member.permissions.has('ManageGuild')) {
      return message.reply('❌ You need to be server owner or have Manage Server permission!');
    }

    const serverConfig = dataManager.loadFile(message.guild.id, 'server_config.json');

    if (!serverConfig.features) serverConfig.features = {};
    serverConfig.features.minecraft_enabled = true;

    dataManager.saveFile(message.guild.id, 'server_config.json', serverConfig);

    await message.reply('🔓 **Minecraft command has been UNLOCKED**');
  }
};

function setup(client) {
  // Minecraft commands
  client.commands.set('minecraft', minecraft);
  client.commands.set('mc', minecraft);
  client.commands.set('minecraftlock', minecraftlock);
  client.commands.set('minecraftunlock', minecraftunlock);

  // Math Helper
  client.commands.set('mathhelper', mathhelper);
  client.commands.set('mathhelp', mathhelper);
  client.commands.set('mh', mathhelper);

  // Physics Helper
  client.commands.set('physicshelper', physicshelper);
  client.commands.set('physicshelp', physicshelper);
  client.commands.set('ph', physicshelper);

  // Chemistry Helper
  client.commands.set('chemistryhelper', chemistryhelper);
  client.commands.set('chemhelp', chemistryhelper);
  client.commands.set('ch', chemistryhelper);

  // Coding Helper
  client.commands.set('codinghelper', codinghelper);
  client.commands.set('codehelp', codinghelper);

  console.log('✅ AI commands registered');
}

module.exports = {
  minecraft,
  mathhelper,
  physicshelper,
  chemistryhelper,
  codinghelper,
  minecraftlock,
  minecraftunlock,
  setup
};
