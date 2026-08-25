import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { CONFIG } from '../../config.js';

export const WelcomerManager = {
  formatText(template, member) {
    if (!template) return '';
    return template
      .replace(/{user}/g, member.user.username)
      .replace(/{user\.tag}/g, member.user.tag)
      .replace(/{user\.id}/g, member.id)
      .replace(/{user\.mention}/g, `<@${member.id}>`)
      .replace(/{server\.name}/g, member.guild.name)
      .replace(/{server\.memberCount}/g, member.guild.memberCount.toString())
      .replace(/{memberCount}/g, member.guild.memberCount.toString());
  },

  async handleMemberJoin(member) {
    const config = DatabaseHelper.getWelcomerConfig(member.guild.id);

    // 1. Auto-Role assignment
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

    // 2. Direct Message Welcome
    if (config.welcome_dm_enabled && config.welcome_dm_message && !member.user.bot) {
      try {
        const dmText = this.formatText(config.welcome_dm_message, member);
        const dmEmbed = new EmbedBuilder()
          .setColor(CONFIG.EMBED_COLOR)
          .setTitle(`Benvenuto in ${member.guild.name}!`)
          .setDescription(dmText)
          .setThumbnail(member.guild.iconURL())
          .setTimestamp();
        await member.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch (e) {
        // DM closed
      }
    }

    // 3. Channel Welcome
    if (config.welcome_enabled && config.welcome_channel_id) {
      const channel = member.guild.channels.cache.get(config.welcome_channel_id);
      if (channel) {
        const messageText = this.formatText(config.welcome_message, member);
        
        let embed = null;
        if (config.welcome_embed) {
          const embData = config.welcome_embed;
          embed = new EmbedBuilder()
            .setColor(embData.color || CONFIG.EMBED_COLOR)
            .setTitle(this.formatText(embData.title || `🎉 Benvenuto in ${member.guild.name}!`, member))
            .setDescription(this.formatText(embData.description || messageText, member))
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: `Membro #${member.guild.memberCount}`, iconURL: member.guild.iconURL() })
            .setTimestamp();
          if (embData.image) embed.setImage(embData.image);
        } else {
          embed = new EmbedBuilder()
            .setColor(CONFIG.EMBED_COLOR)
            .setTitle(`🛡️ Nuovo Cavaliere Arrivato!`)
            .setDescription(messageText)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
              { name: '👤 Utente', value: `${member.user.tag}`, inline: true },
              { name: '📊 Membro n°', value: `\`#${member.guild.memberCount}\``, inline: true }
            )
            .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() })
            .setTimestamp();
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
      const messageText = this.formatText(config.leave_message, member);
      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_ERROR_COLOR)
        .setTitle(`👋 Arrivederci`)
        .setDescription(messageText)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: `Membri rimasti: ${member.guild.memberCount}`, iconURL: member.guild.iconURL() })
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
};

export default WelcomerManager;

