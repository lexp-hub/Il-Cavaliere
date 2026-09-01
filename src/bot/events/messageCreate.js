import { AutoModManager } from '../modules/automodManager.js';
import { XPManager } from '../modules/xpManager.js';
import { AIManager } from '../modules/aiManager.js';
import { CountingManager } from '../modules/countingManager.js';
import { SetupShowcaseManager } from '../modules/setupShowcaseManager.js';
import { StopwatchManager } from '../modules/stopwatchManager.js';
import { WebhookReplacerManager } from '../modules/webhookReplacerManager.js';
import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild) return;

    // Never process messages sent by Sentry itself
    if (message.author.id === message.client.user?.id) return;

    // 0. Webhook & Bot Message Replacer (Image re-hosting & Embed Repost)
    if (message.webhookId || message.author.bot) {
      await WebhookReplacerManager.handleIncomingMessage(message);
      return;
    }

    // 1. Setup Showcase & BattleStation module handler
    const handledByShowcase = await SetupShowcaseManager.handleMessage(message);
    if (handledByShowcase) return;

    // 2. Counting minigame handler
    await CountingManager.handleMessage(message);

    const violated = await AutoModManager.handleMessage(message);
    if (violated) return;

    const emojiMatches = message.content.matchAll(/<(a?):([a-zA-Z0-9_]+):([0-9]+)>/g);
    for (const match of emojiMatches) {
      const isAnimated = match[1] === 'a';
      const emojiName = match[2];
      const emojiId = match[3];
      DatabaseHelper.trackEmojiUse(message.guild.id, emojiId, emojiName, isAnimated);
    }

    const isBotMentioned = message.mentions.has(message.client.user) && !message.mentions.everyone;
    if (isBotMentioned) {
      try {
        await AIManager.handleMention(message);
        
        return;
      } catch (err) {
        console.error('[MessageCreate] Errore gestione menzione AI:', err);
      }
    }

    const autoReactChannels = DatabaseHelper.getAutoreactionChannels(message.guild.id);
    const channelConfig = autoReactChannels.find(c => c.channel_id === message.channel.id && c.enabled);
    if (channelConfig && channelConfig.emojis && channelConfig.emojis.length > 0) {
      for (const emoji of channelConfig.emojis) {
        try {
          await message.react(emoji);
        } catch (e) {}
      }
    }

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

    await XPManager.handleMessage(message);

    // 4. Sticky Stopwatch floating repositioning
    await StopwatchManager.handleChannelMessage(message);
  }
};
