import express from 'express';
import { DatabaseHelper } from '../../database/db.js';
import { PartnershipManager } from '../../bot/modules/partnershipManager.js';
import { WelcomerManager } from '../../bot/modules/welcomerManager.js';
import { GiveawayManager } from '../../bot/modules/giveawayManager.js';
import { AIManager } from '../../bot/modules/aiManager.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import { CONFIG } from '../../config.js';

export function createApiRouter(botClient) {
  const router = express.Router();

  const requireModAuth = async (req, res, next) => {
    const user = req.user || req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Accesso negato. Effettua il login con Discord.' });
    }

    const isCreator = user?.id === CONFIG.CREATOR_ID || user?.isAdmin;
    const guildId = req.params.guildId;

    if (!isCreator && guildId && botClient?.isReady() && botClient.guilds.cache.has(guildId)) {
      const guild = botClient.guilds.cache.get(guildId);
      try {
        const member = await guild.members.fetch(user.id);
        const isMod = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                      member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                      member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
                      member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
                      member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
                      guild.ownerId === user.id;

        if (!isMod) {
          return res.status(403).json({ error: 'Accesso vietato: Solo i moderatori e cavalieri autorizzati possono modificare questo Reame.' });
        }
      } catch (e) {
        return res.status(403).json({ error: 'Non fai parte di questo server.' });
      }
    }

    next();
  };

  router.get('/status', (req, res) => {
    const isReady = Boolean(botClient?.isReady());
    res.json({
      online: isReady,
      botName: botClient?.user?.tag || CONFIG.BOT_NAME,
      avatar: botClient?.user?.displayAvatarURL() || null,
      guildsCount: isReady ? botClient.guilds.cache.size : 0,
      usersCount: isReady ? botClient.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0) : 0,
      ping: isReady ? Math.round(botClient.ws.ping) : 0,
      uptime: process.uptime(),
      demoMode: !isReady,
      aiModel: CONFIG.CLOUDFLARE_MODEL
    });
  });

  router.get('/guilds/:guildId/settings', requireModAuth, (req, res) => {
    const settings = DatabaseHelper.getGuildSettings(req.params.guildId);
    res.json(settings);
  });

  router.post('/guilds/:guildId/settings', requireModAuth, (req, res) => {
    const updated = DatabaseHelper.updateGuildSettings(req.params.guildId, req.body);
    res.json({ success: true, settings: updated });
  });

  router.get('/guilds/:guildId/ai', requireModAuth, (req, res) => {
    const config = DatabaseHelper.getAIConfig(req.params.guildId);
    const defaultPrompt = AIManager.loadPrompt();
    res.json({ config, defaultPrompt });
  });

  router.post('/guilds/:guildId/ai', requireModAuth, (req, res) => {
    const updated = DatabaseHelper.updateAIConfig(req.params.guildId, req.body);
    res.json({ success: true, config: updated });
  });

  router.post('/guilds/:guildId/ai/chat', requireModAuth, async (req, res) => {
    const { message, customPrompt, model } = req.body;
    if (!message) return res.status(400).json({ error: 'Messaggio vuoto' });

    const guildId = req.params.guildId;
    const config = DatabaseHelper.getAIConfig(guildId);
    const systemPrompt = customPrompt || config.system_prompt || AIManager.loadPrompt();

    try {
      const messages = [{ role: 'user', content: `[Moderatore]: ${message}` }];
      let reply = await AIManager.getAIResponse(messages, systemPrompt, model || config.model);

      const searchMatch = reply.match(/\[CERCA:\s*(.*?)\]/i);
      if (searchMatch) {
        const query = searchMatch[1].trim();
        const searchResults = await AIManager.performWebSearch(query);
        const finalPrompt = `${systemPrompt}\n\nRisultati web trovati per "${query}":\n${searchResults}\n\nRispondi in modo sintetico e cinico basandoti sui dati.`;
        reply = await AIManager.getAIResponse(messages, finalPrompt, model || config.model);
        reply = reply.replace(/\[CERCA:\s*.*?\]/gi, '').trim();
      }

      res.json({ success: true, response: reply });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/guilds/:guildId/partnerships', requireModAuth, (req, res) => {
    const config = DatabaseHelper.getPartnershipConfig(req.params.guildId);
    const stats = DatabaseHelper.getPartnershipStats(req.params.guildId);
    const list = DatabaseHelper.getPartnerships(req.params.guildId, 25);
    res.json({ config, stats, partnerships: list });
  });

  router.post('/guilds/:guildId/partnerships/config', requireModAuth, (req, res) => {
    const updated = DatabaseHelper.updatePartnershipConfig(req.params.guildId, req.body);
    res.json({ success: true, config: updated });
  });

  router.post('/guilds/:guildId/partnerships/add', requireModAuth, async (req, res) => {
    const { invite, repId, notes } = req.body;
    const guildId = req.params.guildId;

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.status(400).json({ error: 'Il bot non è presente in questo server.' });
    }

    const guild = botClient.guilds.cache.get(guildId);
    let user = req.session.user;
    if (repId) {
      try {
        user = await botClient.users.fetch(repId);
      } catch (e) {}
    }

    const channel = guild.channels.cache.find(c => c.type === 0);
    const result = await PartnershipManager.processPartnership(guild, channel, user, invite, notes);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, result });
  });

  router.get('/guilds/:guildId/embeds', requireModAuth, (req, res) => {
    const templates = DatabaseHelper.getEmbedTemplates(req.params.guildId);
    res.json(templates);
  });

  router.post('/guilds/:guildId/embeds/save', requireModAuth, (req, res) => {
    const { id, name, embedData, componentsData } = req.body;
    const templateId = id || `template_${Date.now()}`;
    const saved = DatabaseHelper.saveEmbedTemplate(
      req.params.guildId,
      templateId,
      name || 'Nuovo Template',
      embedData,
      componentsData || [],
      req.session.user?.username || 'Moderatore'
    );
    res.json({ success: true, template: saved });
  });

  router.post('/guilds/:guildId/embeds/send', requireModAuth, async (req, res) => {
    const { channelId, embedData, componentsData } = req.body;
    const guildId = req.params.guildId;

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.status(400).json({ error: 'Bot non pronto.' });
    }

    try {
      const guild = botClient.guilds.cache.get(guildId);
      const channel = guild.channels.cache.get(channelId);
      if (!channel) return res.status(404).json({ error: 'Canale non trovato nel server' });

      const embed = new EmbedBuilder(embedData);
      const rows = [];

      if (componentsData && componentsData.length > 0) {
        const row = new ActionRowBuilder();
        for (const btn of componentsData.slice(0, 5)) {
          const button = new ButtonBuilder()
            .setLabel(btn.label || 'Pulsante')
            .setStyle(btn.style === 'LINK' ? ButtonStyle.Link : ButtonStyle[btn.style] || ButtonStyle.Primary);

          if (btn.emoji) button.setEmoji(btn.emoji);
          if (btn.style === 'LINK' && btn.url) {
            button.setURL(btn.url);
          } else {
            button.setCustomId(btn.custom_id || `btn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
          }
          row.addComponents(button);
        }
        rows.push(row);
      }

      await channel.send({ embeds: [embed], components: rows });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/guilds/:guildId/embeds/:id', requireModAuth, (req, res) => {
    DatabaseHelper.deleteEmbedTemplate(req.params.id);
    res.json({ success: true });
  });

  router.get('/guilds/:guildId/reaction-roles', requireModAuth, (req, res) => {
    const list = DatabaseHelper.getReactionRoles(req.params.guildId);
    res.json(list);
  });

  router.post('/guilds/:guildId/reaction-roles', requireModAuth, async (req, res) => {
    const { channelId, roleId, label, emoji, style, title, description } = req.body;
    const guildId = req.params.guildId;

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.status(400).json({ error: 'Bot non collegato al server.' });
    }

    try {
      const guild = botClient.guilds.cache.get(guildId);
      const channel = guild.channels.cache.get(channelId);
      const role = guild.roles.cache.get(roleId);

      if (!channel || !role) {
        return res.status(400).json({ error: 'Canale o ruolo non valido.' });
      }

      const button = new ButtonBuilder()
        .setCustomId(`rr_btn_${role.id}`)
        .setLabel(label || role.name)
        .setStyle(ButtonStyle[style] || ButtonStyle.Primary);

      if (emoji) button.setEmoji(emoji);

      const row = new ActionRowBuilder().addComponents(button);

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setTitle(title || '🎭 Selezione Ruolo')
        .setDescription(description || `Clicca sul pulsante per ricevere o toglierti il ruolo ${role}.`)
        .setFooter({ text: 'Il Cavaliere • Reaction Roles' })
        .setTimestamp();

      const msg = await channel.send({ embeds: [embed], components: [row] });

      const saved = DatabaseHelper.addReactionRole(
        guildId,
        channel.id,
        msg.id,
        'BUTTON',
        role.id,
        emoji,
        label,
        style
      );

      res.json({ success: true, reactionRole: saved });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/guilds/:guildId/reaction-roles/:id', requireModAuth, (req, res) => {
    DatabaseHelper.deleteReactionRole(req.params.id);
    res.json({ success: true });
  });

  router.get('/guilds/:guildId/welcomer', requireModAuth, (req, res) => {
    const config = DatabaseHelper.getWelcomerConfig(req.params.guildId);
    res.json(config);
  });

  router.post('/guilds/:guildId/welcomer', requireModAuth, (req, res) => {
    const updated = DatabaseHelper.updateWelcomerConfig(req.params.guildId, req.body);
    res.json({ success: true, config: updated });
  });

  router.post('/guilds/:guildId/welcomer/test', requireModAuth, async (req, res) => {
    const guildId = req.params.guildId;
    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.status(400).json({ error: 'Bot non collegato.' });
    }

    try {
      const guild = botClient.guilds.cache.get(guildId);
      const config = DatabaseHelper.getWelcomerConfig(guildId);
      const channel = guild.channels.cache.get(config.welcome_channel_id) || guild.channels.cache.find(c => c.type === 0);

      if (!channel) return res.status(400).json({ error: 'Nessun canale di benvenuto configurato.' });

      const fakeMember = guild.members.me;
      const embData = config.welcome_embed || {};
      const titleText = WelcomerManager.formatText(embData.title || `⚔️ Benvenuto nel Reame, {user}!`, fakeMember);
      const descText = WelcomerManager.formatText(embData.description || config.welcome_message || 'Benvenuto {user.mention} in **{server.name}**!', fakeMember);
      const footerText = WelcomerManager.formatText(embData.footer || `Membro #${guild.memberCount} • ${guild.name}`, fakeMember);

      const embed = new EmbedBuilder()
        .setColor(embData.color || CONFIG.EMBED_COLOR || '#ea580c')
        .setTitle(titleText)
        .setDescription(descText)
        .setThumbnail(fakeMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '👤 Utente', value: `<@${fakeMember.id}> (\`${fakeMember.user.tag}\`)`, inline: true },
          { name: '🏰 Membro n°', value: `\`#${guild.memberCount}\``, inline: true },
          { name: '📅 Creazione Account', value: `<t:${Math.floor(fakeMember.user.createdTimestamp / 1000)}:R>`, inline: false }
        )
        .setFooter({ text: footerText, iconURL: guild.iconURL() })
        .setTimestamp();

      if (embData.image) {
        embed.setImage(embData.image);
      }

      await channel.send({ content: `<@${fakeMember.id}>`, embeds: [embed] });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/guilds/:guildId/autoresponders', requireModAuth, (req, res) => {
    const list = DatabaseHelper.getAutoresponders(req.params.guildId);
    const channels = DatabaseHelper.getAutoreactionChannels(req.params.guildId);
    res.json({ autoresponders: list, autoreactionChannels: channels });
  });

  router.post('/guilds/:guildId/autoresponders', requireModAuth, (req, res) => {
    const created = DatabaseHelper.addAutoresponder(req.params.guildId, req.body);
    res.json({ success: true, autoresponder: created });
  });

  router.delete('/guilds/:guildId/autoresponders/:id', requireModAuth, (req, res) => {
    DatabaseHelper.deleteAutoresponder(req.params.id);
    res.json({ success: true });
  });

  router.post('/guilds/:guildId/autoreaction-channel', requireModAuth, (req, res) => {
    const { channelId, emojis, enabled } = req.body;
    const id = DatabaseHelper.setAutoreactionChannel(req.params.guildId, channelId, emojis, enabled);
    res.json({ success: true, id });
  });

  router.get('/guilds/:guildId/automod', requireModAuth, (req, res) => {
    const config = DatabaseHelper.getAutomodConfig(req.params.guildId);
    const cases = DatabaseHelper.getModerationCases(req.params.guildId, null, 25);
    res.json({ config, recentCases: cases });
  });

  router.post('/guilds/:guildId/automod', requireModAuth, (req, res) => {
    const updated = DatabaseHelper.updateAutomodConfig(req.params.guildId, req.body);
    res.json({ success: true, config: updated });
  });

  router.get('/guilds/:guildId/tickets', requireModAuth, (req, res) => {
    const panels = DatabaseHelper.getTicketPanels(req.params.guildId);
    const tickets = DatabaseHelper.db.prepare('SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.guildId);
    res.json({ panels, tickets });
  });

  router.post('/guilds/:guildId/tickets/panel', requireModAuth, async (req, res) => {
    const {
      channelId, title, description, color, image, footer,
      buttonLabel, buttonEmoji, buttonStyle, categoryId, supportRoleId,
      welcomeMessage, namingScheme, logChannelId
    } = req.body;
    const guildId = req.params.guildId;
    const panelId = `panel_${Date.now()}`;

    if (botClient?.isReady() && botClient.guilds.cache.has(guildId)) {
      try {
        const guild = botClient.guilds.cache.get(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
          const btn = new ButtonBuilder()
            .setCustomId(`ticket_open_${panelId}`)
            .setLabel(buttonLabel || 'Apri Ticket')
            .setEmoji(buttonEmoji || '📩')
            .setStyle(ButtonStyle[buttonStyle] || ButtonStyle.Primary);

          const row = new ActionRowBuilder().addComponents(btn);

          const embed = new EmbedBuilder()
            .setColor(color || CONFIG.EMBED_COLOR || '#ea580c')
            .setTitle(title || '🎫 Centro Supporto & Assistenza')
            .setDescription(description || 'Clicca sul pulsante sottostante per aprire una richiesta di supporto privata.')
            .setFooter({ text: footer || `${guild.name} • Sistema Ticket`, iconURL: guild.iconURL() })
            .setTimestamp();

          if (image) embed.setImage(image);

          // Check if editing existing message
          let targetMsg = null;
          if (req.body.panelId || req.body.messageId) {
            const existingPanel = req.body.panelId ? DatabaseHelper.getTicketPanel(req.body.panelId) : null;
            const targetMsgId = req.body.messageId || existingPanel?.message_id;
            if (targetMsgId) {
              try {
                targetMsg = await channel.messages.fetch(targetMsgId);
              } catch (e) {}
            }
          }

          let sent = null;
          if (targetMsg) {
            await targetMsg.edit({ embeds: [embed], components: [row] });
            sent = targetMsg;
          } else {
            sent = await channel.send({ embeds: [embed], components: [row] });
          }

          const saved = DatabaseHelper.saveTicketPanel({
            id: req.body.panelId || panelId,
            guild_id: guildId,
            channel_id: channel.id,
            message_id: sent.id,
            title,
            description,
            color: color || '#ea580c',
            image: image || null,
            footer: footer || null,
            button_style: buttonStyle || 'Primary',
            category_id: categoryId,
            button_label: buttonLabel,
            button_emoji: buttonEmoji,
            support_role_id: supportRoleId,
            welcome_message: welcomeMessage,
            naming_scheme: namingScheme || 'ticket-{user}',
            log_channel_id: logChannelId || null
          });

          return res.json({ success: true, panel: saved, edited: Boolean(targetMsg) });
        }
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    res.status(400).json({ error: 'Server non raggiungibile.' });
  });

  // Universal Live Embed Message Editor: Edit ANY message previously sent by the bot on Discord
  router.post('/guilds/:guildId/embeds/edit-message', requireModAuth, async (req, res) => {
    const { channelId, messageId, embed, content } = req.body;
    const guildId = req.params.guildId;

    if (!channelId || !messageId) {
      return res.status(400).json({ error: 'ID Canale e ID Messaggio sono obbligatori.' });
    }

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.status(400).json({ error: 'Bot Discord non connesso o server non trovato.' });
    }

    try {
      const guild = botClient.guilds.cache.get(guildId);
      const channel = await guild.channels.fetch(channelId);
      if (!channel) return res.status(404).json({ error: 'Canale non trovato su Discord.' });

      const message = await channel.messages.fetch(messageId);
      if (!message) return res.status(404).json({ error: 'Messaggio non trovato in questo canale.' });

      if (message.author.id !== botClient.user.id) {
        return res.status(403).json({ error: 'Puoi modificare solo i messaggi inviati da Il Cavaliere.' });
      }

      const editPayload = {};
      if (content !== undefined) editPayload.content = content;
      if (embed) {
        const discordEmbed = new EmbedBuilder();
        if (embed.title) discordEmbed.setTitle(embed.title);
        if (embed.description) discordEmbed.setDescription(embed.description);
        if (embed.color) discordEmbed.setColor(embed.color);
        if (embed.url) discordEmbed.setURL(embed.url);
        if (embed.image) discordEmbed.setImage(embed.image);
        if (embed.thumbnail) discordEmbed.setThumbnail(embed.thumbnail);
        if (embed.footer) discordEmbed.setFooter({ text: embed.footer });
        if (embed.timestamp) discordEmbed.setTimestamp();
        if (embed.fields && Array.isArray(embed.fields)) {
          embed.fields.forEach(f => {
            if (f.name && f.value) discordEmbed.addFields({ name: f.name, value: f.value, inline: Boolean(f.inline) });
          });
        }
        editPayload.embeds = [discordEmbed];
      }

      await message.edit(editPayload);
      return res.json({ success: true, messageId: message.id, channelId: channel.id });
    } catch (err) {
      return res.status(500).json({ error: `Impossibile modificare il messaggio: ${err.message}` });
    }
  });

  // Universal Live Embed Message Fetcher: Load ANY bot message directly into the Embed Builder
  router.post('/guilds/:guildId/embeds/fetch-message', requireModAuth, async (req, res) => {
    let { channelId, messageId, url } = req.body;
    const guildId = req.params.guildId;

    if (url) {
      const match = url.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
      if (match) {
        channelId = match[2];
        messageId = match[3];
      }
    }

    if (!channelId || !messageId) {
      return res.status(400).json({ error: 'Specifica Canale e Messaggio o un link valido di Discord.' });
    }

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.status(400).json({ error: 'Bot Discord non connesso.' });
    }

    try {
      const guild = botClient.guilds.cache.get(guildId);
      const channel = await guild.channels.fetch(channelId);
      if (!channel) return res.status(404).json({ error: 'Canale non trovato.' });

      const message = await channel.messages.fetch(messageId);
      if (!message) return res.status(404).json({ error: 'Messaggio non trovato.' });

      const firstEmbed = message.embeds[0];
      const data = {
        content: message.content || '',
        channelId: channel.id,
        messageId: message.id,
        embed: firstEmbed ? {
          title: firstEmbed.title || '',
          description: firstEmbed.description || '',
          color: firstEmbed.hexColor || '#ea580c',
          url: firstEmbed.url || '',
          image: firstEmbed.image?.url || '',
          thumbnail: firstEmbed.thumbnail?.url || '',
          footer: firstEmbed.footer?.text || '',
          timestamp: Boolean(firstEmbed.timestamp),
          fields: firstEmbed.fields ? firstEmbed.fields.map(f => ({ name: f.name, value: f.value, inline: f.inline })) : []
        } : null
      };

      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ error: `Errore recupero messaggio: ${err.message}` });
    }
  });

  // Counting Game API Endpoints
  router.get('/guilds/:guildId/counting', requireModAuth, (req, res) => {
    const config = DatabaseHelper.getCountingConfig(req.params.guildId);
    const leaderboard = DatabaseHelper.getCountingLeaderboard(req.params.guildId, 15);
    res.json({ config, leaderboard });
  });

  router.post('/guilds/:guildId/counting', requireModAuth, (req, res) => {
    const saved = DatabaseHelper.saveCountingConfig(req.params.guildId, req.body);
    res.json({ success: true, config: DatabaseHelper.getCountingConfig(req.params.guildId) });
  });

  // Fishing Economy API Endpoints
  router.get('/guilds/:guildId/fishing', requireModAuth, (req, res) => {
    const leaderboard = DatabaseHelper.getFishingLeaderboard(req.params.guildId, 15);
    res.json({ leaderboard });
  });

  router.get('/guilds/:guildId/giveaways', requireModAuth, (req, res) => {
    const list = DatabaseHelper.db.prepare('SELECT * FROM giveaways WHERE guild_id = ? ORDER BY id DESC LIMIT 20').all(req.params.guildId);
    res.json(list);
  });

  router.post('/guilds/:guildId/giveaways/start', requireModAuth, async (req, res) => {
    const { channelId, prize, winnerCount, durationSeconds } = req.body;
    const guildId = req.params.guildId;

    if (botClient?.isReady() && botClient.guilds.cache.has(guildId)) {
      try {
        const guild = botClient.guilds.cache.get(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(400).json({ error: 'Canale non trovato' });

        await GiveawayManager.startGiveaway(channel, prize, parseInt(winnerCount, 10) || 1, parseInt(durationSeconds, 10) || 60, req.session.user);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    res.status(400).json({ error: 'Server non raggiungibile.' });
  });

  router.get('/guilds/:guildId/leveling', requireModAuth, (req, res) => {
    const config = DatabaseHelper.getLevelConfig(req.params.guildId);
    const leaderboard = DatabaseHelper.getLeaderboard(req.params.guildId, 20);
    const rewards = DatabaseHelper.getLevelRewards(req.params.guildId);
    res.json({ config, leaderboard, rewards });
  });

  router.post('/guilds/:guildId/leveling/config', requireModAuth, (req, res) => {
    const updated = DatabaseHelper.updateLevelConfig(req.params.guildId, req.body);
    res.json({ success: true, config: updated });
  });

  router.get('/guilds/:guildId/emoji-stats', requireModAuth, (req, res) => {
    const stats = DatabaseHelper.getEmojiStats(req.params.guildId, 30);
    res.json(stats);
  });

  return router;
}

export default createApiRouter;
