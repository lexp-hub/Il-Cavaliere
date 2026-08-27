import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config.js';
import { SCHEMA } from './schema.js';

const dbDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let rawDb = null;
let isNodeSqlite = false;

try {
  const { DatabaseSync } = await import('node:sqlite');
  rawDb = new DatabaseSync(CONFIG.DB_PATH);
  rawDb.exec('PRAGMA foreign_keys = ON;');
  rawDb.exec('PRAGMA journal_mode = WAL;');
  isNodeSqlite = true;
  console.log(`[Database] Connected using built-in node:sqlite (Node 22+) to ${CONFIG.DB_PATH}`);
} catch (e1) {
  try {
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    rawDb = new BetterSqlite3(CONFIG.DB_PATH);
    rawDb.pragma('journal_mode = WAL');
    rawDb.pragma('foreign_keys = ON');
    console.log(`[Database] Connected using better-sqlite3 to ${CONFIG.DB_PATH}`);
  } catch (e2) {
    console.error('[Database Error] Failed to initialize SQLite database:', e2.message);
  }
}

class UniversalDatabase {
  constructor(instance, isNode) {
    this.raw = instance;
    this.isNode = isNode;
  }

  pragma(str) {
    if (this.raw?.pragma) {
      return this.raw.pragma(str);
    }
    return this.raw?.exec(`PRAGMA ${str}`);
  }

  exec(sql) {
    return this.raw?.exec(sql);
  }

  prepare(sql) {
    const stmt = this.raw.prepare(sql);
    if (!this.isNode) return stmt;

    return {
      get: (...args) => stmt.get(...args),
      all: (...args) => stmt.all(...args),
      run: (...args) => {
        const res = stmt.run(...args);
        return {
          changes: Number(res?.changes || 0),
          lastInsertRowid: Number(res?.lastInsertRowid || 0)
        };
      }
    };
  }
}

export const db = new UniversalDatabase(rawDb, isNodeSqlite);
db.exec(SCHEMA);

// Safe dynamic column migrations for ticket_panels
try { db.exec("ALTER TABLE ticket_panels ADD COLUMN color TEXT DEFAULT '#ea580c';"); } catch (e) {}
try { db.exec("ALTER TABLE ticket_panels ADD COLUMN image TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE ticket_panels ADD COLUMN footer TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE ticket_panels ADD COLUMN button_style TEXT DEFAULT 'Primary';"); } catch (e) {}
try { db.exec("ALTER TABLE ticket_panels ADD COLUMN naming_scheme TEXT DEFAULT 'ticket-{user}';"); } catch (e) {}
try { db.exec("ALTER TABLE ticket_panels ADD COLUMN log_channel_id TEXT;"); } catch (e) {}

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
      ai: true,
      setups: true
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
      VALUES (?, '!', 'it', '{"partnerships":true,"embeds":true,"reaction_roles":true,"welcomer":true,"autoresponder":true,"moderation":true,"tickets":true,"giveaways":true,"leveling":true,"starboard":true,"ai":true,"setups":true}')
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
    let parsedWelcomeEmbed = null;
    let parsedLeaveEmbed = null;
    try {
      if (row.welcome_embed) {
        parsedWelcomeEmbed = typeof row.welcome_embed === 'string' ? JSON.parse(row.welcome_embed) : row.welcome_embed;
      }
    } catch (e) {
      parsedWelcomeEmbed = null;
    }
    try {
      if (row.leave_embed) {
        parsedLeaveEmbed = typeof row.leave_embed === 'string' ? JSON.parse(row.leave_embed) : row.leave_embed;
      }
    } catch (e) {
      parsedLeaveEmbed = null;
    }

    return {
      ...row,
      welcome_enabled: Boolean(row.welcome_enabled),
      welcome_dm_enabled: Boolean(row.welcome_dm_enabled),
      leave_enabled: Boolean(row.leave_enabled),
      card_enabled: Boolean(row.card_enabled),
      welcome_embed: parsedWelcomeEmbed,
      leave_embed: parsedLeaveEmbed
    };
  },

  updateWelcomerConfig(guildId, data) {
    const current = this.getWelcomerConfig(guildId);
    const updated = { ...current, ...data };
    
    let welcomeEmbStr = null;
    if (updated.welcome_embed) {
      welcomeEmbStr = typeof updated.welcome_embed === 'string' ? updated.welcome_embed : JSON.stringify(updated.welcome_embed);
    }
    let leaveEmbStr = null;
    if (updated.leave_embed) {
      leaveEmbStr = typeof updated.leave_embed === 'string' ? updated.leave_embed : JSON.stringify(updated.leave_embed);
    }

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
      welcomeEmbStr,
      updated.welcome_dm_enabled ? 1 : 0,
      updated.welcome_dm_message || '',
      updated.leave_enabled ? 1 : 0,
      updated.leave_channel_id || null,
      updated.leave_message || '',
      leaveEmbStr,
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
      INSERT OR REPLACE INTO ticket_panels (
        id, guild_id, channel_id, message_id, title, description, color, image, footer, button_style, category_id, button_label, button_emoji, support_role_id, welcome_message, naming_scheme, log_channel_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      panelData.id,
      panelData.guild_id,
      panelData.channel_id || null,
      panelData.message_id || null,
      panelData.title || 'Crea un Ticket',
      panelData.description || 'Clicca sul pulsante sottostante per aprire un ticket.',
      panelData.color || '#ea580c',
      panelData.image || null,
      panelData.footer || null,
      panelData.button_style || 'Primary',
      panelData.category_id || null,
      panelData.button_label || 'Apri Ticket',
      panelData.button_emoji || '📩',
      panelData.support_role_id || null,
      panelData.welcome_message || 'Benvenuto {user.mention}! Lo staff ti risponderà a breve.',
      panelData.naming_scheme || 'ticket-{user}',
      panelData.log_channel_id || null
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
  },

  // === Counting Game Helpers ===
  getCountingConfig(guildId) {
    const row = db.prepare('SELECT * FROM counting_configs WHERE guild_id = ?').get(guildId);
    if (!row) {
      db.prepare('INSERT INTO counting_configs (guild_id, current_number, highest_streak, enabled) VALUES (?, 0, 0, 0)').run(guildId);
      return { guild_id: guildId, channel_id: null, current_number: 0, last_user_id: null, highest_streak: 0, allow_ruin_reset: 1, enabled: 0 };
    }
    return row;
  },

  saveCountingConfig(guildId, config) {
    return db.prepare(`
      INSERT INTO counting_configs (guild_id, channel_id, current_number, last_user_id, highest_streak, allow_ruin_reset, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        channel_id = excluded.channel_id,
        current_number = excluded.current_number,
        last_user_id = excluded.last_user_id,
        highest_streak = excluded.highest_streak,
        allow_ruin_reset = excluded.allow_ruin_reset,
        enabled = excluded.enabled
    `).run(
      guildId,
      config.channel_id ?? null,
      config.current_number ?? 0,
      config.last_user_id ?? null,
      config.highest_streak ?? 0,
      config.allow_ruin_reset !== undefined ? (config.allow_ruin_reset ? 1 : 0) : 1,
      config.enabled !== undefined ? (config.enabled ? 1 : 0) : 0
    );
  },

  recordCountSuccess(guildId, userId, nextNumber) {
    const cfg = this.getCountingConfig(guildId);
    const newStreak = Math.max(cfg.highest_streak || 0, nextNumber);
    
    db.prepare(`
      UPDATE counting_configs SET
        current_number = ?,
        last_user_id = ?,
        highest_streak = ?
      WHERE guild_id = ?
    `).run(nextNumber, userId, newStreak, guildId);

    db.prepare(`
      INSERT INTO counting_scores (guild_id, user_id, counts, correct_counts, ruined_counts)
      VALUES (?, ?, 1, 1, 0)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        counts = counts + 1,
        correct_counts = correct_counts + 1
    `).run(guildId, userId);
  },

  recordCountRuin(guildId, userId) {
    db.prepare(`
      UPDATE counting_configs SET
        current_number = 0,
        last_user_id = NULL
      WHERE guild_id = ?
    `).run(guildId);

    db.prepare(`
      INSERT INTO counting_scores (guild_id, user_id, counts, correct_counts, ruined_counts)
      VALUES (?, ?, 1, 0, 1)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        counts = counts + 1,
        ruined_counts = ruined_counts + 1
    `).run(guildId, userId);
  },

  getCountingLeaderboard(guildId, limit = 10) {
    return db.prepare('SELECT * FROM counting_scores WHERE guild_id = ? ORDER BY correct_counts DESC LIMIT ?').all(guildId, limit);
  },

  // === Fishing & Medieval Economy Helpers ===
  getFishingProfile(guildId, userId) {
    let row = db.prepare('SELECT * FROM fishing_profiles WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (!row) {
      db.prepare('INSERT INTO fishing_profiles (guild_id, user_id, rod_level, coins, total_fish_caught, last_fished, last_daily, inventory) VALUES (?, ?, 1, 100, 0, 0, 0, ?)').run(guildId, userId, JSON.stringify([]));
      row = { guild_id: guildId, user_id: userId, rod_level: 1, coins: 100, total_fish_caught: 0, last_fished: 0, last_daily: 0, inventory: '[]' };
    }
    return {
      ...row,
      inventory: typeof row.inventory === 'string' ? JSON.parse(row.inventory || '[]') : (row.inventory || [])
    };
  },

  saveFishingProfile(guildId, userId, profile) {
    return db.prepare(`
      INSERT INTO fishing_profiles (guild_id, user_id, rod_level, coins, total_fish_caught, last_fished, last_daily, inventory)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        rod_level = excluded.rod_level,
        coins = excluded.coins,
        total_fish_caught = excluded.total_fish_caught,
        last_fished = excluded.last_fished,
        last_daily = excluded.last_daily,
        inventory = excluded.inventory
    `).run(
      guildId,
      userId,
      profile.rod_level || 1,
      profile.coins ?? 100,
      profile.total_fish_caught || 0,
      profile.last_fished || 0,
      profile.last_daily || 0,
      JSON.stringify(profile.inventory || [])
    );
  },

  getFishingLeaderboard(guildId, limit = 10) {
    return db.prepare('SELECT * FROM fishing_profiles WHERE guild_id = ? ORDER BY coins DESC, total_fish_caught DESC LIMIT ?').all(guildId, limit);
  },

  // === Ticket Automation Helpers ===
  getTicketAutomation(guildId) {
    const row = db.prepare('SELECT * FROM ticket_automations WHERE guild_id = ?').get(guildId);
    if (!row) {
      db.prepare('INSERT INTO ticket_automations (guild_id) VALUES (?)').run(guildId);
      return { guild_id: guildId, auto_close_hours: 48, auto_transcript_dm: 1, auto_tag_staff: 1, inactivity_warning_hours: 24 };
    }
    return row;
  },

  saveTicketAutomation(guildId, config) {
    return db.prepare(`
      INSERT INTO ticket_automations (guild_id, auto_close_hours, auto_transcript_dm, auto_tag_staff, inactivity_warning_hours)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        auto_close_hours = excluded.auto_close_hours,
        auto_transcript_dm = excluded.auto_transcript_dm,
        auto_tag_staff = excluded.auto_tag_staff,
        inactivity_warning_hours = excluded.inactivity_warning_hours
    `).run(
      guildId,
      config.auto_close_hours || 48,
      config.auto_transcript_dm !== undefined ? (config.auto_transcript_dm ? 1 : 0) : 1,
      config.auto_tag_staff !== undefined ? (config.auto_tag_staff ? 1 : 0) : 1,
      config.inactivity_warning_hours || 24
    );
  },

  // === Community Presentations (Presentazioni) Helpers ===
  getPresentationConfig(guildId) {
    let row = db.prepare('SELECT * FROM presentation_configs WHERE guild_id = ?').get(guildId);
    if (!row) {
      db.prepare('INSERT INTO presentation_configs (guild_id) VALUES (?)').run(guildId);
      row = db.prepare('SELECT * FROM presentation_configs WHERE guild_id = ?').get(guildId);
    }
    return {
      ...row,
      enabled: Boolean(row.enabled)
    };
  },

  updatePresentationConfig(guildId, data) {
    const current = this.getPresentationConfig(guildId);
    const updated = { ...current, ...data };
    db.prepare(`
      INSERT OR REPLACE INTO presentation_configs (guild_id, channel_id, reward_role_id, xp_reward, title, color, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      updated.channel_id || null,
      updated.reward_role_id || null,
      updated.xp_reward !== undefined ? updated.xp_reward : 100,
      updated.title || '📜 Presentazione del Cavaliere',
      updated.color || '#6366f1',
      updated.enabled ? 1 : 0
    );
    return this.getPresentationConfig(guildId);
  },

  savePresentationConfig(guildId, data) {
    return this.updatePresentationConfig(guildId, data);
  },

  addPresentation(guildId, data) {
    const info = db.prepare(`
      INSERT INTO presentations (guild_id, user_id, name, age_pronouns, hobbies, bio, social_media, message_id, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      data.user_id,
      data.name,
      data.age_pronouns || null,
      data.hobbies,
      data.bio,
      data.social_media || null,
      data.message_id || null,
      data.timestamp || Math.floor(Date.now() / 1000)
    );
    return { id: info.lastInsertRowid, ...data };
  },

  getPresentations(guildId, limit = 20) {
    return db.prepare('SELECT * FROM presentations WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?').all(guildId, limit);
  },

  getUserPresentation(guildId, userId) {
    return db.prepare('SELECT * FROM presentations WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC LIMIT 1').get(guildId, userId);
  },

  getSetupShowcaseConfig(guildId) {
    const row = db.prepare('SELECT * FROM setup_showcase_configs WHERE guild_id = ?').get(guildId);
    if (!row) {
      db.prepare(`
        INSERT OR IGNORE INTO setup_showcase_configs (guild_id, title, color, auto_reactions, auto_thread, xp_reward, delete_invalid, enabled)
        VALUES (?, '🖥️ Setup & Postazione', '#dc2626', '["🔥","⭐","❤️"]', 1, 50, 1, 0)
      `).run(guildId);
      return this.getSetupShowcaseConfig(guildId);
    }
    return {
      ...row,
      enabled: Boolean(row.enabled),
      auto_thread: Boolean(row.auto_thread),
      require_text: Boolean(row.require_text),
      delete_invalid: Boolean(row.delete_invalid),
      auto_reactions: JSON.parse(row.auto_reactions || '["🔥","⭐","❤️"]')
    };
  },

  updateSetupShowcaseConfig(guildId, data) {
    this.getSetupShowcaseConfig(guildId);
    const autoReactions = Array.isArray(data.auto_reactions)
      ? JSON.stringify(data.auto_reactions)
      : (typeof data.auto_reactions === 'string' ? data.auto_reactions : '["🔥","⭐","❤️"]');

    db.prepare(`
      UPDATE setup_showcase_configs
      SET channel_id = ?,
          title = ?,
          color = ?,
          auto_reactions = ?,
          auto_thread = ?,
          reward_role_id = ?,
          xp_reward = ?,
          require_text = ?,
          delete_invalid = ?,
          enabled = ?
      WHERE guild_id = ?
    `).run(
      data.channel_id || null,
      data.title || '🖥️ Setup & Postazione',
      data.color || '#dc2626',
      autoReactions,
      data.auto_thread ? 1 : 0,
      data.reward_role_id || null,
      data.xp_reward !== undefined ? Number(data.xp_reward) : 50,
      data.require_text ? 1 : 0,
      data.delete_invalid ? 1 : 0,
      data.enabled ? 1 : 0,
      guildId
    );
    return this.getSetupShowcaseConfig(guildId);
  },

  saveSetupSubmission(guildId, data) {
    const info = db.prepare(`
      INSERT INTO setup_submissions (guild_id, user_id, image_url, description, embed_message_id, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      data.user_id,
      data.image_url,
      data.description || null,
      data.embed_message_id || null,
      data.timestamp || Math.floor(Date.now() / 1000)
    );
    return { id: info.lastInsertRowid, ...data };
  },

  getSetupSubmissions(guildId, limit = 20) {
    return db.prepare('SELECT * FROM setup_submissions WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?').all(guildId, limit);
  },

  saveAuthSession(token, userData, accessToken) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO auth_sessions (token, user_data, access_token, created_at)
        VALUES (?, ?, ?, ?)
      `).run(token, JSON.stringify(userData), accessToken || '', Date.now());
    } catch (e) {
      console.error('[DB] Error saving auth session:', e.message);
    }
  },

  getAuthSession(token) {
    try {
      const row = db.prepare('SELECT user_data, created_at FROM auth_sessions WHERE token = ?').get(token);
      if (!row) return null;
      if (Date.now() - Number(row.created_at || 0) > 90 * 24 * 60 * 60 * 1000) {
        db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
        return null;
      }
      return JSON.parse(row.user_data);
    } catch (e) {
      console.error('[DB] Error getting auth session:', e.message);
      return null;
    }
  },

  deleteAuthSession(token) {
    try {
      db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    } catch (e) {}
  }
};

export default DatabaseHelper;
