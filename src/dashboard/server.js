import express from 'express';
import session from 'express-session';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config.js';
import { authRouter } from './routes/auth.js';
import { createGuildsRouter } from './routes/guilds.js';
import { createApiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createDashboardServer(botClient) {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(
    session({
      secret: CONFIG.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
    })
  );

  // Static Assets
  app.use(express.static(path.join(__dirname, 'public')));

  // Routes
  app.use('/auth', authRouter);
  app.use('/api/guilds', createGuildsRouter(botClient));
  app.use('/api', createApiRouter(botClient));

  // WebSocket connection for real-time live events to dashboard
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

