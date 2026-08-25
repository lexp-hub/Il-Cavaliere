import express from 'express';
import session from 'express-session';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config.js';
import { authRouter, validateAuthToken } from './routes/auth.js';
import { createGuildsRouter } from './routes/guilds.js';
import { createApiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createDashboardServer(botClient) {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.set('trust proxy', 1);

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(
    session({
      secret: CONFIG.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 90 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
      }
    })
  );

  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = validateAuthToken(token);
      if (user) {
        req.session.user = user;
        req.user = user;
      }
    }
    next();
  });

  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/auth', authRouter);
  app.use('/api/guilds', createGuildsRouter(botClient));
  app.use('/api', createApiRouter(botClient));

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({
      type: 'INIT',
      botOnline: Boolean(botClient?.isReady()),
      botName: botClient?.user?.tag || CONFIG.BOT_NAME,
      timestamp: Date.now()
    }));
  });

  return { app, server, wss };
}

export default createDashboardServer;
