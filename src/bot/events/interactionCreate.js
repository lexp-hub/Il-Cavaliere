import { TicketManager } from '../modules/ticketManager.js';
import { PartnershipManager } from '../modules/partnershipManager.js';
import { PresentationManager } from '../modules/presentationManager.js';
import { DatabaseHelper } from '../../database/db.js';
import { EmbedBuilder } from 'discord.js';
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
    }

    // 3. Modal Submissions
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId === 'modal_partnership_submit') {
        return PartnershipManager.handlePartnershipModalSubmit(interaction);
      }

      if (customId === 'modal_presentation_submit') {
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
