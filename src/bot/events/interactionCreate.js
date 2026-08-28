import { TicketManager } from '../modules/ticketManager.js';
import { PartnershipManager } from '../modules/partnershipManager.js';
import { PresentationManager } from '../modules/presentationManager.js';
import { FishingManager } from '../modules/fishingManager.js';
import { BlackjackManager } from '../modules/blackjackManager.js';
import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { CONFIG } from '../../config.js';

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`[Commands] Nessun comando trovato per ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[Commands] Errore nell'esecuzione di /${interaction.commandName}:`, error);
        const replyPayload = {
          content: `❌ Si è verificato un errore durante l'esecuzione del comando: \`${error.message}\``,
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload).catch(() => {});
        } else {
          await interaction.reply(replyPayload).catch(() => {});
        }
      }
      return;
    }

    // 2. Buttons
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // Partnership Form Modal Button
      if (customId === 'partnership_open_form') {
        const config = DatabaseHelper.getPartnershipConfig(interaction.guild.id);
        const member = interaction.member;
        const isOwnerOrAdmin = interaction.guild.ownerId === interaction.user.id ||
          member.permissions.has(PermissionsBitField.Flags.Administrator) ||
          member.permissions.has(PermissionsBitField.Flags.ManageGuild);

        if (config.manager_role_id && !isOwnerOrAdmin) {
          const hasManagerRole = member.roles.cache.has(config.manager_role_id);
          if (!hasManagerRole) {
            return interaction.reply({
              content: `❌ Non possiedi il ruolo autorizzato (<@&${config.manager_role_id}>) per inviare partnership su questo server.`,
              ephemeral: true
            });
          }
        }

        const modal = PartnershipManager.createPartnershipModal();
        return interaction.showModal(modal);
      }

      // Partnership Quick Stats Button
      if (customId === 'partnership_view_stats') {
        const stats = DatabaseHelper.getPartnershipStats(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(CONFIG.EMBED_COLOR || '#ea580c')
          .setTitle(`📊 Statistiche Partnership | ${interaction.guild.name}`)
          .addFields(
            { name: '🤝 Totale Partnership', value: `\`${stats.total}\``, inline: true },
            { name: '🏆 Top Partner Manager', value: stats.leaderboard[0] ? `<@${stats.leaderboard[0].rep_user_id}> (\`${stats.leaderboard[0].count}\` completate)` : '`Nessuno`', inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Reaction Roles Button
      if (customId.startsWith('rr_btn_')) {
        const roleId = customId.replace('rr_btn_', '');
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
          return interaction.reply({ content: '❌ Questo ruolo non esiste più sul server.', ephemeral: true });
        }

        const member = interaction.member;
        const hasRole = member.roles.cache.has(role.id);

        try {
          if (hasRole) {
            await member.roles.remove(role);
            return interaction.reply({ content: `➖ Ruolo ${role} **rimosso** con successo.`, ephemeral: true });
          } else {
            await member.roles.add(role);
            return interaction.reply({ content: `➕ Ruolo ${role} **assegnato** con successo!`, ephemeral: true });
          }
        } catch (err) {
          return interaction.reply({
            content: `❌ Impossibile modificare il ruolo: ${err.message} (Verifica che il ruolo del bot sia posizionato più in alto).`,
            ephemeral: true
          });
        }
      }

      // Presentation Form Modal Button
      if (customId === 'presentation_open_form') {
        const modal = PresentationManager.createPresentationModal();
        return interaction.showModal(modal);
      }

      // Presentation Rules Info Button
      if (customId === 'presentation_view_rules') {
        const embed = new EmbedBuilder()
          .setColor('#6366f1')
          .setTitle('📜 Linee Guida per le Presentazioni')
          .setDescription(
            `• Rispetta gli altri membri e il regolamento generale.\n` +
            `• Non inserire dati sensibili personali (indirizzi, numeri di telefono).\n` +
            `• Sii gentile, autentico e divertiti nella community!\n\n` +
            `👉 Clicca su **Presentati al Server** per compilare il tuo form!`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Ticket Buttons
      if (customId.startsWith('ticket_open_')) {
        const panelId = customId.replace('ticket_open_', '');
        return TicketManager.handleTicketCreate(interaction, panelId);
      }

      if (customId.startsWith('ticket_close_')) {
        return TicketManager.handleTicketClose(interaction, 'Chiusura richiesta tramite pulsante');
      }

      if (customId.startsWith('ticket_claim_')) {
        return TicketManager.handleTicketClaim(interaction);
      }

      // Fishing Module Buttons
      if (customId.startsWith('btn_fish_')) {
        return FishingManager.handleButtonInteraction(interaction);
      }

      // Blackjack Module Buttons
      if (customId.startsWith('btn_bj_')) {
        return BlackjackManager.handleButtonInteraction(interaction);
      }

      // Slots Replay Button
      if (customId.startsWith('btn_slot_again_')) {
        const bet = parseInt(customId.replace('btn_slot_again_', ''), 10) || 50;
        const profile = DatabaseHelper.getFishingProfile(interaction.guild.id, interaction.user.id);
        const config = DatabaseHelper.getMinigamesConfig(interaction.guild.id);

        if ((profile.coins || 0) < bet) {
          return interaction.reply({
            content: `❌ Non hai abbastanza monete! Il tuo saldo è di **${(profile.coins || 0).toLocaleString()} 🪙** monete.`,
            ephemeral: true
          });
        }

        profile.coins -= bet;
        DatabaseHelper.saveFishingProfile(interaction.guild.id, interaction.user.id, profile);

        const SYMBOLS = [
          { emoji: '👑', name: 'Corona Reale', weight: 4, mult3: 10, mult2: 2 },
          { emoji: '💎', name: 'Diamante Sacro', weight: 6, mult3: 7, mult2: 1.5 },
          { emoji: '⚔️', name: 'Spade Crociate', weight: 10, mult3: 5, mult2: 1.2 },
          { emoji: '🔔', name: 'Campana d\'Oro', weight: 14, mult3: 3.5, mult2: 1 },
          { emoji: '🍇', name: 'Uva del Banchetto', weight: 20, mult3: 2.5, mult2: 0.8 },
          { emoji: '🍒', name: 'Ciliegia', weight: 26, mult3: 2, mult2: 0.5 }
        ];

        const getRandomSymbol = () => {
          const total = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
          let rand = Math.random() * total;
          for (const s of SYMBOLS) {
            if (rand < s.weight) return s;
            rand -= s.weight;
          }
          return SYMBOLS[SYMBOLS.length - 1];
        };

        const reel1 = getRandomSymbol();
        const reel2 = getRandomSymbol();
        const reel3 = getRandomSymbol();

        let multiplier = 0;
        let winType = 'loss';

        if (reel1.emoji === reel2.emoji && reel2.emoji === reel3.emoji) {
          multiplier = reel1.mult3;
          winType = 'jackpot';
        } else if (reel1.emoji === reel2.emoji || reel2.emoji === reel3.emoji || reel1.emoji === reel3.emoji) {
          const matchSymbol = (reel1.emoji === reel2.emoji) ? reel1 : ((reel2.emoji === reel3.emoji) ? reel2 : reel1);
          multiplier = matchSymbol.mult2;
          winType = 'match2';
        }

        const wonCoins = Math.floor(bet * multiplier);
        const netCoins = wonCoins - bet;

        if (wonCoins > 0) {
          profile.coins += wonCoins;
          DatabaseHelper.saveFishingProfile(interaction.guild.id, interaction.user.id, profile);
        }

        DatabaseHelper.recordMinigameResult(interaction.guild.id, interaction.user.id, 'slots', wonCoins > bet, netCoins);

        const isWin = wonCoins > bet;
        const isPush = wonCoins === bet;
        const resultColor = winType === 'jackpot' ? '#eab308' : (isWin ? '#10b981' : (isPush ? '#38bdf8' : '#ef4444'));
        const resultTitle = winType === 'jackpot' ? '🎰 JACKPOT REALE! TRIS PERFETTO! 👑' : (isWin ? '🎉 VITTORIA ALLA SLOT!' : (isPush ? '🤝 PAREGGIO!' : '💀 NESSUNA COMBINAZIONE!'));

        const embed = new EmbedBuilder()
          .setColor(resultColor)
          .setAuthor({
            name: `🎰 Slot Machine Medievale • ${interaction.user.displayName || interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          })
          .setTitle(resultTitle)
          .setDescription(
            `╭───────────────────╮\n` +
            `│   ${reel1.emoji}   ┆   ${reel2.emoji}   ┆   ${reel3.emoji}   │\n` +
            `╰───────────────────╯\n\n` +
            (winType === 'jackpot' ? `🌟 **TRIS DI ${reel1.name.toUpperCase()}! Moltiplicatore: \`x${multiplier}\`!**\n\n` : (winType === 'match2' ? `✨ **COPPIA DI ${reel1.emoji}! Moltiplicatore: \`x${multiplier}\`**\n\n` : '')) +
            `> 💸 **Puntata:** \`${bet.toLocaleString()}\` 🪙\n` +
            `> 💰 **Incasso:** \`${wonCoins.toLocaleString()}\` 🪙\n` +
            `> 🪙 **Nuovo Saldo:** \`${profile.coins.toLocaleString()}\` 🪙 monete`
          )
          .setFooter({ text: `${interaction.guild.name} • Sentry Casino`, iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Minigames Hub Buttons
      if (customId === 'btn_hub_fishing') {
        const result = await FishingManager.castRod(interaction.guild, interaction.user, interaction.channelId);
        if (!result.success) {
          return interaction.reply({ content: result.message, ephemeral: true });
        }
        return interaction.reply({ embeds: [result.embed], ephemeral: true });
      }

      if (customId === 'btn_hub_blackjack') {
        const result = await BlackjackManager.startGame(interaction.guild, interaction.user, interaction.channelId, 50);
        if (!result.success) {
          return interaction.reply({ content: result.message, ephemeral: true });
        }
        const comp = result.row ? [result.row] : [];
        return interaction.reply({ embeds: [result.embed], components: comp, ephemeral: true });
      }

      if (customId === 'btn_hub_slots') {
        const profile = DatabaseHelper.getFishingProfile(interaction.guild.id, interaction.user.id);
        const bet = 50;

        if ((profile.coins || 0) < bet) {
          return interaction.reply({
            content: `❌ Non hai abbastanza monete! Il tuo saldo è di **${(profile.coins || 0).toLocaleString()} 🪙** monete.`,
            ephemeral: true
          });
        }

        profile.coins -= bet;
        DatabaseHelper.saveFishingProfile(interaction.guild.id, interaction.user.id, profile);

        const SYMBOLS = [
          { emoji: '👑', name: 'Corona Reale', weight: 4, mult3: 10, mult2: 2 },
          { emoji: '💎', name: 'Diamante Sacro', weight: 6, mult3: 7, mult2: 1.5 },
          { emoji: '⚔️', name: 'Spade Crociate', weight: 10, mult3: 5, mult2: 1.2 },
          { emoji: '🔔', name: 'Campana d\'Oro', weight: 14, mult3: 3.5, mult2: 1 },
          { emoji: '🍇', name: 'Uva del Banchetto', weight: 20, mult3: 2.5, mult2: 0.8 },
          { emoji: '🍒', name: 'Ciliegia', weight: 26, mult3: 2, mult2: 0.5 }
        ];

        const getRandomSymbol = () => {
          const total = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
          let rand = Math.random() * total;
          for (const s of SYMBOLS) {
            if (rand < s.weight) return s;
            rand -= s.weight;
          }
          return SYMBOLS[SYMBOLS.length - 1];
        };

        const reel1 = getRandomSymbol();
        const reel2 = getRandomSymbol();
        const reel3 = getRandomSymbol();

        let multiplier = 0;
        let winType = 'loss';

        if (reel1.emoji === reel2.emoji && reel2.emoji === reel3.emoji) {
          multiplier = reel1.mult3;
          winType = 'jackpot';
        } else if (reel1.emoji === reel2.emoji || reel2.emoji === reel3.emoji || reel1.emoji === reel3.emoji) {
          const matchSymbol = (reel1.emoji === reel2.emoji) ? reel1 : ((reel2.emoji === reel3.emoji) ? reel2 : reel1);
          multiplier = matchSymbol.mult2;
          winType = 'match2';
        }

        const wonCoins = Math.floor(bet * multiplier);
        const netCoins = wonCoins - bet;

        if (wonCoins > 0) {
          profile.coins += wonCoins;
          DatabaseHelper.saveFishingProfile(interaction.guild.id, interaction.user.id, profile);
        }

        DatabaseHelper.recordMinigameResult(interaction.guild.id, interaction.user.id, 'slots', wonCoins > bet, netCoins);

        const isWin = wonCoins > bet;
        const isPush = wonCoins === bet;
        const resultColor = winType === 'jackpot' ? '#eab308' : (isWin ? '#10b981' : (isPush ? '#38bdf8' : '#ef4444'));
        const resultTitle = winType === 'jackpot' ? '🎰 JACKPOT REALE! TRIS PERFETTO! 👑' : (isWin ? '🎉 VITTORIA ALLA SLOT!' : (isPush ? '🤝 PAREGGIO!' : '💀 NESSUNA COMBINAZIONE!'));

        const embed = new EmbedBuilder()
          .setColor(resultColor)
          .setAuthor({
            name: `🎰 Slot Machine Medievale • ${interaction.user.displayName || interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          })
          .setTitle(resultTitle)
          .setDescription(
            `╭───────────────────╮\n` +
            `│   ${reel1.emoji}   ┆   ${reel2.emoji}   ┆   ${reel3.emoji}   │\n` +
            `╰───────────────────╯\n\n` +
            (winType === 'jackpot' ? `🌟 **TRIS DI ${reel1.name.toUpperCase()}! Moltiplicatore: \`x${multiplier}\`!**\n\n` : (winType === 'match2' ? `✨ **COPPIA DI ${reel1.emoji}! Moltiplicatore: \`x${multiplier}\`**\n\n` : '')) +
            `> 💸 **Puntata:** \`${bet.toLocaleString()}\` 🪙\n` +
            `> 💰 **Incasso:** \`${wonCoins.toLocaleString()}\` 🪙\n` +
            `> 🪙 **Nuovo Saldo:** \`${profile.coins.toLocaleString()}\` 🪙 monete`
          )
          .setFooter({ text: `${interaction.guild.name} • Sentry Casino`, iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (customId === 'btn_hub_daily') {
        const profile = DatabaseHelper.getFishingProfile(interaction.guild.id, interaction.user.id);
        const config = DatabaseHelper.getMinigamesConfig(interaction.guild.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = 86400; // 24 hours

        if (now - (profile.last_daily || 0) < cooldown) {
          const hoursLeft = Math.ceil((cooldown - (now - profile.last_daily)) / 3600);
          return interaction.reply({
            content: `⏳ Hai già riscosso la tua ricompensa giornaliera! Torna tra **${hoursLeft} ore**.`,
            ephemeral: true
          });
        }

        const reward = config.daily_reward || 150;
        profile.coins = (profile.coins || 0) + reward;
        profile.last_daily = now;
        DatabaseHelper.saveFishingProfile(interaction.guild.id, interaction.user.id, profile);

        const embed = new EmbedBuilder()
          .setColor('#10b981')
          .setTitle('🎁 Ricompensa Giornaliera Riscossa!')
          .setDescription(`Hai ricevuto **+${reward.toLocaleString()} 🪙** monete!\n💰 **Nuovo Saldo:** \`${profile.coins.toLocaleString()}\` 🪙`)
          .setFooter({ text: `${interaction.guild.name} • Sentry Daily Reward`, iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (customId === 'btn_hub_profile') {
        const profile = DatabaseHelper.getFishingProfile(interaction.guild.id, interaction.user.id);
        const bjStats = DatabaseHelper.getMinigameStats(interaction.guild.id, interaction.user.id, 'blackjack');
        const slotStats = DatabaseHelper.getMinigameStats(interaction.guild.id, interaction.user.id, 'slots');

        const embed = new EmbedBuilder()
          .setColor('#eab308')
          .setAuthor({
            name: `🎒 Profilo Economico • ${interaction.user.displayName || interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          })
          .setTitle('🪙 Tesoro & Imprese del Cavaliere')
          .addFields(
            { name: '🪙 Monete Possedute', value: `**${(profile.coins || 0).toLocaleString()} 🪙**`, inline: true },
            { name: '🎣 Pesci Catturati', value: `**${profile.total_fish_caught || 0}** prede`, inline: true },
            { name: '🎒 Oggetti nel Cestino', value: `**${(profile.inventory || []).length}** oggetti`, inline: true },
            {
              name: '🃏 Blackjack',
              value: `> Partite: **${bjStats.games_played}** (Vinte: **${bjStats.games_won}**)\n> Saldo Vinto: **+${bjStats.total_won_coins.toLocaleString()} 🪙**`,
              inline: false
            },
            {
              name: '🎰 Slot Machine',
              value: `> Giri: **${slotStats.games_played}** (Vinti: **${slotStats.games_won}**)\n> Record: **${slotStats.highest_win.toLocaleString()} 🪙**`,
              inline: false
            }
          )
          .setFooter({ text: `${interaction.guild.name} • Sentry Minigiochi`, iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // 3. Modal Submissions
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId.startsWith('modal_partnership_submit')) {
        return PartnershipManager.handlePartnershipModalSubmit(interaction);
      }

      if (customId.startsWith('modal_presentation_submit')) {
        return PresentationManager.handlePresentationModalSubmit(interaction);
      }
    }

    // 4. String Select Menus
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId.startsWith('rr_select_')) {
        const selectedRoleId = interaction.values[0];
        const role = interaction.guild.roles.cache.get(selectedRoleId);

        if (!role) {
          return interaction.reply({ content: '❌ Ruolo selezionato non valido.', ephemeral: true });
        }

        const member = interaction.member;
        const hasRole = member.roles.cache.has(role.id);

        try {
          if (hasRole) {
            await member.roles.remove(role);
            return interaction.reply({ content: `➖ Ruolo ${role} rimosso.`, ephemeral: true });
          } else {
            await member.roles.add(role);
            return interaction.reply({ content: `➕ Ruolo ${role} assegnato!`, ephemeral: true });
          }
        } catch (err) {
          return interaction.reply({ content: `❌ Errore assegnazione ruolo: ${err.message}`, ephemeral: true });
        }
      }
    }
  }
};
