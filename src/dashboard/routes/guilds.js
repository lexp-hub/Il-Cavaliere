import express from 'express';
import { ChannelType, PermissionsBitField } from 'discord.js';
import { DatabaseHelper } from '../../database/db.js';
import { CONFIG } from '../../config.js';

export function createGuildsRouter(botClient) {
  const router = express.Router();

  const requireModAuth = async (req, res, next) => {
    if (!req.session.user && !CONFIG.DEMO_MODE) {
      return res.status(401).json({ error: 'Accesso negato. Effettua prima il login con Discord.' });
    }
    next();
  };

  router.get('/', requireModAuth, async (req, res) => {
    const user = req.session.user;

    if (!botClient?.isReady() || botClient.guilds.cache.size === 0) {
      return res.json([]);
    }

    const botGuilds = botClient.guilds.cache;
    const isCreator = user?.id === CONFIG.CREATOR_ID || user?.isAdmin || CONFIG.DEMO_MODE;
    const accessibleGuilds = [];

    for (const [id, guild] of botGuilds.entries()) {
      if (isCreator) {
        accessibleGuilds.push(guild);
        continue;
      }

      try {
        const member = await guild.members.fetch(user.id);
        const isMod = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                      member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                      member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
                      member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
                      member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
                      guild.ownerId === user.id;

        if (isMod) {
          accessibleGuilds.push(guild);
        }
      } catch (e) {}
    }

    const result = accessibleGuilds.map(g => {
      const iconUrl = g.iconURL ? g.iconURL({ size: 128 }) : null;
      const settings = DatabaseHelper.getGuildSettings(g.id);
      const activeCount = settings ? Object.values(settings.modules_enabled || {}).filter(Boolean).length : 8;
      return {
        id: g.id,
        name: g.name,
        icon: iconUrl,
        memberCount: g.memberCount,
        botJoined: true,
        permissions: 'Moderatore del Reame',
        activeModulesCount: activeCount
      };
    });

    res.json(result);
  });

  router.get('/:guildId', requireModAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const user = req.session.user;

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.status(404).json({ error: 'Reame non trovato nel bot' });
    }

    const guild = botClient.guilds.cache.get(guildId);
    const isCreator = user?.id === CONFIG.CREATOR_ID || user?.isAdmin || CONFIG.DEMO_MODE;

    if (!isCreator && user?.id) {
      try {
        const member = await guild.members.fetch(user.id);
        const isMod = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                      member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                      member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
                      member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
                      member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
                      guild.ownerId === user.id;

        if (!isMod) {
          return res.status(403).json({ error: 'Accesso riservato esclusivamente ai Moderatori e Amministratori di questo Reame.' });
        }
      } catch (e) {
        return res.status(403).json({ error: 'Non fai parte di questo server o non possiedi il rango di Moderatore.' });
      }
    }

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
      icon: guild.iconURL ? guild.iconURL({ size: 128 }) : null,
      memberCount: guild.memberCount,
      channels,
      roles
    });
  });

  return router;
}

export default createGuildsRouter;
