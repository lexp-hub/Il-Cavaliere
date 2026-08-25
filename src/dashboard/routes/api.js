import express from 'express';
import { DatabaseHelper } from '../../database/db.js';
import { PartnershipManager } from '../../bot/modules/partnershipManager.js';
import { WelcomerManager } from '../../bot/modules/welcomerManager.js';
import { GiveawayManager } from '../../bot/modules/giveawayManager.js';
import { AIManager } from '../../bot/modules/aiManager.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { CONFIG } from '../../config.js';

export function createApiRouter(botClient) {
  const router = express.Router();

  const requireAuth = (req, res, next) => {
    if (req.session.user || CONFIG.DEMO_MODE) {
      return next();
    }
    return res.status(401).json({ error: 'Non autorizzato' });
  };

  router.get('/status', (req, res) => {
    const isReady = Boolean(botClient?.isReady());
    res.json({
      online: isReady,
      botName: botClient?.user?.tag || CONFIG.BOT_NAME,
      avatar: botClient?.user?.displayAvatarURL() || null,
      guildsCount: isReady ? botClient.guilds.cache.size : 3,
      usersCount: isReady ? botClient.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0) : 4840,
      ping: isReady ? Math.round(botClient.ws.ping) : 24,
      uptime: process.uptime(),
      demoMode: CONFIG.DEMO_MODE || !isReady,
      aiModel: CONFIG.CLOUDFLARE_MODEL
    });
  });

  router.get('/guilds/:guildId/settings', requireAuth, (req, res) => {
    const settings = DatabaseHelper.getGuildSettings(req.params.guildId);
    res.json(settings);
  });

  router.post('/guilds/:guildId/settings', requireAuth, (req, res) => {
    const updated = DatabaseHelper.updateGuildSettings(req.params.guildId, req.body);
    res.json({ success: true, settings: updated });
  });

  router.get('/guilds/:guildId/ai', requireAuth, (req, res) => {
    const config = DatabaseHelper.getAIConfig(req.params.guildId);
    const defaultPrompt = AIManager.loadPrompt();
    res.json({ config, defaultPrompt });
  });

  router.post('/guilds/:guildId/ai', requireAuth, (req, res) => {
    const updated = DatabaseHelper.updateAIConfig(req.params.guildId, req.body);
    res.json({ success: true, config: updated });
  });

  router.post('/guilds/:guildId/ai/chat', requireAuth, async (req, res) => {
    const { message, customPrompt, model } = req.body;
    if (!message) return res.status(400).json({ error: 'Messaggio vuoto' });

    const guildId = req.params.guildId;
    const config = DatabaseHelper.getAIConfig(guildId);
    const systemPrompt = customPrompt || config.system_prompt || AIManager.loadPrompt();

    try {
      const messages = [{ role: 'user', content: `[Dashboard Test User]: ${message}` }];
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

  router.get('/guilds/:guildId/partnerships', requireAuth, (req, res) => {
    const config = DatabaseHelper.getPartnershipConfig(req.params.guildId);
    const stats = DatabaseHelper.getPartnershipStats(req.params.guildId);
    const list = DatabaseHelper.getPartnerships(req.params.guildId, 25);
    res.json({ config, stats, partnerships: list });
  });

  router.post('/guilds/:guildId/partnerships/config', requireAuth, (req, res) => {
    const updated = DatabaseHelper.updatePartnershipConfig(req.params.guildId, req.body);
    res.json({ success: true, config: updated });
  });

  router.post('/guilds/:guildId/partnerships/add', requireAuth, async (req, res) => {
    const { invite, repId, notes } = req.body;
    const guildId = req.params.guildId;

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      const saved = DatabaseHelper.addPartnership(guildId, {
        partner_name: 'Server Partner Demo',
        invite_url: invite || 'https://discord.gg/example',
        rep_user_id: repId || '999999999999999999',
        partner_count: 500,
        notes: notes || 'Partnership Demo'
      });
      return res.json({ success: true, partnership: saved, demo: true });
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

  router.get('/guilds/:guildId/embeds', requireAuth, (req, res) => {
    const templates = DatabaseHelper.getEmbedTemplates(req.params.guildId);
    res.json(templates);
  });

  router.post('/guilds/:guildId/embeds/save', requireAuth, (req, res) => {
    const { id, name, embedData, componentsData } = req.body;
    const templateId = id || `template_${Date.now()}`;
    const saved = DatabaseHelper.saveEmbedTemplate(
      req.params.guildId,
      templateId,
      name || 'Nuovo Template',
      embedData,
      componentsData || [],
      req.session.user?.username || 'Dashboard'
    );
    res.json({ success: true, template: saved });
  });

  router.post('/guilds/:guildId/embeds/send', requireAuth, async (req, res) => {
    const { channelId, embedData, componentsData } = req.body;
    const guildId = req.params.guildId;

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.json({ success: true, message: 'Simulazione invio completata (Modalità Demo/Preview).' });
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

  router.delete('/guilds/:guildId/embeds/:id', requireAuth, (req, res) => {
    DatabaseHelper.deleteEmbedTemplate(req.params.id);
    res.json({ success: true });
  });

  router.get('/guilds/:guildId/reaction-roles', requireAuth, (req, res) => {
    const list = DatabaseHelper.getReactionRoles(req.params.guildId);
    res.json(list);
  });

  router.post('/guilds/:guildId/reaction-roles', requireAuth, async (req, res) => {
    const { channelId, roleId, label, emoji, style, title, description } = req.body;
    const guildId = req.params.guildId;

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      const saved = DatabaseHelper.addReactionRole(
        guildId,
        channelId || '101',
        `demo_msg_${Date.now()}`,
        'BUTTON',
        roleId,
        emoji,
        label,
        style
      );
      return res.json({ success: true, reactionRole: saved, demo: true });
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

  router.delete('/guilds/:guildId/reaction-roles/:id', requireAuth, (req, res) => {
    DatabaseHelper.deleteReactionRole(req.params.id);
    res.json({ success: true });
  });

  router.get('/guilds/:guildId/welcomer', requireAuth, (req, res) => {
    const config = DatabaseHelper.getWelcomerConfig(req.params.guildId);
    res.json(config);
  });

  router.post('/guilds/:guildId/welcomer', requireAuth, (req, res) => {
    const updated = DatabaseHelper.updateWelcomerConfig(req.params.guildId, req.body);
    res.json({ success: true, config: updated });
  });

  router.post('/guilds/:guildId/welcomer/test', requireAuth, async (req, res) => {
    const guildId = req.params.guildId;
    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.json({ success: true, message: 'Test simulato con successo (Modalità Demo).' });
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
        .setTitle('🎉 [Test Dashboard] Benvenuto!')
        .setDescription(text)
        .setThumbnail(fakeMember.user.displayAvatarURL())
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/guilds/:guildId/autoresponders', requireAuth, (req, res) => {
    const list = DatabaseHelper.getAutoresponders(req.params.guildId);
    const channels = DatabaseHelper.getAutoreactionChannels(req.params.guildId);
    res.json({ autoresponders: list, autoreactionChannels: channels });
  });

  router.post('/guilds/:guildId/autoresponders', requireAuth, (req, res) => {
    const created = DatabaseHelper.addAutoresponder(req.params.guildId, req.body);
    res.json({ success: true, autoresponder: created });
  });

  router.delete('/guilds/:guildId/autoresponders/:id', requireAuth, (req, res) => {
    DatabaseHelper.deleteAutoresponder(req.params.id);
    res.json({ success: true });
  });

  router.post('/guilds/:guildId/autoreaction-channel', requireAuth, (req, res) => {
    const { channelId, emojis, enabled } = req.body;
    const id = DatabaseHelper.setAutoreactionChannel(req.params.guildId, channelId, emojis, enabled);
    res.json({ success: true, id });
  });

  router.get('/guilds/:guildId/automod', requireAuth, (req, res) => {
    const config = DatabaseHelper.getAutomodConfig(req.params.guildId);
    const cases = DatabaseHelper.getModerationCases(req.params.guildId, null, 25);
    res.json({ config, recentCases: cases });
  });

  router.post('/guilds/:guildId/automod', requireAuth, (req, res) => {
    const updated = DatabaseHelper.updateAutomodConfig(req.params.guildId, req.body);
    res.json({ success: true, config: updated });
  });

  router.get('/guilds/:guildId/tickets', requireAuth, (req, res) => {
    const panels = DatabaseHelper.getTicketPanels(req.params.guildId);
    const tickets = DatabaseHelper.db.prepare('SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.guildId);
    res.json({ panels, tickets });
  });

  router.post('/guilds/:guildId/tickets/panel', requireAuth, async (req, res) => {
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
            .setTitle(title || '🎫 Assistenza & Ticket')
            .setDescription(description || 'Clicca sul pulsante sottostante per aprire un ticket.')
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

    const saved = DatabaseHelper.saveTicketPanel({
      id: panelId,
      guild_id: guildId,
      channel_id: channelId,
      title,
      description,
      category_id: categoryId,
      button_label: buttonLabel,
      button_emoji: buttonEmoji,
      support_role_id: supportRoleId
    });
    res.json({ success: true, panel: saved, demo: true });
  });

  router.get('/guilds/:guildId/giveaways', requireAuth, (req, res) => {
    const list = DatabaseHelper.db.prepare('SELECT * FROM giveaways WHERE guild_id = ? ORDER BY id DESC LIMIT 20').all(req.params.guildId);
    res.json(list);
  });

  router.post('/guilds/:guildId/giveaways/start', requireAuth, async (req, res) => {
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

    res.json({ success: true, message: 'Giveaway avviato in modalità simulazione.' });
  });

  router.get('/guilds/:guildId/leveling', requireAuth, (req, res) => {
    const config = DatabaseHelper.getLevelConfig(req.params.guildId);
    const leaderboard = DatabaseHelper.getLeaderboard(req.params.guildId, 20);
    const rewards = DatabaseHelper.getLevelRewards(req.params.guildId);
    res.json({ config, leaderboard, rewards });
  });

  router.post('/guilds/:guildId/leveling/config', requireAuth, (req, res) => {
    const updated = DatabaseHelper.updateLevelConfig(req.params.guildId, req.body);
    res.json({ success: true, config: updated });
  });

  router.post('/guilds/:guildId/leveling/reward', requireAuth, (req, res) => {
    const { level, roleId } = req.body;
    DatabaseHelper.addLevelReward(req.params.guildId, level, roleId);
    res.json({ success: true });
  });

  router.delete('/guilds/:guildId/leveling/reward/:id', requireAuth, (req, res) => {
    DatabaseHelper.deleteLevelReward(req.params.id);
    res.json({ success: true });
  });

  router.get('/guilds/:guildId/emoji-stats', requireAuth, (req, res) => {
    const stats = DatabaseHelper.getEmojiStats(req.params.guildId, 30);
    res.json(stats);
  });

  return router;
}

export default createApiRouter;
