import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder } from 'discord.js';
import { CONFIG } from '../../config.js';

export default {
  name: 'messageDelete',
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const settings = DatabaseHelper.getGuildSettings(message.guild.id);
    if (!settings.log_channel_id) return;

    const logChan = message.guild.channels.cache.get(settings.log_channel_id);
    if (!logChan || logChan.id === message.channel.id) return;

    const embed = new EmbedBuilder()
      .setColor(CONFIG.EMBED_ERROR_COLOR)
      .setTitle('🗑️ Messaggio Eliminato')
      .addFields(
        { name: 'Autore', value: message.author ? `${message.author.tag} (${message.author.id})` : '`Sconosciuto`', inline: true },
        { name: 'Canale', value: `${message.channel}`, inline: true },
        { name: 'Contenuto', value: message.content ? `\`\`\`${message.content.slice(0, 1000)}\`\`\`` : '`[Nessun testo / Solo allegato]`', inline: false }
      )
      .setFooter({ text: `ID Messaggio: ${message.id}` })
      .setTimestamp();

    await logChan.send({ embeds: [embed] }).catch(() => {});
  }
};

