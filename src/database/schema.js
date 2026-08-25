export const SCHEMA = `
-- Configurazione del Server
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  prefix TEXT DEFAULT '!',
  language TEXT DEFAULT 'it',
  log_channel_id TEXT,
  mute_role_id TEXT,
  auto_role_user TEXT,
  auto_role_bot TEXT,
  modules_enabled TEXT DEFAULT '{"partnerships":true,"embeds":true,"reaction_roles":true,"welcomer":true,"autoresponder":true,"moderation":true,"tickets":true,"giveaways":true,"leveling":true,"starboard":true,"ai":true}'
);

-- Modulo AI (Il Cavaliere Brain)
CREATE TABLE IF NOT EXISTS ai_configs (
  guild_id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  model TEXT DEFAULT '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  system_prompt TEXT,
  web_search_enabled INTEGER DEFAULT 1,
  max_chars INTEGER DEFAULT 300,
  channels_whitelist TEXT DEFAULT '[]',
  roles_whitelist TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS ai_channel_memories (
  channel_id TEXT PRIMARY KEY,
  reset_timestamp INTEGER DEFAULT 0,
  logs TEXT DEFAULT '[]'
);

-- Modulo Partnerships
CREATE TABLE IF NOT EXISTS partnership_configs (
  guild_id TEXT PRIMARY KEY,
  channel_id TEXT,
  ping_role_id TEXT,
  min_members INTEGER DEFAULT 0,
  cooldown_minutes INTEGER DEFAULT 60,
  embed_template TEXT,
  log_channel_id TEXT,
  enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS partnerships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  partner_guild_id TEXT,
  partner_name TEXT,
  invite_url TEXT,
  rep_user_id TEXT,
  partner_count INTEGER DEFAULT 0,
  timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  notes TEXT
);

-- Modulo Embed Builder & Templates
CREATE TABLE IF NOT EXISTS embed_templates (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_by TEXT,
  embed_data TEXT NOT NULL,
  components_data TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Modulo Reaction Roles & Button Roles
CREATE TABLE IF NOT EXISTS reaction_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  type TEXT DEFAULT 'BUTTON', -- 'BUTTON', 'SELECT', 'REACTION'
  role_id TEXT NOT NULL,
  emoji TEXT,
  label TEXT,
  style TEXT DEFAULT 'SECONDARY',
  group_name TEXT DEFAULT 'default'
);

-- Modulo Welcomer & Leaver
CREATE TABLE IF NOT EXISTS welcomer_configs (
  guild_id TEXT PRIMARY KEY,
  welcome_enabled INTEGER DEFAULT 0,
  welcome_channel_id TEXT,
  welcome_message TEXT DEFAULT 'Benvenuto {user.mention} in **{server.name}**! Siamo ora in **{server.memberCount}**!',
  welcome_embed TEXT,
  welcome_dm_enabled INTEGER DEFAULT 0,
  welcome_dm_message TEXT DEFAULT 'Benvenuto in {server.name}!',
  leave_enabled INTEGER DEFAULT 0,
  leave_channel_id TEXT,
  leave_message TEXT DEFAULT '{user.tag} ha lasciato il server. Siamo rimasti in {server.memberCount}.',
  leave_embed TEXT,
  card_enabled INTEGER DEFAULT 1,
  card_bg_color TEXT DEFAULT '#1e1b4b',
  auto_role_user TEXT,
  auto_role_bot TEXT
);

-- Modulo Auto-Responder & Reaction Messages
CREATE TABLE IF NOT EXISTS autoresponders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  match_type TEXT DEFAULT 'CONTAINS',
  response_text TEXT,
  response_embed TEXT,
  auto_reactions TEXT DEFAULT '[]',
  channels_whitelist TEXT DEFAULT '[]',
  roles_whitelist TEXT DEFAULT '[]',
  enabled INTEGER DEFAULT 1
);

-- Canali Auto-Reaction
CREATE TABLE IF NOT EXISTS autoreaction_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  emojis TEXT NOT NULL DEFAULT '["👍","👎"]',
  enabled INTEGER DEFAULT 1
);

-- Modulo Starboard
CREATE TABLE IF NOT EXISTS starboards (
  guild_id TEXT PRIMARY KEY,
  channel_id TEXT,
  emoji TEXT DEFAULT '⭐',
  min_stars INTEGER DEFAULT 3,
  enabled INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS starboard_messages (
  guild_id TEXT NOT NULL,
  original_message_id TEXT NOT NULL,
  starboard_message_id TEXT NOT NULL,
  star_count INTEGER DEFAULT 0,
  PRIMARY KEY (guild_id, original_message_id)
);

-- Modulo AutoMod & Moderazione
CREATE TABLE IF NOT EXISTS automod_configs (
  guild_id TEXT PRIMARY KEY,
  anti_invite INTEGER DEFAULT 1,
  anti_link INTEGER DEFAULT 0,
  anti_spam INTEGER DEFAULT 1,
  anti_caps INTEGER DEFAULT 0,
  max_mentions INTEGER DEFAULT 5,
  bad_words TEXT DEFAULT '[]',
  ignored_channels TEXT DEFAULT '[]',
  ignored_roles TEXT DEFAULT '[]',
  action TEXT DEFAULT 'DELETE'
);

CREATE TABLE IF NOT EXISTS moderation_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  reason TEXT DEFAULT 'Nessun motivo specificato',
  duration INTEGER DEFAULT 0,
  timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Modulo Ticket System
CREATE TABLE IF NOT EXISTS ticket_panels (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT,
  message_id TEXT,
  title TEXT DEFAULT 'Crea un Ticket',
  description TEXT DEFAULT 'Clicca sul pulsante sottostante per aprire un ticket di supporto.',
  category_id TEXT,
  button_label TEXT DEFAULT 'Apri Ticket',
  button_emoji TEXT DEFAULT '📩',
  support_role_id TEXT,
  welcome_message TEXT DEFAULT 'Benvenuto {user.mention}! Lo staff ti risponderà a breve.'
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  panel_id TEXT,
  status TEXT DEFAULT 'OPEN',
  claimed_by TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  closed_at INTEGER,
  transcript_text TEXT
);

-- Modulo Giveaways
CREATE TABLE IF NOT EXISTS giveaways (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  prize TEXT NOT NULL,
  winner_count INTEGER DEFAULT 1,
  end_time INTEGER NOT NULL,
  host_id TEXT NOT NULL,
  winners TEXT DEFAULT '[]',
  ended INTEGER DEFAULT 0
);

-- Modulo Leveling & XP
CREATE TABLE IF NOT EXISTS level_configs (
  guild_id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 1,
  xp_rate REAL DEFAULT 1.0,
  channel_id TEXT,
  dm_notifications INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS levels (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  last_message_time INTEGER DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS level_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  role_id TEXT NOT NULL
);

-- Modulo Emoji Tracker
CREATE TABLE IF NOT EXISTS emoji_stats (
  guild_id TEXT NOT NULL,
  emoji_id TEXT NOT NULL,
  emoji_name TEXT NOT NULL,
  is_animated INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  last_used INTEGER DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (guild_id, emoji_id)
);
`;
