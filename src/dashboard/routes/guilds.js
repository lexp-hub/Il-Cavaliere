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
    return res.status(401).json({ error: 'Accesso negato. Effettua prima il login con Discord.' });
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

    if (!botClient?.isReady() || CONFIG.DEMO_MODE || !botClient.guilds.cache.has(guildId)) {
      
      return res.json({
        id: guildId,
        name: '🏰 Il Reame del Cavaliere',
        icon: null,
        memberCount: 1420,
        botJoined: true,
        channels: [
          { id: '101', name: '📢-annunci', type: 'text', typeName: 'GuildText' },
          { id: '102', name: '💬-chat-generale', type: 'text', typeName: 'GuildText' },
          { id: '103', name: '🤝-partnership', type: 'text', typeName: 'GuildText' },
          { id: '104', name: '👋-benvenuto', type: 'text', typeName: 'GuildText' },
          { id: '105', name: '💡-suggerimenti', type: 'text', typeName: 'GuildText' },
          { id: '106', name: '🛡️-audit-log', type: 'text', typeName: 'GuildText' },
          { id: '107', name: '⭐-starboard', type: 'text', typeName: 'GuildText' },
          { id: '201', name: '🔊 Salotto Vocale', type: 'voice', typeName: 'GuildVoice' },
          { id: '301', name: '📁 SUPPORTO', type: 'category', typeName: 'GuildCategory' }
        ],
        roles: [
          { id: '501', name: '👑 Cavaliere Supremo (Owner)', color: '#8B5CF6' },
          { id: '502', name: '🛡️ Moderatore', color: '#10B981' },
          { id: '503', name: '🤝 Partner Manager', color: '#06B6D4' },
          { id: '504', name: '⭐ Membro VIP', color: '#F59E0B' },
          { id: '505', name: '👤 Membro', color: '#94A3B8' }
        ],
        settings: DatabaseHelper.getGuildSettings(guildId)
      });
    }

    const guild = botClient.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Server non trovato o bot non presente.' });
    }

    const channels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildCategory)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type === ChannelType.GuildText ? 'text' : c.type === ChannelType.GuildVoice ? 'voice' : 'category',
        typeName: ChannelType[c.type]
      }));

    const roles = guild.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor
      }));

    const settings = DatabaseHelper.getGuildSettings(guildId);

    res.json({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ dynamic: true, size: 128 }),
      memberCount: guild.memberCount,
      botJoined: true,
      channels,
      roles,
      settings
    });
  });

  return router;
}

export default createGuildsRouter;
