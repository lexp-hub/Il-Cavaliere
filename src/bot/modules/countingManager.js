import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder } from 'discord.js';
import { CONFIG } from '../../config.js';

export const CountingManager = {
  async handleMessage(message) {
    if (message.author.bot || !message.guild) return;

    const countingConfig = DatabaseHelper.getCountingConfig(message.guild.id);
    if (!countingConfig || !countingConfig.enabled || countingConfig.channel_id !== message.channel.id) {
      return;
    }

    const content = message.content.trim();
    
    // Parse math expressions or plain numbers (e.g. "42", "40+2", "10*2")
    let parsedNumber = null;
    if (/^-?\d+$/.test(content)) {
      parsedNumber = parseInt(content, 10);
    } else {
      try {
        if (/^[0-9+\-*/().\s]+$/.test(content)) {
          // Safe simple math evaluation
          parsedNumber = Function(`'use strict'; return (${content})`)();
          if (typeof parsedNumber !== 'number' || isNaN(parsedNumber)) parsedNumber = null;
        }
      } catch (e) {
        parsedNumber = null;
      }
    }

    if (parsedNumber === null) return;

    const currentNumber = countingConfig.current_number || 0;
    const expectedNumber = currentNumber + 1;
    const lastUserId = countingConfig.last_user_id;

    // Rule 1: Anti-double count by the same user
    if (lastUserId === message.author.id && currentNumber > 0) {
      await message.react('❌').catch(() => {});
      DatabaseHelper.recordCountRuin(message.guild.id, message.author.id);

      const ruinEmbed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('💀 Sequenza di Conteggio Interrotta!')
        .setDescription(`**${message.author}** ha contato due volte di fila al numero **${currentNumber}**!\n\n👑 *Record Massimo Raggiunto:* **${countingConfig.highest_streak}**\n🔄 Il conteggio riparte da **1**!`)
        .setFooter({ text: 'Regola: non puoi contare due volte consecutive', iconURL: message.guild.iconURL() })
        .setTimestamp();

      await message.channel.send({ embeds: [ruinEmbed] });
      return;
    }

    // Rule 2: Check correct sequential number
    if (parsedNumber === expectedNumber) {
      DatabaseHelper.recordCountSuccess(message.guild.id, message.author.id, expectedNumber);
      
      // Fun reactions on milestones
      if (expectedNumber % 100 === 0) {
        await message.react('💯').catch(() => {});
        await message.react('🎉').catch(() => {});
      } else if (expectedNumber % 50 === 0) {
        await message.react('⭐').catch(() => {});
      } else {
        await message.react('✅').catch(() => {});
      }

      // Bonus milestone announcement
      if (expectedNumber > 0 && expectedNumber % 50 === 0) {
        const milestoneEmbed = new EmbedBuilder()
          .setColor('#10b981')
          .setTitle(`🏆 Traguardo Raggiunto: ${expectedNumber}!`)
          .setDescription(`Grande lavoro, cavalieri! Avete raggiunto quota **${expectedNumber}** senza errori. Continuate così!`)
          .setTimestamp();
        await message.channel.send({ embeds: [milestoneEmbed] });
      }
    } else {
      // Wrong number! Ruin streak
      await message.react('❌').catch(() => {});
      DatabaseHelper.recordCountRuin(message.guild.id, message.author.id);

      const ruinEmbed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('💀 Errore nel Conteggio!')
        .setDescription(`**${message.author}** ha scritto **${parsedNumber}**, ma il numero corretto era **${expectedNumber}**!\n\n👑 *Record Massimo Raggiunto:* **${countingConfig.highest_streak}**\n🔄 Il conteggio riparte da **1**!`)
        .setFooter({ text: 'Sentry • Counting Game', iconURL: message.guild.iconURL() })
        .setTimestamp();

      await message.channel.send({ embeds: [ruinEmbed] });
    }
  }
};

export default CountingManager;

