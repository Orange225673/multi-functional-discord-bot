//======================================================================
//                      REMINDER SYSTEM
//======================================================================

const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Active reminder timeouts
const activeReminders = new Map();

function parseTime(timeStr) {
  const match = timeStr.toLowerCase().match(/(\d+)([mhd])/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const units = { m: 60000, h: 3600000, d: 86400000 };
  return value * (units[unit] || 0);
}

function loadReminders(guildId) {
  const dataPath = path.join(__dirname, '../../data', guildId.toString(), 'reminders.json');
  
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error loading reminders for guild ${guildId}:`, err);
  }
  
  return {};
}

function saveReminders(guildId, reminders) {
  const dataDir = path.join(__dirname, '../../data', guildId.toString());
  const dataPath = path.join(dataDir, 'reminders.json');
  
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(reminders, null, 2));
  } catch (err) {
    console.error(`Error saving reminders for guild ${guildId}:`, err);
  }
}

async function sendReminder(client, reminderId, guildId) {
  const reminders = loadReminders(guildId);
  
  if (!reminders[reminderId]) return;
  
  const data = reminders[reminderId];
  
  const user = await client.users.fetch(data.user_id).catch(() => null);
  if (!user) return;
  
  const embed = new EmbedBuilder()
    .setTitle('🔔 Reminder!')
    .setDescription(data.reminder)
    .setColor(0x00D4FF);
  
  try {
    await user.send({ embeds: [embed] });
  } catch {
    // Try channel fallback
    const channel = client.channels.cache.get(data.channel_id);
    if (channel) {
      await channel.send({ content: `🔔 ${user} **Reminder:** ${data.reminder}` });
    }
  }
  
  // Remove from storage
  delete reminders[reminderId];
  saveReminders(guildId, reminders);
  
  // Remove from active reminders
  activeReminders.delete(reminderId);
}

async function loadPendingReminders(client) {
  console.log('⏰ Loading pending reminders...');
  
  const dataFolder = path.join(__dirname, '../../data');
  
  if (!fs.existsSync(dataFolder)) return;
  
  let loadedCount = 0;
  
  for (const guildFolder of fs.readdirSync(dataFolder)) {
    const guildPath = path.join(dataFolder, guildFolder);
    
    if (!fs.statSync(guildPath).isDirectory()) continue;
    
    try {
      const guildId = guildFolder;
      const reminders = loadReminders(guildId);
      
      for (const [reminderId, data] of Object.entries(reminders)) {
        const remindAt = new Date(data.remind_at);
        const now = new Date();
        
        if (remindAt > now) {
          const delay = remindAt.getTime() - now.getTime();
          
          const timeout = setTimeout(() => {
            sendReminder(client, reminderId, guildId);
          }, delay);
          
          activeReminders.set(reminderId, timeout);
          loadedCount++;
          console.log(`   ⏰ Loaded reminder ${reminderId} (${Math.floor(delay / 1000)}s remaining)`);
        } else {
          // Reminder already passed, remove it
          delete reminders[reminderId];
          saveReminders(guildId, reminders);
        }
      }
    } catch (err) {
      console.error(`   ❌ Error loading reminders for guild ${guildFolder}:`, err);
    }
  }
  
  console.log(`✅ Loaded ${loadedCount} pending reminder(s)`);
}

function setup(client) {
  // Load pending reminders when bot is ready
  client.once('ready', () => {
    loadPendingReminders(client);
  });
  
  console.log('✅ Reminder system loaded');
}

module.exports = {
  setup,
  parseTime,
  loadReminders,
  saveReminders,
  sendReminder,
  activeReminders
};
