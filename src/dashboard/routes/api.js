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
    const user = req.session.user;
    if (!user && !CONFIG.DEMO_MODE) {
      return res.status(401).json({ error: 'Accesso negato. Effettua il login con Discord.' });
    }

    const isCreator = user?.id === CONFIG.CREATOR_ID || user?.isAdmin || CONFIG.DEMO_MODE;
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
      const text = WelcomerManager.formatText(config.welcome_message || 'Benvenuto {user.mention}!', fakeMember);

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setTitle('🎉 [Test] Benvenuto nel Reame!')
        .setDescription(text)
        .setThumbnail(fakeMember.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
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
    const { channelId, title, description, categoryId, supportRoleId, buttonLabel, buttonEmoji } = req.body;
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
            .setStyle(ButtonStyle.Primary);

          const row = new ActionRowBuilder().addComponents(btn);

          const embed = new EmbedBuilder()
            .setColor(CONFIG.EMBED_COLOR)
            .setTitle(title || '🎫 Centro Supporto & Assistenza')
            .setDescription(description || 'Clicca sul pulsante per aprire un ticket.')
            .setFooter({ text: 'Il Cavaliere • Supporto' })
            .setTimestamp();

          const sent = await channel.send({ embeds: [embed], components: [row] });

          const saved = DatabaseHelper.saveTicketPanel({
            id: panelId,
            guild_id: guildId,
            channel_id: channel.id,
            message_id: sent.id,
            title,
            description,
            category_id: categoryId,
            button_label: buttonLabel,
            button_emoji: buttonEmoji,
            support_role_id: supportRoleId
          });

          return res.json({ success: true, panel: saved });
        }
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    res.status(400).json({ error: 'Server non raggiungibile.' });
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
