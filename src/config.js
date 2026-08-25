import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '',
  CLIENT_ID: process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID || '',
  CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || '',
  CREATOR_ID: process.env.CREATOR_ID || '',
  
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || '',
  CLOUDFLARE_MODEL: process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

  PORT: parseInt(process.env.SERVER_PORT || process.env.PORT || process.env.DASHBOARD_PORT || '3000', 10),
  DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'il_cavaliere_secret_pass',
  SESSION_SECRET: process.env.SESSION_SECRET || 'il_cavaliere_secret_key_change_me_123456789',
  DASHBOARD_URL: process.env.DASHBOARD_URL || `http://localhost:${process.env.SERVER_PORT || process.env.PORT || process.env.DASHBOARD_PORT || '3000'}`,
  OAUTH2_CALLBACK_URL: process.env.OAUTH2_CALLBACK_URL || `http://localhost:${process.env.SERVER_PORT || process.env.PORT || process.env.DASHBOARD_PORT || '3000'}/auth/discord/callback`,
  
  DEFAULT_PREFIX: '!',
  BOT_NAME: 'Il Cavaliere',
  EMBED_COLOR: '#8B5CF6',
  EMBED_SUCCESS_COLOR: '#10B981',
  EMBED_ERROR_COLOR: '#EF4444',
  EMBED_WARN_COLOR: '#F59E0B',
  
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../data/cavaliere.db'),
  PROMPT_PATH: path.join(__dirname, 'config/prompt.json'),
  
  DEMO_MODE: process.env.DEMO_MODE === 'true' || (!process.env.DISCORD_BOT_TOKEN && !process.env.DISCORD_TOKEN)
};

export default CONFIG;
