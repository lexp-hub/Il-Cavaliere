import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.DASHBOARD_PORT || process.env.SERVER_PORT || process.env.PORT || '9272', 10);

export const CONFIG = {
  BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '',
  CLIENT_ID: process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID || '',
  CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || '',
  CREATOR_ID: process.env.CREATOR_ID || '',
  
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || '',
  CLOUDFLARE_MODEL: process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

  PORT,
  DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'LumpaBread-Dash1946',
  SESSION_SECRET: process.env.SESSION_SECRET || 'il_cavaliere_secret_key_change_me_123456789',
  DASHBOARD_URL: (process.env.DASHBOARD_URL && !process.env.DASHBOARD_URL.includes('localhost') && !process.env.DASHBOARD_URL.includes('127.0.0.1'))
    ? process.env.DASHBOARD_URL
    : 'https://il-cavaliere.wispbyte.app',
  OAUTH2_CALLBACK_URL: (process.env.OAUTH2_CALLBACK_URL && !process.env.OAUTH2_CALLBACK_URL.includes('localhost'))
    ? process.env.OAUTH2_CALLBACK_URL
    : 'https://il-cavaliere.wispbyte.app/auth/discord/callback',
  
  DEFAULT_PREFIX: '!',
  BOT_NAME: 'Il Cavaliere',
  EMBED_COLOR: '#DC2626',
  EMBED_SUCCESS_COLOR: '#10B981',
  EMBED_ERROR_COLOR: '#B91C1C',
  EMBED_WARN_COLOR: '#F59E0B',
  
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../data/cavaliere.db'),
  PROMPT_PATH: path.join(__dirname, 'config/prompt.json'),
  
  DEMO_MODE: process.env.DEMO_MODE === 'true' || (!process.env.DISCORD_BOT_TOKEN && !process.env.DISCORD_TOKEN)
};

export default CONFIG;
