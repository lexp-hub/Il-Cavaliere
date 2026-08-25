import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder } from 'discord.js';
import { CONFIG } from '../../config.js';

export const PartnershipManager = {
  async processPartnership(guild, channel, user, inviteCodeOrUrl, customText = '') {
    const config = DatabaseHelper.getPartnershipConfig(guild.id);
    if (!config.enabled) {
      return { success: false, error: 'Il modulo Partnership è disattivato su questo server.' };
    }

    let code = inviteCodeOrUrl;
    const match = inviteCodeOrUrl.match(/(?:discord\.gg\/|discord\.com\/invite\/)?([a-zA-Z0-9-]+)/);
    if (match && match[1]) {
      code = match[1];
    }

    let inviteInfo;
    try {
      inviteInfo = await guild.client.fetchInvite(code);
    } catch (e) {
      return { success: false, error: 'Invito non valido o scaduto.' };
    }

    const partnerGuild = inviteInfo.guild;
    const memberCount = inviteInfo.memberCount || 0;

    if (config.min_members > 0 && memberCount < config.min_members) {
      return {
        success: false,
        error: `Il server partner deve avere almeno **${config.min_members}** membri (il server ne ha ${memberCount}).`
      };
    }

    const recentPartnerships = DatabaseHelper.getPartnerships(guild.id, 10);
    const now = Math.floor(Date.now() / 1000);
    const cooldownSecs = config.cooldown_minutes * 60;

    const lastFromSameGuild = recentPartnerships.find(p => p.partner_guild_id === partnerGuild?.id);
    if (lastFromSameGuild && (now - lastFromSameGuild.timestamp) < cooldownSecs) {
      const remainingMinutes = Math.ceil((cooldownSecs - (now - lastFromSameGuild.timestamp)) / 60);
      return {
        success: false,
        error: `Questo server ha già una partnership recente. Attendi **${remainingMinutes} minuti** prima di rinnovarla.`
      };
    }

    const saved = DatabaseHelper.addPartnership(guild.id, {
      partner_guild_id: partnerGuild?.id || null,
      partner_name: partnerGuild?.name || 'Server Partner',
      invite_url: inviteInfo.url,
      rep_user_id: user.id,
      partner_count: memberCount,
      timestamp: now,
      notes: customText
    });

    const stats = DatabaseHelper.getPartnershipStats(guild.id);

    const partnerEmbed = new EmbedBuilder()
      .setColor(CONFIG.EMBED_COLOR)
      .setTitle(`🤝 Nuova Partnership | ${partnerGuild?.name || 'Partner Server'}`)
      .setURL(inviteInfo.url)
      .setDescription(customText || `Siamo lieti di annunciare la nuova partnership con **${partnerGuild?.name}**!\n\n🔗 **Unisciti al server:** ${inviteInfo.url}`)
      .addFields(
        { name: '👑 Rappresentante', value: `${user} (\`${user.tag}\`)`, inline: true },
        { name: '👥 Membri Partner', value: `\`${memberCount.toLocaleString()}\``, inline: true },
        { name: '📊 Partnership Totali', value: `\`#${stats.total}\``, inline: true }
      )
      .setFooter({ text: `Il Cavaliere • Partnership #${stats.total}`, iconURL: guild.iconURL() })
      .setTimestamp();

    if (partnerGuild?.icon) {
      partnerEmbed.setThumbnail(`https://cdn.discordapp.com/icons/${partnerGuild.id}/${partnerGuild.icon}.png?size=256`);
    }

    const targetChannel = config.channel_id ? guild.channels.cache.get(config.channel_id) : channel;
    if (!targetChannel) {
      return { success: false, error: 'Canale partnership non trovato o non configurato.' };
    }

    let pingContent = '';
    if (config.ping_role_id) {
      pingContent = `<@&${config.ping_role_id}>`;
    }

    const sentMessage = await targetChannel.send({
      content: pingContent || undefined,
      embeds: [partnerEmbed]
    });

    if (config.log_channel_id) {
      const logChan = guild.channels.cache.get(config.log_channel_id);
      if (logChan && logChan.id !== targetChannel.id) {
        const logEmbed = new EmbedBuilder()
          .setColor(CONFIG.EMBED_SUCCESS_COLOR)
          .setTitle('🤝 Log Partnership')
          .addFields(
            { name: 'Server Partner', value: `${partnerGuild?.name} (${partnerGuild?.id})`, inline: true },
            { name: 'Rappresentante', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Canale', value: `${targetChannel}`, inline: true },
            { name: 'Membri', value: `${memberCount}`, inline: true },
            { name: 'Invito', value: `${inviteInfo.url}`, inline: true }
          )
          .setTimestamp();
        await logChan.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }

    return {
      success: true,
      partnershipId: saved.id,
      totalCount: stats.total,
      messageUrl: sentMessage.url
    };
  }
};

export default PartnershipManager;
