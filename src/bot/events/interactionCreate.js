import { TicketManager } from '../modules/ticketManager.js';
import { DatabaseHelper } from '../../database/db.js';

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    
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

    if (interaction.isButton()) {
      const customId = interaction.customId;

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
