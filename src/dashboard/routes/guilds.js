import express from 'express';
import { ChannelType, PermissionsBitField } from 'discord.js';
import { DatabaseHelper } from '../../database/db.js';
import { CONFIG } from '../../config.js';

export function createGuildsRouter(botClient) {
  const router = express.Router();

  router.get('/', (req, res) => {
    if (botClient?.isReady() && botClient.guilds.cache.size > 0) {
      const realGuilds = Array.from(botClient.guilds.cache.values()).map(g => {
        const iconUrl = g.iconURL ? g.iconURL({ size: 128 }) : null;
        const settings = DatabaseHelper.getGuildSettings(g.id);
        const activeCount = settings ? Object.values(settings.modules_enabled || {}).filter(Boolean).length : 8;
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
      return res.json(realGuilds);
    }

    const demoGuilds = [
      {
        id: '123456789012345678',
        name: '🏰 In attesa di connessione bot...',
        icon: null,
        memberCount: 1,
        botJoined: false,
        permissions: 'Administrator',
        activeModulesCount: 0
      }
    ];
    return res.json(demoGuilds);
  });

  router.get('/:guildId', (req, res) => {
    const guildId = req.params.guildId;

    if (botClient?.isReady() && botClient.guilds.cache.has(guildId)) {
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

      return res.json({
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL ? guild.iconURL({ size: 128 }) : null,
        memberCount: guild.memberCount,
        channels,
        roles
      });
    }

    return res.json({
      id: guildId,
      name: 'Server Discord',
      memberCount: 0,
      icon: null,
      channels: [],
      roles: []
    });
  });

  return router;
}

export default createGuildsRouter;
