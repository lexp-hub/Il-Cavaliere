import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { CONFIG } from '../../config.js';

const messageTimestamps = new Map();

export const AutoModManager = {
  async handleMessage(message) {
    if (!message.guild || message.author.bot) return false;

    if (message.member?.permissions.has(PermissionsBitField.Flags.Administrator) ||
        message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return false;
    }

    const config = DatabaseHelper.getAutomodConfig(message.guild.id);
    const content = message.content;

    if (config.ignored_channels.includes(message.channel.id)) return false;
    if (message.member && message.member.roles.cache.some(r => config.ignored_roles.includes(r.id))) return false;

    let violated = false;
    let reason = '';

    if (config.anti_invite) {
      const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9-]+/gi;
      if (inviteRegex.test(content)) {
        violated = true;
        reason = 'Inviti Discord non consentiti';
      }
    }

    if (!violated && config.anti_link) {
      const linkRegex = /(https?:\/\/[^\s]+)/gi;
      if (linkRegex.test(content)) {
        violated = true;
        reason = 'Link esterni non consentiti';
      }
    }

    if (!violated && config.bad_words && config.bad_words.length > 0) {
      const lowerContent = content.toLowerCase();
      for (const word of config.bad_words) {
        if (lowerContent.includes(word.toLowerCase())) {
          violated = true;
          reason = `Parola vietata rilevata (${word})`;
          break;
        }
      }
    }

    if (!violated && config.anti_caps && content.length > 10) {
      const letters = content.replace(/[^a-zA-Z]/g, '');
      if (letters.length > 8) {
        const upperCount = (letters.match(/[A-Z]/g) || []).length;
        if (upperCount / letters.length > 0.7) {
          violated = true;
          reason = 'Troppo testo in maiuscolo (Caps Lock)';
        }
      }
    }

    if (!violated && config.anti_spam) {
      const key = `${message.guild.id}_${message.author.id}`;
      const now = Date.now();
      const userLogs = messageTimestamps.get(key) || [];
      
      const recentLogs = userLogs.filter(t => now - t < 3000);
      recentLogs.push(now);
      messageTimestamps.set(key, recentLogs);

      if (recentLogs.length >= 5) {
        violated = true;
        reason = 'Spam di messaggi troppo rapido';
      }
    }

    if (!violated && config.max_mentions > 0) {
      const mentionsCount = message.mentions.users.size + message.mentions.roles.size;
      if (mentionsCount > config.max_mentions) {
        violated = true;
        reason = `Troppe menzioni (${mentionsCount}/${config.max_mentions})`;
      }
    }

    if (violated) {
      try {
        await message.delete();
      } catch (e) {
        
      }

      DatabaseHelper.addModerationCase(
        message.guild.id,
        message.author.id,
        message.client.user.id,
        'AUTOMOD',
        reason
      );

      const warnEmbed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_WARN_COLOR)
        .setTitle('🛡️ AutoMod | Il Cavaliere')
        .setDescription(`⚠️ ${message.author}, il tuo messaggio è stato bloccato.\n**Motivo:** \`${reason}\``)
        .setFooter({ text: 'Sistema di protezione automatico' })
        .setTimestamp();

      const warnMsg = await message.channel.send({ embeds: [warnEmbed] }).catch(() => null);
      if (warnMsg) {
        setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
      }

      const guildSettings = DatabaseHelper.getGuildSettings(message.guild.id);
      if (guildSettings.log_channel_id) {
        const logChannel = message.guild.channels.cache.get(guildSettings.log_channel_id);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor(CONFIG.EMBED_WARN_COLOR)
            .setTitle('🛡️ Violazione AutoMod')
            .addFields(
              { name: 'Utente', value: `${message.author.tag} (${message.author.id})`, inline: true },
              { name: 'Canale', value: `${message.channel}`, inline: true },
              { name: 'Motivo', value: `\`${reason}\``, inline: false },
              { name: 'Contenuto Bloccato', value: `\`\`\`${content.slice(0, 1000)}\`\`\``, inline: false }
            )
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      return true;
    }

    return false;
  }
};

export default AutoModManager;
