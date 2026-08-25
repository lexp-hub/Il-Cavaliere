import { WelcomerManager } from '../modules/welcomerManager.js';
import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder } from 'discord.js';
import { CONFIG } from '../../config.js';

export default {
  name: 'guildMemberRemove',
  async execute(member) {
    // 1. Process Leaver goodbye message
    await WelcomerManager.handleMemberLeave(member);

    // 2. Audit log
    const settings = DatabaseHelper.getGuildSettings(member.guild.id);
    if (settings.log_channel_id) {
      const logChan = member.guild.channels.cache.get(settings.log_channel_id);
      if (logChan) {
        const embed = new EmbedBuilder()
          .setColor(CONFIG.EMBED_ERROR_COLOR)
          .setTitle('📤 Membro Uscito')
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: 'Utente', value: `${member.user.tag} (${member.id})`, inline: true },
            { name: 'Membri Rimasti', value: `\`${member.guild.memberCount}\``, inline: true }
          )
          .setTimestamp();
        await logChan.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }
};

