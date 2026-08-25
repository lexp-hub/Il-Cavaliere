import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder } from 'discord.js';
import { CONFIG } from '../../config.js';

export const WelcomerManager = {
  formatText(template, member) {
    if (!template) return '';
    return template
      .replace(/{user}/g, member.user?.username || member.displayName || 'Utente')
      .replace(/{user\.tag}/g, member.user?.tag || member.displayName || 'Utente')
      .replace(/{user\.id}/g, member.id || '')
      .replace(/{user\.mention}/g, `<@${member.id}>`)
      .replace(/{server\.name}/g, member.guild?.name || 'Server')
      .replace(/{server\.memberCount}/g, (member.guild?.memberCount || 0).toString())
      .replace(/{memberCount}/g, (member.guild?.memberCount || 0).toString());
  },

  async handleMemberJoin(member) {
    const config = DatabaseHelper.getWelcomerConfig(member.guild.id);

    try {
      if (member.user.bot && config.auto_role_bot) {
        const botRole = member.guild.roles.cache.get(config.auto_role_bot);
        if (botRole) await member.roles.add(botRole).catch(() => {});
      } else if (!member.user.bot && config.auto_role_user) {
        const userRole = member.guild.roles.cache.get(config.auto_role_user);
        if (userRole) await member.roles.add(userRole).catch(() => {});
      }
    } catch (e) {
      console.error('[Welcomer] Error adding auto-role:', e.message);
    }

    if (config.welcome_dm_enabled && config.welcome_dm_message && !member.user.bot) {
      try {
        const dmText = this.formatText(config.welcome_dm_message, member);
        const dmEmbed = new EmbedBuilder()
          .setColor(CONFIG.EMBED_COLOR || '#ea580c')
          .setTitle(`⚔️ Benvenuto in ${member.guild.name}!`)
          .setDescription(dmText)
          .setThumbnail(member.guild.iconURL({ dynamic: true }) || member.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() })
          .setTimestamp();
        await member.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch (e) {}
    }

    if (config.welcome_enabled && config.welcome_channel_id) {
      const channel = member.guild.channels.cache.get(config.welcome_channel_id);
      if (channel) {
        const messageText = this.formatText(
          config.welcome_message || 'Benvenuto {user.mention} in **{server.name}**! Siamo felici di averti tra noi.',
          member
        );
        
        const embData = config.welcome_embed || {};
        const titleText = this.formatText(embData.title || `⚔️ Benvenuto nel Reame, {user}!`, member);
        const footerText = this.formatText(embData.footer || `Membro #${member.guild.memberCount} • ${member.guild.name}`, member);

        const embed = new EmbedBuilder()
          .setColor(embData.color || CONFIG.EMBED_COLOR || '#ea580c')
          .setTitle(titleText)
          .setDescription(this.formatText(embData.description || messageText, member))
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .addFields(
            { name: '👤 Utente', value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
            { name: '🏰 Membro n°', value: `\`#${member.guild.memberCount}\``, inline: true },
            { name: '📅 Creazione Account', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false }
          )
          .setFooter({ text: footerText, iconURL: member.guild.iconURL() })
          .setTimestamp();

        if (embData.image) {
          embed.setImage(embData.image);
        }

        await channel.send({
          content: `<@${member.id}>`,
          embeds: [embed]
        }).catch(err => console.error('[Welcomer] Channel send error:', err.message));
      }
    }
  },

  async handleMemberLeave(member) {
    const config = DatabaseHelper.getWelcomerConfig(member.guild.id);
    if (!config.leave_enabled || !config.leave_channel_id) return;

    const channel = member.guild.channels.cache.get(config.leave_channel_id);
    if (channel) {
      const messageText = this.formatText(
        config.leave_message || '{user.tag} ha lasciato il server. Siamo rimasti in {memberCount}.',
        member
      );

      const embData = config.leave_embed || {};
      const embed = new EmbedBuilder()
        .setColor(embData.color || CONFIG.EMBED_ERROR_COLOR || '#dc2626')
        .setTitle(`👋 Un Cavaliere ha lasciato il Reame`)
        .setDescription(this.formatText(embData.description || messageText, member))
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: `Membri rimasti: ${member.guild.memberCount}`, iconURL: member.guild.iconURL() })
        .setTimestamp();

      if (embData.image) {
        embed.setImage(embData.image);
      }

      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
};

export default WelcomerManager;
