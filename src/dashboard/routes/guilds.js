import express from 'express';
import { ChannelType, PermissionsBitField } from 'discord.js';
import { DatabaseHelper } from '../../database/db.js';
import { CONFIG } from '../../config.js';

export function createGuildsRouter(botClient) {
  const router = express.Router();

  const requireAuth = (req, res, next) => {
    if (req.session.user || CONFIG.DEMO_MODE) {
      return next();
    }
    return res.status(401).json({ error: 'Accesso negato. Effettua prima il login.' });
  };

  router.get('/', requireAuth, (req, res) => {
    const user = req.session.user;

    if (!botClient?.isReady() || CONFIG.DEMO_MODE) {
      const demoGuilds = [
        {
          id: '123456789012345678',
          name: '🏰 Il Reame del Cavaliere',
          icon: null,
          memberCount: 1420,
          botJoined: true,
          permissions: 'Administrator',
          activeModulesCount: 8
        },
        {
          id: '987654321098765432',
          name: '⚔️ Gilda dei Guerrieri',
          icon: null,
          memberCount: 530,
          botJoined: true,
          permissions: 'ManageGuild',
          activeModulesCount: 6
        },
        {
          id: '555555555555555555',
          name: '🎮 Community Gaming Italia',
          icon: null,
          memberCount: 2890,
          botJoined: false,
          permissions: 'Administrator',
          activeModulesCount: 0
        }
      ];
      return res.json(demoGuilds);
    }

    const userGuilds = user?.guilds || [];
    const botGuilds = botClient.guilds.cache;

    if (userGuilds.length === 0) {
      const allBotGuilds = Array.from(botGuilds.values()).map(g => {
        const iconUrl = g.iconURL ? g.iconURL() : null;
        const settings = DatabaseHelper.getGuildSettings(g.id);
        const activeCount = settings ? Object.values(settings.modules_enabled || {}).filter(Boolean).length : 0;
        return {
          id: g.id,
          name: g.name,
          icon: iconUrl,
          memberCount: g.memberCount,
          botJoined: true,
          permissions: 'Administrator',
          activeModulesCount: activeCount
        };
      });
      return res.json(allBotGuilds);
    }

    const manageable = userGuilds.filter(g => {
      const perms = BigInt(g.permissions || '0');
      const isAdmin = (perms & BigInt(PermissionsBitField.Flags.Administrator)) !== BigInt(0);
      const isManager = (perms & BigInt(PermissionsBitField.Flags.ManageGuild)) !== BigInt(0);
      return isAdmin || isManager;
    });

    const result = manageable.map(g => {
      const botGuild = botGuilds.get(g.id);
      const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null;
      const settings = botGuild ? DatabaseHelper.getGuildSettings(g.id) : null;
      const activeCount = settings ? Object.values(settings.modules_enabled).filter(Boolean).length : 0;

      return {
        id: g.id,
        name: g.name,
        icon: iconUrl,
        memberCount: botGuild?.memberCount || 0,
        botJoined: Boolean(botGuild),
        permissions: (BigInt(g.permissions) & BigInt(PermissionsBitField.Flags.Administrator)) ? 'Administrator' : 'ManageGuild',
        activeModulesCount: activeCount
      };
    });

    res.json(result);
  });

  router.get('/:guildId', requireAuth, (req, res) => {
    const guildId = req.params.guildId;

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.json({
        id: guildId,
        name: '🏰 Il Reame del Cavaliere (Demo)',
        memberCount: 1420,
        icon: null,
        channels: [
          { id: '101', name: 'generale', type: 0 },
          { id: '102', name: 'annunci', type: 0 },
          { id: '103', name: 'partnership', type: 0 },
          { id: '104', name: 'benvenuto', type: 0 },
          { id: '105', name: 'comandi-bot', type: 0 },
          { id: '106', name: 'suggerimenti', type: 0 },
          { id: '107', name: 'logs', type: 0 },
          { id: '201', name: 'SUPPORTO TICKET', type: 4 }
        ],
        roles: [
          { id: '301', name: '👑 Fondatore', color: '#f59e0b' },
          { id: '302', name: '🛡️ Moderatore', color: '#3b82f6' },
          { id: '303', name: '🤝 Partner Manager', color: '#06b6d4' },
          { id: '304', name: '🔔 Notifiche Annunci', color: '#8b5cf6' },
          { id: '305', name: '⭐ Membro VIP', color: '#ec4899' },
          { id: '306', name: 'Membro', color: '#94a3b8' }
        ]
      });
    }

    const guild = botClient.guilds.cache.get(guildId);
    const channels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement || c.type === ChannelType.GuildCategory)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const roles = guild.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        position: r.position
      }))
      .sort((a, b) => b.position - a.position);

    res.json({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL ? guild.iconURL() : null,
      memberCount: guild.memberCount,
      channels,
      roles
    });
  });

  return router;
}

export default createGuildsRouter;
