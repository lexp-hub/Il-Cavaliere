import { AutoModManager } from '../modules/automodManager.js';
import { XPManager } from '../modules/xpManager.js';
import { AIManager } from '../modules/aiManager.js';
import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild || message.author.bot) return;

    // 1. AutoMod Checks (returns true if message was deleted/violated)
    const violated = await AutoModManager.handleMessage(message);
    if (violated) return;

    // 2. Track Custom Emoji Usages
    const emojiMatches = message.content.matchAll(/<(a?):([a-zA-Z0-9_]+):([0-9]+)>/g);
    for (const match of emojiMatches) {
      const isAnimated = match[1] === 'a';
      const emojiName = match[2];
      const emojiId = match[3];
      DatabaseHelper.trackEmojiUse(message.guild.id, emojiId, emojiName, isAnimated);
    }

    // 3. AI Mention Chat (@Il Cavaliere)
    const isBotMentioned = message.mentions.has(message.client.user) && !message.mentions.everyone;
    if (isBotMentioned) {
      try {
        await AIManager.handleMention(message);
        // Do not process regular auto-responders if the user was talking directly to the AI
        return;
      } catch (err) {
        console.error('[MessageCreate] Errore gestione menzione AI:', err);
      }
    }

    // 4. Auto-Reaction Channels (e.g. Suggestions)
    const autoReactChannels = DatabaseHelper.getAutoreactionChannels(message.guild.id);
    const channelConfig = autoReactChannels.find(c => c.channel_id === message.channel.id && c.enabled);
    if (channelConfig && channelConfig.emojis && channelConfig.emojis.length > 0) {
      for (const emoji of channelConfig.emojis) {
        try {
          await message.react(emoji);
        } catch (e) {}
      }
    }

    // 5. Auto-Responders & Reaction Triggers
    const autoresponders = DatabaseHelper.getAutoresponders(message.guild.id);
    const content = message.content.trim();
    const lowerContent = content.toLowerCase();

    for (const ar of autoresponders) {
      if (!ar.enabled) continue;

      if (ar.channels_whitelist.length > 0 && !ar.channels_whitelist.includes(message.channel.id)) continue;
      if (ar.roles_whitelist.length > 0 && message.member && !message.member.roles.cache.some(r => ar.roles_whitelist.includes(r.id))) continue;

      let matches = false;
      const trigger = ar.trigger;
      const lowerTrigger = trigger.toLowerCase();

      if (ar.match_type === 'EXACT') {
        matches = lowerContent === lowerTrigger;
      } else if (ar.match_type === 'STARTS_WITH') {
        matches = lowerContent.startsWith(lowerTrigger);
      } else if (ar.match_type === 'REGEX') {
        try {
          const reg = new RegExp(trigger, 'i');
          matches = reg.test(content);
        } catch (e) {}
      } else {
        matches = lowerContent.includes(lowerTrigger);
      }

      if (matches) {
        if (ar.auto_reactions && Array.isArray(ar.auto_reactions)) {
          for (const em of ar.auto_reactions) {
            await message.react(em).catch(() => {});
          }
        }

        if (ar.response_text) {
          await message.channel.send({ content: ar.response_text }).catch(() => {});
        }

        if (ar.response_embed) {
          const embed = new EmbedBuilder(ar.response_embed);
          await message.channel.send({ embeds: [embed] }).catch(() => {});
        }
        break;
      }
    }

    // 6. XP & Leveling
    await XPManager.handleMessage(message);
  }
};
