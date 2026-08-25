import express from 'express';
import { ChannelType, PermissionsBitField } from 'discord.js';
import { DatabaseHelper } from '../../database/db.js';
import { CONFIG } from '../../config.js';

export function createGuildsRouter(botClient) {
  const router = express.Router();

  const requireModAuth = async (req, res, next) => {
    if (!req.session.user) {
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
    const isCreator = user?.id === CONFIG.CREATOR_ID || user?.isAdmin;
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
        permissions: 'Moderatore',
        activeModulesCount: activeCount
      };
    });

    res.json(result);
  });

  router.get('/:guildId', requireModAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const user = req.session.user;

    if (!botClient?.isReady() || !botClient.guilds.cache.has(guildId)) {
      return res.status(404).json({ error: 'Server non trovato nel bot' });
    }

    const guild = botClient.guilds.cache.get(guildId);
    const isCreator = user?.id === CONFIG.CREATOR_ID || user?.isAdmin;

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
          return res.status(403).json({ error: 'Accesso riservato esclusivamente ai Moderatori e Amministratori di questo server.' });
        }
      } catch (e) {
        return res.status(403).json({ error: 'Non fai parte di questo server o non possiedi i permessi di moderatore.' });
      }
    }

    try {
      await guild.channels.fetch();
      await guild.roles.fetch();
    } catch (e) {
      console.warn('[Guilds] Cache refresh notice:', e.message);
    }

    const channels = guild.channels.cache
      .map(c => {
        let normalizedType = 'other';
        if (c.type === ChannelType.GuildCategory || c.type === 4) {
          normalizedType = 'category';
        } else if (c.isTextBased?.() || c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement || c.type === 0 || c.type === 5) {
          normalizedType = 'text';
        }

        return {
          id: c.id,
          name: c.name,
          type: normalizedType,
          rawType: c.type,
          parentId: c.parentId
        };
      })
      .filter(c => c.type === 'text' || c.type === 'category')
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
