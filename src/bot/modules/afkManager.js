import { EmbedBuilder } from 'discord.js';
import { DatabaseHelper } from '../../database/db.js';
import { CONFIG } from '../../config.js';

// Cooldown in memoria per evitare spam di avvisi nello stesso canale per lo stesso utente (12 secondi)
const mentionCooldowns = new Map();

// Grace period di 3.5 secondi quando un utente si mette AFK per evitare cancellazioni involontarie immediate
const recentlySetAfk = new Map();

// Pulizia periodica della cache in memoria ogni 10 minuti
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of mentionCooldowns.entries()) {
    if (now - timestamp > 30000) {
      mentionCooldowns.delete(key);
    }
  }
  for (const [key, timestamp] of recentlySetAfk.entries()) {
    if (now - timestamp > 30000) {
      recentlySetAfk.delete(key);
    }
  }
}, 10 * 60 * 1000);

export const AFKManager = {
  /**
   * Registra che un utente ha appena attivato lo stato AFK
   * per attivare il grace period anti-cancellazione immediata.
   */
  markRecentlySet(guildId, userId) {
    recentlySetAfk.set(`${guildId}:${userId}`, Date.now());
  },

  /**
   * Controlla se l'autore del messaggio inviato era AFK.
   * Se era AFK (e non è nel grace period), rimuove l'AFK e invia l'embed di bentornato.
   */
  async handleMessageAuthor(message) {
    if (!message.guild || message.author.bot) return false;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const afkData = DatabaseHelper.getAfk(guildId, userId);

    if (!afkData) return false;

    const now = Date.now();
    const recentTime = recentlySetAfk.get(`${guildId}:${userId}`);

    // Grace period di 3.5 secondi
    if ((recentTime && (now - recentTime < 3500)) || (now - afkData.timestamp < 3500)) {
      return false;
    }

    // Rimuove lo stato AFK dal database
    DatabaseHelper.removeAfk(guildId, userId);
    recentlySetAfk.delete(`${guildId}:${userId}`);

    const durationSec = Math.floor(afkData.timestamp / 1000);
    const reasonText = afkData.reason && afkData.reason !== 'Attualmente assente' && afkData.reason !== 'Nessun motivo specificato'
      ? `\n📝 *Motivo precedente:* **${afkData.reason}**`
      : '';

    const embed = new EmbedBuilder()
      .setColor('#10b981')
      .setAuthor({
        name: `Bentornato, ${message.author.displayName || message.author.username}!`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setDescription(
        `Ho rimosso il tuo stato **AFK**.\n` +
        `⏰ Sei stato assente per circa **<t:${durationSec}:R>** (<t:${durationSec}:t>).${reasonText}`
      )
      .setFooter({ text: 'Sentry AFK • Sei di nuovo attivo nel server' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] }).catch(() => {});
    return true;
  },

  /**
   * Controlla se il messaggio menziona o risponde a uno o più utenti attualmente AFK.
   * Invia un avviso in embed con il motivo e il tempo di assenza.
   */
  async handleMentionsAndReplies(message) {
    if (!message.guild || message.author.bot) return;

    const guildId = message.guild.id;
    const channelId = message.channel.id;
    const authorId = message.author.id;
    const targetUserIds = new Set();

    // 1. Menzioni dirette nel messaggio
    if (message.mentions.users.size > 0) {
      for (const [id, user] of message.mentions.users) {
        if (!user.bot && id !== authorId) {
          targetUserIds.add(id);
        }
      }
    }

    // 2. Risposta diretta a un messaggio (message reply)
    if (message.reference?.messageId) {
      let refMsg = message.channel.messages.cache.get(message.reference.messageId);
      if (!refMsg) {
        try {
          refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        } catch (e) {}
      }

      if (refMsg && refMsg.author && !refMsg.author.bot && refMsg.author.id !== authorId) {
        targetUserIds.add(refMsg.author.id);
      }
    }

    if (targetUserIds.size === 0) return;

    // Filtra gli utenti target che sono effettivamente AFK e non in cooldown nello stesso canale
    const now = Date.now();
    const afkTargets = [];

    for (const targetId of targetUserIds) {
      const afkData = DatabaseHelper.getAfk(guildId, targetId);
      if (!afkData) continue;

      const cooldownKey = `${guildId}:${targetId}:${channelId}`;
      const lastAlert = mentionCooldowns.get(cooldownKey);

      // Cooldown anti-spam di 12 secondi per utente AFK nello stesso canale
      if (lastAlert && (now - lastAlert < 12000)) {
        continue;
      }

      mentionCooldowns.set(cooldownKey, now);
      afkTargets.push({
        userId: targetId,
        reason: afkData.reason || 'Attualmente assente',
        timestamp: afkData.timestamp
      });
    }

    if (afkTargets.length === 0) return;

    if (afkTargets.length === 1) {
      const target = afkTargets[0];
      const durationSec = Math.floor(target.timestamp / 1000);

      const embed = new EmbedBuilder()
        .setColor('#f59e0b')
        .setTitle('💤 Utente Attualmente Assente')
        .setDescription(
          `**<@${target.userId}>** è attualmente **AFK / inattivo** e probabilmente sta facendo altro.\n\n` +
          `📝 **Motivo:** ${target.reason}\n` +
          `⏰ **Assente da:** <t:${durationSec}:R> (<t:${durationSec}:t>)`
        )
        .setFooter({ text: 'Sentry AFK • Verrà rimosso automaticamente appena scriverà un messaggio' });

      await message.channel.send({ embeds: [embed] }).catch(() => {});
    } else {
      // Notifica multipla consolidata
      const embed = new EmbedBuilder()
        .setColor('#f59e0b')
        .setTitle('💤 Utenti Attualmente Assenti')
        .setDescription('I seguenti utenti menzionati sono attualmente **AFK / inattivi**:')
        .setFooter({ text: 'Sentry AFK • Verranno rimossi automaticamente appena scriveranno un messaggio' });

      for (const target of afkTargets) {
        const durationSec = Math.floor(target.timestamp / 1000);
        embed.addFields({
          name: `👤 <@${target.userId}>`,
          value: `📝 **Motivo:** ${target.reason}\n⏰ **Assente da:** <t:${durationSec}:R> (<t:${durationSec}:t>)`,
          inline: false
        });
      }

      await message.channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
};

export default AFKManager;

