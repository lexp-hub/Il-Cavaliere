import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType
} from 'discord.js';
import { CONFIG } from '../../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra la lista completa dei comandi e moduli di Il Cavaliere'),

  async execute(interaction) {
    const mainEmbed = new EmbedBuilder()
      .setColor(CONFIG.EMBED_COLOR)
      .setTitle('🛡️ Il Cavaliere | Centro Comandi')
      .setDescription(
        'Benvenuto nel pannello di aiuto di **Il Cavaliere**!\n' +
        'Seleziona una categoria dal menu a tendina sottostante per esplorare tutti i comandi disponibili.\n\n' +
        `🌐 **Dashboard Web:** [Accedi alla Dashboard](${CONFIG.DASHBOARD_URL})\n` +
        `✨ **Versione:** \`v1.0.0\` | **Sviluppato per Discord.js v14**`
      )
      .addFields(
        { name: '🤝 Partnership', value: '`/partner` - Gestione automatica e statistiche', inline: true },
        { name: '🎨 Embed Builder', value: '`/embed` - Crea ed invia embed avanzati', inline: true },
        { name: '🎭 Reaction Roles', value: '`/reactionrole` - Assegna ruoli con bottoni e menu', inline: true },
        { name: '👋 Welcomer', value: '`/welcomer` - Benvenuto con card e auto-role', inline: true },
        { name: '⚡ Auto-Responder', value: '`/autoresponder` - Risposte e reazioni automatiche', inline: true },
        { name: '✨ Emoji & Starboard', value: '`/steal`, `/emoji-stats`, `/starboard`', inline: true },
        { name: '🛡️ Moderazione', value: '`/ban`, `/kick`, `/timeout`, `/warn`, `/clear`', inline: true },
        { name: '🎫 Ticket System', value: '`/ticket` - Gestione supporto e transcript', inline: true },
        { name: '🎉 Giveaway & XP', value: '`/giveaway`, `/rank`, `/leaderboard`', inline: true }
      )
      .setFooter({ text: 'Seleziona una categoria dal menu qui sotto ⬇️', iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('📂 Seleziona una categoria...')
      .addOptions([
        { label: 'Panoramica Generale', value: 'overview', emoji: '🛡️', description: 'Torna alla pagina iniziale' },
        { label: 'Partnership System', value: 'partnerships', emoji: '🤝', description: 'Comandi e statistiche partnership' },
        { label: 'Embed & Reaction Roles', value: 'embeds_rr', emoji: '🎨', description: 'Embed builder e bottoni ruoli' },
        { label: 'Welcomer & Auto-Responder', value: 'welcomer_auto', emoji: '👋', description: 'Benvenuto, DM, trigger e reazioni' },
        { label: 'Moderazione & AutoMod', value: 'moderation', emoji: '⚔️', description: 'Ban, kick, warn, purge, filtri' },
        { label: 'Tickets & Giveaways', value: 'tickets_ga', emoji: '🎫', description: 'Supporto ticket e concorsi' },
        { label: 'Leveling & Emoji', value: 'leveling_emoji', emoji: '⭐', description: 'XP, classifiche e gestione emoji' }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const reply = await interaction.reply({ embeds: [mainEmbed], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ Solo chi ha eseguito il comando può usare questo menu.', ephemeral: true });
      }

      const val = i.values[0];
      const newEmbed = new EmbedBuilder().setColor(CONFIG.EMBED_COLOR).setTimestamp();

      if (val === 'overview') {
        await i.update({ embeds: [mainEmbed] });
        return;
      }

      switch (val) {
        case 'partnerships':
          newEmbed
            .setTitle('🤝 Modulo Partnership')
            .setDescription('Gestisci partnership in modo completamente automatizzato.')
            .addFields(
              { name: '`/partner add <invite> [rep]`', value: 'Registra e pubblica una nuova partnership con verifica automatica del server.' },
              { name: '`/partner config`', value: 'Configura il canale di invio, ruolo ping e numero minimo di membri.' },
              { name: '`/partner stats`', value: 'Mostra le statistiche globali e la classifica dei partner manager.' }
            );
          break;

        case 'embeds_rr':
          newEmbed
            .setTitle('🎨 Modulo Embed & Reaction Roles')
            .setDescription('Personalizza la comunicazione con messaggi interattivi ed eleganti.')
            .addFields(
              { name: '`/embed send <channel> <json>`', value: 'Invia un embed personalizzato o generato dalla Dashboard.' },
              { name: '`/embed create`', value: 'Crea un template embed direttamente da Discord.' },
              { name: '`/embed list`', value: 'Visualizza tutti i template salvati.' },
              { name: '`/reactionrole button`', value: 'Crea un pannello ruoli con pulsanti interattivi colorati.' },
              { name: '`/reactionrole select`', value: 'Crea un menu a tendina per la selezione dei ruoli.' }
            );
          break;

        case 'welcomer_auto':
          newEmbed
            .setTitle('👋 Welcomer & Auto-Responder')
            .setDescription('Accoglienza membri e risposte automatiche ai messaggi.')
            .addFields(
              { name: '`/welcomer config`', value: 'Imposta canali di benvenuto/addio, messaggi e card.' },
              { name: '`/welcomer test`', value: 'Invia un messaggio di benvenuto di prova nel canale corrente.' },
              { name: '`/welcomer autorole <role>`', value: 'Assegna automaticamente un ruolo ai nuovi arrivati.' },
              { name: '`/autoresponder add`', value: 'Crea un trigger con risposta automatica o reazioni emoji.' },
              { name: '`/autoresponder list`', value: 'Elenca tutte le risposte automatiche attive.' }
            );
          break;

        case 'moderation':
          newEmbed
            .setTitle('⚔️ Moderazione & AutoMod')
            .setDescription('Proteggi la community con strumenti di moderazione completi.')
            .addFields(
              { name: '`/ban <user> [reason]`', value: 'Banna un utente dal server.' },
              { name: '`/kick <user> [reason]`', value: 'Espelli un utente dal server.' },
              { name: '`/timeout <user> <duration> [reason]`', value: 'Metti in timeout un utente (es. `10m`, `1h`, `1d`).' },
              { name: '`/warn <user> <reason>`', value: 'Assegna un avvertimento ufficiale a un utente.' },
              { name: '`/warnings <user>`', value: 'Visualizza la cronologia infrazioni di un utente.' },
              { name: '`/clear <amount> [user]`', value: 'Elimina fino a 100 messaggi in blocco con filtri.' },
              { name: '`/lock [channel]` / `/unlock`', value: 'Blocca o sblocca i permessi di scrittura nel canale.' },
              { name: '`/nuke`', value: 'Ricrea il canale per ripulirne completamente la cronologia.' }
            );
          break;

        case 'tickets_ga':
          newEmbed
            .setTitle('🎫 Ticket & Giveaways')
            .setDescription('Assistenza privata e concorsi a premi.')
            .addFields(
              { name: '`/ticket panel <channel> [title]`', value: 'Invia un pannello interattivo per aprire ticket con pulsanti.' },
              { name: '`/ticket claim`', value: 'Prendi in carico il ticket corrente come membro dello staff.' },
              { name: '`/ticket close [reason]`', value: 'Chiudi il ticket con generazione automatica del transcript.' },
              { name: '`/giveaway start <duration> <winners> <prize>`', value: 'Avvia un giveaway a tempo con estrazione casuale.' },
              { name: '`/giveaway reroll <message_id>`', value: 'Estrai un nuovo vincitore per un giveaway concluso.' }
            );
          break;

        case 'leveling_emoji':
          newEmbed
            .setTitle('⭐ Leveling & Emoji Tracker')
            .setDescription('Coinvolgimento della community e personalizzazione emoji.')
            .addFields(
              { name: '`/rank [user]`', value: 'Visualizza la scheda livello, XP e posizione in classifica.' },
              { name: '`/leaderboard`', value: 'Mostra la top 10 degli utenti più attivi del server.' },
              { name: '`/steal emoji <emoji/url>`', value: 'Ruba e aggiungi un\'emoji al tuo server istantaneamente.' },
              { name: '`/emoji-stats`', value: 'Analisi statistica delle emoji più e meno usate.' },
              { name: '`/starboard config <channel>`', value: 'Configura il canale bacheca per i messaggi stellati ⭐.' }
            );
          break;
      }

      await i.update({ embeds: [newEmbed] });
    });
  }
};
