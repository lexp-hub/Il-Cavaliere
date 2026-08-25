import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config.js';
import { SCHEMA } from './schema.js';

const dbDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(CONFIG.DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(SCHEMA);

console.log(`[Database] Connected to SQLite database at ${CONFIG.DB_PATH}`);

export const DatabaseHelper = {
  db,

  getGuildSettings(guildId) {
    const row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
    if (!row) {
      this.initGuildSettings(guildId);
      return this.getGuildSettings(guildId);
    }
    const defaultModules = {
      partnerships: true,
      embeds: true,
      reaction_roles: true,
      welcomer: true,
      autoresponder: true,
      moderation: true,
      tickets: true,
      giveaways: true,
      leveling: true,
      starboard: true,
      ai: true
    };
    const parsed = JSON.parse(row.modules_enabled || '{}');
    return {
      ...row,
      modules_enabled: { ...defaultModules, ...parsed }
    };
  },

  initGuildSettings(guildId) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO guild_settings (guild_id, prefix, language, modules_enabled)
      VALUES (?, '!', 'it', '{"partnerships":true,"embeds":true,"reaction_roles":true,"welcomer":true,"autoresponder":true,"moderation":true,"tickets":true,"giveaways":true,"leveling":true,"starboard":true,"ai":true}')
    `);
    stmt.run(guildId);
  },

  updateGuildSettings(guildId, data) {
    this.initGuildSettings(guildId);
    const current = this.getGuildSettings(guildId);
    const updated = { ...current, ...data };
    const modulesJson = typeof updated.modules_enabled === 'object' ? JSON.stringify(updated.modules_enabled) : updated.modules_enabled;

    const stmt = db.prepare(`
      UPDATE guild_settings
      SET prefix = ?, language = ?, log_channel_id = ?, mute_role_id = ?, auto_role_user = ?, auto_role_bot = ?, modules_enabled = ?
      WHERE guild_id = ?
    `);
    stmt.run(
      updated.prefix,
      updated.language,
      updated.log_channel_id,
      updated.mute_role_id,
      updated.auto_role_user,
      updated.auto_role_bot,
      modulesJson,
      guildId
    );
    return this.getGuildSettings(guildId);
  },

  getAIConfig(guildId) {
    let row = db.prepare('SELECT * FROM ai_configs WHERE guild_id = ?').get(guildId);
    if (!row) {
      db.prepare(`
        INSERT INTO ai_configs (guild_id, enabled, model, web_search_enabled, max_chars)
        VALUES (?, 1, '@cf/meta/llama-3.3-70b-instruct-fp8-fast', 1, 300)
      `).run(guildId);
      row = db.prepare('SELECT * FROM ai_configs WHERE guild_id = ?').get(guildId);
    }
    return {
      ...row,
      enabled: Boolean(row.enabled),
      web_search_enabled: Boolean(row.web_search_enabled),
      channels_whitelist: JSON.parse(row.channels_whitelist || '[]'),
      roles_whitelist: JSON.parse(row.roles_whitelist || '[]')
    };
  },

  updateAIConfig(guildId, data) {
    const current = this.getAIConfig(guildId);
    const updated = { ...current, ...data };

    db.prepare(`
      INSERT OR REPLACE INTO ai_configs (guild_id, enabled, model, system_prompt, web_search_enabled, max_chars, channels_whitelist, roles_whitelist)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      updated.enabled ? 1 : 0,
      updated.model || CONFIG.CLOUDFLARE_MODEL,
      updated.system_prompt || null,
      updated.web_search_enabled ? 1 : 0,
      updated.max_chars || 300,
      JSON.stringify(updated.channels_whitelist || []),
      JSON.stringify(updated.roles_whitelist || [])
    );
    return this.getAIConfig(guildId);
  },

  getChannelMemory(channelId) {
    let row = db.prepare('SELECT * FROM ai_channel_memories WHERE channel_id = ?').get(channelId);
    if (!row) {
      db.prepare("INSERT INTO ai_channel_memories (channel_id, reset_timestamp, logs) VALUES (?, 0, '[]')").run(channelId);
      row = db.prepare('SELECT * FROM ai_channel_memories WHERE channel_id = ?').get(channelId);
    }
    return {
      channel_id: row.channel_id,
      reset_timestamp: row.reset_timestamp,
      logs: JSON.parse(row.logs || '[]')
    };
  },

  addChannelLog(channelId, role, content) {
    const memory = this.getChannelMemory(channelId);
    const logs = memory.logs;
    logs.push({ role, content, timestamp: Date.now() });
    if (logs.length > 50) logs.splice(0, logs.length - 50);

    db.prepare('UPDATE ai_channel_memories SET logs = ? WHERE channel_id = ?').run(
      JSON.stringify(logs),
      channelId
    );
  },

  resetChannelMemory(channelId) {
    db.prepare("UPDATE ai_channel_memories SET reset_timestamp = ?, logs = '[]' WHERE channel_id = ?").run(
      Date.now(),
      channelId
    );
  },

  getPartnershipConfig(guildId) {
    let row = db.prepare('SELECT * FROM partnership_configs WHERE guild_id = ?').get(guildId);
    if (!row) {
      db.prepare(`
        INSERT INTO partnership_configs (guild_id, enabled, min_members, cooldown_minutes)
        VALUES (?, 1, 0, 60)
      `).run(guildId);
      row = db.prepare('SELECT * FROM partnership_configs WHERE guild_id = ?').get(guildId);
    }
    return {
      ...row,
      enabled: Boolean(row.enabled),
      embed_template: row.embed_template ? JSON.parse(row.embed_template) : null
    };
  },

  updatePartnershipConfig(guildId, data) {
    const current = this.getPartnershipConfig(guildId);
    const updated = { ...current, ...data };
    const templateJson = updated.embed_template ? JSON.stringify(updated.embed_template) : null;

    db.prepare(`
      INSERT OR REPLACE INTO partnership_configs (guild_id, channel_id, ping_role_id, min_members, cooldown_minutes, embed_template, log_channel_id, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      updated.channel_id || null,
      updated.ping_role_id || null,
      updated.min_members || 0,
      updated.cooldown_minutes || 60,
      templateJson,
      updated.log_channel_id || null,
      updated.enabled ? 1 : 0
    );
    return this.getPartnershipConfig(guildId);
  },

  addPartnership(guildId, data) {
    const stmt = db.prepare(`
      INSERT INTO partnerships (guild_id, partner_guild_id, partner_name, invite_url, rep_user_id, partner_count, timestamp, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      guildId,
      data.partner_guild_id || null,
      data.partner_name || 'Partner Server',
      data.invite_url || null,
      data.rep_user_id || null,
      data.partner_count || 0,
      data.timestamp || Math.floor(Date.now() / 1000),
      data.notes || null
    );
    return { id: info.lastInsertRowid, ...data };
  },

  getPartnerships(guildId, limit = 50) {
    return db.prepare('SELECT * FROM partnerships WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?').all(guildId, limit);
  },

  getPartnershipStats(guildId) {
    const total = db.prepare('SELECT COUNT(*) as count FROM partnerships WHERE guild_id = ?').get(guildId).count;
    const leaderboard = db.prepare(`
      SELECT rep_user_id, COUNT(*) as count
      FROM partnerships
      WHERE guild_id = ? AND rep_user_id IS NOT NULL
      GROUP BY rep_user_id
      ORDER BY count DESC
      LIMIT 10
    `).all(guildId);
    return { total, leaderboard };
  },

  saveEmbedTemplate(guildId, templateId, name, embedData, componentsData = [], createdBy = null) {
    db.prepare(`
      INSERT OR REPLACE INTO embed_templates (id, guild_id, name, created_by, embed_data, components_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      templateId,
      guildId,
      name,
      createdBy,
      JSON.stringify(embedData),
      JSON.stringify(componentsData),
      Math.floor(Date.now() / 1000)
    );
    return this.getEmbedTemplate(templateId);
  },

  getEmbedTemplate(templateId) {
    const row = db.prepare('SELECT * FROM embed_templates WHERE id = ?').get(templateId);
    if (!row) return null;
    return {
      ...row,
      embed_data: JSON.parse(row.embed_data || '{}'),
      components_data: JSON.parse(row.components_data || '[]')
    };
  },

  getEmbedTemplates(guildId) {
    const rows = db.prepare('SELECT * FROM embed_templates WHERE guild_id = ? ORDER BY created_at DESC').all(guildId);
    return rows.map(r => ({
      ...r,
      embed_data: JSON.parse(r.embed_data || '{}'),
      components_data: JSON.parse(r.components_data || '[]')
    }));
  },

  deleteEmbedTemplate(templateId) {
    return db.prepare('DELETE FROM embed_templates WHERE id = ?').run(templateId);
  },

  addReactionRole(guildId, channelId, messageId, type, roleId, emoji, label = null, style = 'SECONDARY', groupName = 'default') {
    const info = db.prepare(`
      INSERT INTO reaction_roles (guild_id, channel_id, message_id, type, role_id, emoji, label, style, group_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, channelId, messageId, type, roleId, emoji, label, style, groupName);
    return { id: info.lastInsertRowid };
  },

  getReactionRolesForMessage(messageId) {
    return db.prepare('SELECT * FROM reaction_roles WHERE message_id = ?').all(messageId);
  },

  getReactionRoles(guildId) {
    return db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ?').all(guildId);
  },

  deleteReactionRole(id) {
    return db.prepare('DELETE FROM reaction_roles WHERE id = ?').run(id);
  },

  deleteReactionRolesForMessage(messageId) {
    return db.prepare('DELETE FROM reaction_roles WHERE message_id = ?').run(messageId);
  },

  getWelcomerConfig(guildId) {
    let row = db.prepare('SELECT * FROM welcomer_configs WHERE guild_id = ?').get(guildId);
    if (!row) {
      db.prepare('INSERT INTO welcomer_configs (guild_id) VALUES (?)').run(guildId);
      row = db.prepare('SELECT * FROM welcomer_configs WHERE guild_id = ?').get(guildId);
    }
    return {
      ...row,
      welcome_enabled: Boolean(row.welcome_enabled),
      welcome_dm_enabled: Boolean(row.welcome_dm_enabled),
      leave_enabled: Boolean(row.leave_enabled),
      card_enabled: Boolean(row.card_enabled),
      welcome_embed: row.welcome_embed ? JSON.parse(row.welcome_embed) : null,
      leave_embed: row.leave_embed ? JSON.parse(row.leave_embed) : null
    };
  },

  updateWelcomerConfig(guildId, data) {
    const current = this.getWelcomerConfig(guildId);
    const updated = { ...current, ...data };
    
    db.prepare(`
      INSERT OR REPLACE INTO welcomer_configs (
        guild_id, welcome_enabled, welcome_channel_id, welcome_message, welcome_embed,
        welcome_dm_enabled, welcome_dm_message, leave_enabled, leave_channel_id,
        leave_message, leave_embed, card_enabled, card_bg_color, auto_role_user, auto_role_bot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      updated.welcome_enabled ? 1 : 0,
      updated.welcome_channel_id || null,
      updated.welcome_message || '',
      updated.welcome_embed ? JSON.stringify(updated.welcome_embed) : null,
      updated.welcome_dm_enabled ? 1 : 0,
      updated.welcome_dm_message || '',
      updated.leave_enabled ? 1 : 0,
      updated.leave_channel_id || null,
      updated.leave_message || '',
      updated.leave_embed ? JSON.stringify(updated.leave_embed) : null,
      updated.card_enabled ? 1 : 0,
      updated.card_bg_color || '#1e1b4b',
      updated.auto_role_user || null,
      updated.auto_role_bot || null
    );
    return this.getWelcomerConfig(guildId);
  },

  getAutoresponders(guildId) {
    const rows = db.prepare('SELECT * FROM autoresponders WHERE guild_id = ?').all(guildId);
    return rows.map(r => ({
      ...r,
      enabled: Boolean(r.enabled),
      response_embed: r.response_embed ? JSON.parse(r.response_embed) : null,
      auto_reactions: JSON.parse(r.auto_reactions || '[]'),
      channels_whitelist: JSON.parse(r.channels_whitelist || '[]'),
      roles_whitelist: JSON.parse(r.roles_whitelist || '[]')
    }));
  },

  addAutoresponder(guildId, data) {
    const info = db.prepare(`
      INSERT INTO autoresponders (
        guild_id, trigger, match_type, response_text, response_embed, auto_reactions, channels_whitelist, roles_whitelist, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      data.trigger,
      data.match_type || 'CONTAINS',
      data.response_text || null,
      data.response_embed ? JSON.stringify(data.response_embed) : null,
      JSON.stringify(data.auto_reactions || []),
      JSON.stringify(data.channels_whitelist || []),
      JSON.stringify(data.roles_whitelist || []),
      data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1
    );
    return { id: info.lastInsertRowid, ...data };
  },

  deleteAutoresponder(id) {
    return db.prepare('DELETE FROM autoresponders WHERE id = ?').run(id);
  },

  getAutoreactionChannels(guildId) {
    const rows = db.prepare('SELECT * FROM autoreaction_channels WHERE guild_id = ?').all(guildId);
    return rows.map(r => ({
      ...r,
      enabled: Boolean(r.enabled),
      emojis: JSON.parse(r.emojis || '[]')
    }));
  },

  setAutoreactionChannel(guildId, channelId, emojis, enabled = true) {
    const existing = db.prepare('SELECT id FROM autoreaction_channels WHERE guild_id = ? AND channel_id = ?').get(guildId, channelId);
    if (existing) {
      db.prepare('UPDATE autoreaction_channels SET emojis = ?, enabled = ? WHERE id = ?').run(
        JSON.stringify(emojis),
        enabled ? 1 : 0,
        existing.id
      );
      return existing.id;
    } else {
      const info = db.prepare('INSERT INTO autoreaction_channels (guild_id, channel_id, emojis, enabled) VALUES (?, ?, ?, ?)').run(
        guildId,
        channelId,
        JSON.stringify(emojis),
        enabled ? 1 : 0
      );
      return info.lastInsertRowid;
    }
  },

  deleteAutoreactionChannel(id) {
    return db.prepare('DELETE FROM autoreaction_channels WHERE id = ?').run(id);
  },

  getAutomodConfig(guildId) {
    let row = db.prepare('SELECT * FROM automod_configs WHERE guild_id = ?').get(guildId);
    if (!row) {
      db.prepare('INSERT INTO automod_configs (guild_id) VALUES (?)').run(guildId);
      row = db.prepare('SELECT * FROM automod_configs WHERE guild_id = ?').get(guildId);
    }
    return {
      ...row,
      anti_invite: Boolean(row.anti_invite),
      anti_link: Boolean(row.anti_link),
      anti_spam: Boolean(row.anti_spam),
      anti_caps: Boolean(row.anti_caps),
      bad_words: JSON.parse(row.bad_words || '[]'),
      ignored_channels: JSON.parse(row.ignored_channels || '[]'),
      ignored_roles: JSON.parse(row.ignored_roles || '[]')
    };
  },

  updateAutomodConfig(guildId, data) {
    const current = this.getAutomodConfig(guildId);
    const updated = { ...current, ...data };

    db.prepare(`
      INSERT OR REPLACE INTO automod_configs (
        guild_id, anti_invite, anti_link, anti_spam, anti_caps, max_mentions, bad_words, ignored_channels, ignored_roles, action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      updated.anti_invite ? 1 : 0,
      updated.anti_link ? 1 : 0,
      updated.anti_spam ? 1 : 0,
      updated.anti_caps ? 1 : 0,
      updated.max_mentions || 5,
      JSON.stringify(updated.bad_words || []),
      JSON.stringify(updated.ignored_channels || []),
      JSON.stringify(updated.ignored_roles || []),
      updated.action || 'DELETE'
    );
    return this.getAutomodConfig(guildId);
  },

  addModerationCase(guildId, userId, moderatorId, actionType, reason, duration = 0) {
    const info = db.prepare(`
      INSERT INTO moderation_cases (guild_id, user_id, moderator_id, action_type, reason, duration, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      userId,
      moderatorId,
      actionType,
      reason || 'Nessun motivo specificato',
      duration,
      Math.floor(Date.now() / 1000)
    );
    return { id: info.lastInsertRowid };
  },

  getModerationCases(guildId, userId = null, limit = 20) {
    if (userId) {
      return db.prepare('SELECT * FROM moderation_cases WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC LIMIT ?').all(guildId, userId, limit);
    }
    return db.prepare('SELECT * FROM moderation_cases WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?').all(guildId, limit);
  },

  getTicketPanels(guildId) {
    return db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ?').all(guildId);
  },

  getTicketPanel(panelId) {
    return db.prepare('SELECT * FROM ticket_panels WHERE id = ?').get(panelId);
  },

  saveTicketPanel(panelData) {
    db.prepare(`
      INSERT OR REPLACE INTO ticket_panels (id, guild_id, channel_id, message_id, title, description, category_id, button_label, button_emoji, support_role_id, welcome_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      panelData.id,
      panelData.guild_id,
      panelData.channel_id || null,
      panelData.message_id || null,
      panelData.title || 'Crea un Ticket',
      panelData.description || 'Clicca sul pulsante per aprire un ticket.',
      panelData.category_id || null,
      panelData.button_label || 'Apri Ticket',
      panelData.button_emoji || '📩',
      panelData.support_role_id || null,
      panelData.welcome_message || 'Benvenuto {user.mention}!'
    );
    return this.getTicketPanel(panelData.id);
  },

  createTicket(guildId, channelId, userId, panelId = null) {
    const info = db.prepare(`
      INSERT INTO tickets (guild_id, channel_id, user_id, panel_id, status, created_at)
      VALUES (?, ?, ?, ?, 'OPEN', ?)
    `).run(guildId, channelId, userId, panelId, Math.floor(Date.now() / 1000));
    return { id: info.lastInsertRowid };
  },

  getTicketByChannel(channelId) {
    return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
  },

  closeTicket(channelId, transcript = null) {
    return db.prepare(`
      UPDATE tickets
      SET status = 'CLOSED', closed_at = ?, transcript_text = ?
      WHERE channel_id = ?
    `).run(Math.floor(Date.now() / 1000), transcript, channelId);
  },

  claimTicket(channelId, staffId) {
    return db.prepare(`
      UPDATE tickets
      SET status = 'CLAIMED', claimed_by = ?
      WHERE channel_id = ?
    `).run(staffId, channelId);
  },

  createGiveaway(guildId, channelId, messageId, prize, winnerCount, endTime, hostId) {
    const info = db.prepare(`
      INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winner_count, end_time, host_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, channelId, messageId, prize, winnerCount, endTime, hostId);
    return { id: info.lastInsertRowid };
  },

  getActiveGiveaways() {
    return db.prepare('SELECT * FROM giveaways WHERE ended = 0').all();
  },

  getGiveaway(messageId) {
    const row = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId);
    if (!row) return null;
    return {
      ...row,
      winners: JSON.parse(row.winners || '[]')
    };
  },

  endGiveaway(messageId, winners = []) {
    return db.prepare(`
      UPDATE giveaways
      SET ended = 1, winners = ?
      WHERE message_id = ?
    `).run(JSON.stringify(winners), messageId);
  },

  getLevelConfig(guildId) {
    let row = db.prepare('SELECT * FROM level_configs WHERE guild_id = ?').get(guildId);
    if (!row) {
      db.prepare('INSERT INTO level_configs (guild_id) VALUES (?)').run(guildId);
      row = db.prepare('SELECT * FROM level_configs WHERE guild_id = ?').get(guildId);
    }
    return {
      ...row,
      enabled: Boolean(row.enabled),
      dm_notifications: Boolean(row.dm_notifications)
    };
  },

  updateLevelConfig(guildId, data) {
    const current = this.getLevelConfig(guildId);
    const updated = { ...current, ...data };
    db.prepare(`
      INSERT OR REPLACE INTO level_configs (guild_id, enabled, xp_rate, channel_id, dm_notifications)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      guildId,
      updated.enabled ? 1 : 0,
      updated.xp_rate || 1.0,
      updated.channel_id || null,
      updated.dm_notifications ? 1 : 0
    );
    return this.getLevelConfig(guildId);
  },

  getUserLevel(guildId, userId) {
    let row = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (!row) {
      db.prepare('INSERT INTO levels (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
      row = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    }
    return row;
  },

  addXp(guildId, userId, amount) {
    const user = this.getUserLevel(guildId, userId);
    const newXp = user.xp + amount;
    const newLevel = Math.floor(0.1 * Math.sqrt(newXp));
    const leveledUp = newLevel > user.level;

    db.prepare(`
      UPDATE levels
      SET xp = ?, level = ?, total_messages = total_messages + 1, last_message_time = ?
      WHERE guild_id = ? AND user_id = ?
    `).run(newXp, newLevel, Math.floor(Date.now() / 1000), guildId, userId);

    return {
      previousLevel: user.level,
      newLevel,
      leveledUp,
      currentXp: newXp
    };
  },

  getLeaderboard(guildId, limit = 10) {
    return db.prepare(`
      SELECT user_id, xp, level, total_messages
      FROM levels
      WHERE guild_id = ?
      ORDER BY xp DESC
      LIMIT ?
    `).all(guildId, limit);
  },

  getLevelRewards(guildId) {
    return db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC').all(guildId);
  },

  addLevelReward(guildId, level, roleId) {
    return db.prepare('INSERT INTO level_rewards (guild_id, level, role_id) VALUES (?, ?, ?)').run(guildId, level, roleId);
  },

  deleteLevelReward(id) {
    return db.prepare('DELETE FROM level_rewards WHERE id = ?').run(id);
  },

  trackEmojiUse(guildId, emojiId, emojiName, isAnimated = false) {
    db.prepare(`
      INSERT INTO emoji_stats (guild_id, emoji_id, emoji_name, is_animated, use_count, last_used)
      VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(guild_id, emoji_id) DO UPDATE SET
        use_count = use_count + 1,
        last_used = ?
    `).run(
      guildId,
      emojiId,
      emojiName,
      isAnimated ? 1 : 0,
      Math.floor(Date.now() / 1000),
      Math.floor(Date.now() / 1000)
    );
  },

  getEmojiStats(guildId, limit = 20) {
    return db.prepare('SELECT * FROM emoji_stats WHERE guild_id = ? ORDER BY use_count DESC LIMIT ?').all(guildId, limit);
  }
};

export default DatabaseHelper;
