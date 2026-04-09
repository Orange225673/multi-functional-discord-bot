//======================================================================
//                      REMINDER COMMANDS
//======================================================================

const { SlashCommandBuilder } = require('discord.js');
const { parseTime, loadReminders, saveReminders, sendReminder, activeReminders } = require('../systems/reminderSystem');

module.exports = {
  name: 'remindme',
  category: 'Utility',
  description: 'Set a reminder',
  aliases: ['remind', 'reminder'],
  
  data: new SlashCommandBuilder()
    .setName('remindme')
    .setDescription('Set a reminder')
    .addStringOption(opt => opt
      .setName('time')
      .setDescription('Time (5m, 2h, 1d)')
      .setRequired(true)
    )
    .addStringOption(opt => opt
      .setName('reminder')
      .setDescription('Reminder message')
      .setRequired(true)
    ),
  
  async execute(interaction, client, config) {
    const time = interaction.options.getString('time');
    const reminder = interaction.options.getString('reminder');
    
    const ms = parseTime(time);
    
    if (!ms) {
      return interaction.reply({ content: '❌ Invalid format! Use: `10m`, `2h`, or `1d`', ephemeral: true });
    }
    
    if (ms > 604800000) { // 7 days
      return interaction.reply({ content: '❌ Max 7 days!', ephemeral: true });
    }
    
    if (ms < 60000) { // 1 minute
      return interaction.reply({ content: '❌ Min 1 minute!', ephemeral: true });
    }
    
    // Save reminder
    const reminders = loadReminders(interaction.guild.id);
    
    const reminderId = `${interaction.user.id}_${Date.now()}`;
    const remindAt = new Date(Date.now() + ms);
    
    reminders[reminderId] = {
      user_id: interaction.user.id,
      guild_id: interaction.guild.id,
      channel_id: interaction.channel.id,
      reminder,
      remind_at: remindAt.toISOString(),
      created_at: new Date().toISOString()
    };
    
    saveReminders(interaction.guild.id, reminders);
    
    // Schedule reminder
    const timestamp = Math.floor(remindAt.getTime() / 1000);
    await interaction.reply({ content: `⏰ I'll remind you <t:${timestamp}:R>!`, ephemeral: true });
    
    // Create timeout
    const timeout = setTimeout(() => {
      sendReminder(client, reminderId, interaction.guild.id);
    }, ms);
    
    activeReminders.set(reminderId, timeout);
  },
  
  async run(message, args, client, config) {
    if (args.length < 2) {
      return message.reply('❌ Usage: `%remindme <time> <reminder>`\nExample: `%remindme 1h Buy groceries`');
    }
    
    const time = args[0];
    const reminder = args.slice(1).join(' ');
    
    const ms = parseTime(time);
    
    if (!ms) {
      return message.reply('❌ Invalid format! Use: `10m`, `2h`, or `1d`');
    }
    
    if (ms > 604800000) {
      return message.reply('❌ Max 7 days!');
    }
    
    if (ms < 60000) {
      return message.reply('❌ Min 1 minute!');
    }
    
    // Save reminder
    const reminders = loadReminders(message.guild.id);
    
    const reminderId = `${message.author.id}_${Date.now()}`;
    const remindAt = new Date(Date.now() + ms);
    
    reminders[reminderId] = {
      user_id: message.author.id,
      guild_id: message.guild.id,
      channel_id: message.channel.id,
      reminder,
      remind_at: remindAt.toISOString(),
      created_at: new Date().toISOString()
    };
    
    saveReminders(message.guild.id, reminders);
    
    // Schedule reminder
    const timestamp = Math.floor(remindAt.getTime() / 1000);
    await message.reply(`⏰ I'll remind you <t:${timestamp}:R>!`);
    
    // Create timeout
    const timeout = setTimeout(() => {
      sendReminder(client, reminderId, message.guild.id);
    }, ms);
    
    activeReminders.set(reminderId, timeout);
  }
};
