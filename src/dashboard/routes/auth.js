import express from 'express';
import { CONFIG } from '../../config.js';

export const authRouter = express.Router();

const DISCORD_API_URL = 'https://discord.com/api/v10';
const OAUTH_SCOPES = ['identify', 'guilds'];

function getCallbackUrl(req) {
  if (process.env.OAUTH2_CALLBACK_URL) {
    return process.env.OAUTH2_CALLBACK_URL;
  }
  const host = req.get('x-forwarded-host') || req.get('host');
  let proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http') || req.protocol || 'http';
  if (host && (host.includes('wispbyte.app') || host.includes('https') || process.env.NODE_ENV === 'production')) {
    proto = 'https';
  }
  return `${proto}://${host}/auth/callback`;
}

authRouter.get('/login', (req, res) => {
  if (!CONFIG.CLIENT_ID) {
    return res.status(500).send('Errore: DISCORD_CLIENT_ID non configurato nelle variabili d\'ambiente di Wispbyte.');
  }

  const callbackUrl = getCallbackUrl(req);
  const redirectUri = encodeURIComponent(callbackUrl);
  const scope = encodeURIComponent(OAUTH_SCOPES.join(' '));
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  
  res.redirect(discordAuthUrl);
});

const handleCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect('/?error=no_code');
  }

  const callbackUrl = getCallbackUrl(req);

  try {
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
        redirect_uri: callbackUrl
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[OAuth2] Token error:', tokenData);
      return res.redirect('/?error=token_exchange_failed');
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch(`${DISCORD_API_URL}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userData = await userResponse.json();

    const guildsResponse = await fetch(`${DISCORD_API_URL}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const guildsData = await guildsResponse.json();

    const avatarUrl = userData.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

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
};

authRouter.get('/callback', handleCallback);
authRouter.get('/discord/callback', handleCallback);

authRouter.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  res.json(req.session.user);
});

authRouter.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

export default authRouter;
