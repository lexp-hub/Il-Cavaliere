import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder } from 'discord.js';
import { CONFIG } from '../../config.js';

const xpCooldowns = new Map();

export const XPManager = {
  async handleMessage(message) {
    if (!message.guild || message.author.bot) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const config = DatabaseHelper.getLevelConfig(guildId);

    if (!config.enabled) return;

    const key = `${guildId}_${userId}`;
    const now = Date.now();
    const lastGain = xpCooldowns.get(key) || 0;

    if (now - lastGain < 60000) return;
    xpCooldowns.set(key, now);

    const baseAmount = Math.floor(Math.random() * 11) + 15;
    const xpToAdd = Math.floor(baseAmount * (config.xp_rate || 1.0));

    const result = DatabaseHelper.addXp(guildId, userId, xpToAdd);

    if (result.leveledUp) {
      
      const rewards = DatabaseHelper.getLevelRewards(guildId);
      for (const reward of rewards) {
        if (result.newLevel >= reward.level) {
          const role = message.guild.roles.cache.get(reward.role_id);
          if (role && message.member && !message.member.roles.cache.has(role.id)) {
            await message.member.roles.add(role).catch(() => {});
          }
        }
      }

      const levelEmbed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setTitle('⭐ Level Up!')
        .setDescription(`🎉 Congratulazioni ${message.author}! Sei salito al **Livello ${result.newLevel}**!`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
        .setTimestamp();

      if (config.dm_notifications) {
        await message.author.send({ embeds: [levelEmbed] }).catch(() => {});
      } else {
        const targetChannel = config.channel_id ? message.guild.channels.cache.get(config.channel_id) : message.channel;
        if (targetChannel) {
          await targetChannel.send({ embeds: [levelEmbed] }).catch(() => {});
        }
      }
    }
  },

  getXpNeededForLevel(level) {
    
    return Math.pow(level * 10, 2);
  },

  getXpNeededForNextLevel(currentLevel) {
    return this.getXpNeededForLevel(currentLevel + 1);
  }
};

export default XPManager;
