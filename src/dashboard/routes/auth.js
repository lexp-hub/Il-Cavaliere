import express from 'express';
import { CONFIG } from '../../config.js';

export const authRouter = express.Router();

// Discord OAuth2 URLs
const DISCORD_API_URL = 'https://discord.com/api/v10';
const OAUTH_SCOPES = ['identify', 'guilds'];

// 1. Start OAuth2 Login
authRouter.get('/login', (req, res) => {
  // If client ID is missing or demo mode is active, allow instant mock login
  if (!CONFIG.CLIENT_ID || !CONFIG.CLIENT_SECRET || CONFIG.DEMO_MODE) {
    req.session.user = {
      id: '999999999999999999',
      username: 'CavaliereAdmin',
      discriminator: '0',
      avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
      isDemo: true
    };
    return res.redirect('/dashboard.html');
  }

  const redirectUri = encodeURIComponent(CONFIG.OAUTH2_CALLBACK_URL);
  const scope = encodeURIComponent(OAUTH_SCOPES.join(' '));
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  
  res.redirect(discordAuthUrl);
});

// 2. OAuth2 Callback
authRouter.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: CONFIG.CLIENT_ID,
        client_secret: CONFIG.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code.toString(),
        redirect_uri: CONFIG.OAUTH2_CALLBACK_URL
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[OAuth2] Token error:', tokenData);
      return res.redirect('/?error=token_exchange_failed');
    }

    const accessToken = tokenData.access_token;

    // Fetch user info
    const userResponse = await fetch(`${DISCORD_API_URL}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userData = await userResponse.json();

    // Fetch user guilds
    const guildsResponse = await fetch(`${DISCORD_API_URL}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const guildsData = await guildsResponse.json();

    const avatarUrl = userData.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    // Store in session
    req.session.user = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: avatarUrl,
      guilds: guildsData || []
    };
    req.session.accessToken = accessToken;

    res.redirect('/dashboard.html');
  } catch (error) {
    console.error('[OAuth2] Auth exception:', error);
    res.redirect('/?error=auth_failed');
  }
});

// 3. Current User Endpoint
authRouter.get('/me', (req, res) => {
  if (!req.session.user) {
    // Return demo user if demo mode
    if (CONFIG.DEMO_MODE) {
      return res.json({
        id: '999999999999999999',
        username: 'CavaliereAdmin',
        avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
        isDemo: true
      });
    }
    return res.status(401).json({ error: 'Non autenticato' });
  }
  res.json(req.session.user);
});

// 4. Logout
authRouter.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

export default authRouter;

