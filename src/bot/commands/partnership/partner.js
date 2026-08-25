import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} from 'discord.js';
import { PartnershipManager } from '../../modules/partnershipManager.js';
import { DatabaseHelper } from '../../../database/db.js';
import { CONFIG } from '../../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('partner')
    .setDescription('Comandi completi per il sistema di Partnership')
    .addSubcommand(sub =>
      sub
        .setName('form')
        .setDescription('Apre il form modale a schermo per compilare una nuova partnership')
        .addUserOption(opt =>
          opt
            .setName('manager')
            .setDescription('Il partner manager o rappresentante del server partner')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Invia un pannello informativo con pulsante per aprire il form di partnership')
        .addChannelOption(opt =>
          opt
            .setName('canale')
            .setDescription('Canale in cui inviare il pannello (default: canale corrente o canale configurato)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('titolo')
            .setDescription('Titolo personalizzato per il pannello')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('descrizione')
            .setDescription('Descrizione personalizzata per il pannello')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('immagine')
            .setDescription('URL del banner o immagine del pannello')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Registra una nuova partnership tramite comando diretto')
        .addStringOption(opt =>
          opt
            .setName('invito')
            .setDescription('Link o codice invito del server partner')
            .setRequired(true)
        )
        .addUserOption(opt =>
          opt
            .setName('rappresentante')
            .setDescription('Il partner manager o rappresentante del server')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('descrizione')
            .setDescription('Testo promozionale o note sulla partnership')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('banner')
            .setDescription('URL del banner o immagine del server partner')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('Configura le impostazioni delle partnership')
        .addChannelOption(opt =>
          opt
            .setName('canale')
            .setDescription('Canale in cui inviare le partnership')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt
            .setName('ruolo_ping')
            .setDescription('Ruolo da menzionare ad ogni partnership')
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt
            .setName('min_membri')
            .setDescription('Numero minimo di membri richiesti nel server partner')
            .setMinValue(0)
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt
            .setName('cooldown')
            .setDescription('Minuti di cooldown prima di rinnovare con lo stesso server')
            .setMinValue(0)
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt
            .setName('attivo')
            .setDescription('Abilita o disabilita il modulo partnership')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('stats')
        .setDescription('Mostra le statistiche globali delle partnership')
    )
    .addSubcommand(sub =>
      sub
        .setName('leaderboard')
        .setDescription('Classifica dei membri che hanno effettuato più partnership')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // 1. OPEN FORM MODAL
    if (subcommand === 'form') {
      const manager = interaction.options.getUser('manager') || interaction.user;
      const modal = PartnershipManager.createPartnershipModal(manager.id);
      return interaction.showModal(modal);
    }

    // 2. SEND PARTNERSHIP PANEL
    if (subcommand === 'panel') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
          !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({
          content: '❌ Non hai i permessi per inviare il pannello partnership.',
          ephemeral: true
        });
      }

      const config = DatabaseHelper.getPartnershipConfig(interaction.guild.id);
      const targetChannel = interaction.options.getChannel('canale') || 
        (config.channel_id ? interaction.guild.channels.cache.get(config.channel_id) : interaction.channel);

      if (!targetChannel) {
        return interaction.reply({ content: '❌ Nessun canale valido specificato o configurato.', ephemeral: true });
      }

      const title = interaction.options.getString('titolo') || '🤝 Sistema Partnership & Alleanze';
      const description = interaction.options.getString('descrizione') || null;
      const image = interaction.options.getString('immagine') || null;

      try {
        await PartnershipManager.sendPartnershipPanel(interaction.guild, targetChannel.id, title, description, '#ea580c', image);
        return interaction.reply({ content: `✅ Pannello partnership con form inviato con successo in ${targetChannel}!`, ephemeral: true });
      } catch (err) {
        return interaction.reply({ content: `❌ Errore durante l'invio del pannello: ${err.message}`, ephemeral: true });
      }
    }

    // 3. DIRECT ADD COMMAND
    if (subcommand === 'add') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
          !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({
          content: '❌ Non hai i permessi necessari per registrare partnership (`Gestisci Server` o `Gestisci Messaggi`).',
          ephemeral: true
        });
      }

      await interaction.deferReply();

      const invite = interaction.options.getString('invito');
      const rep = interaction.options.getUser('rappresentante') || interaction.user;
      const text = interaction.options.getString('descrizione') || '';
      const banner = interaction.options.getString('banner') || null;

      const result = await PartnershipManager.processPartnership(
        interaction.guild,
        interaction.channel,
        rep,
        invite,
        text,
        banner
      );

      if (!result.success) {
        return interaction.editReply({
          content: `❌ **Impossibile registrare la partnership:** ${result.error}`
        });
      }

      const successEmbed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_SUCCESS_COLOR || '#10b981')
        .setTitle('✅ Partnership Registrata con Successo!')
        .setDescription(
          `La partnership **#${result.totalCount}** è stata pubblicata!\n` +
          `👑 **Rappresentante:** ${rep}\n` +
          `🔗 **Messaggio:** [Clicca per vedere il messaggio](${result.messageUrl})`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } else if (subcommand === 'config') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: '❌ Solo gli amministratori possono modificare la configurazione delle partnership.',
          ephemeral: true
        });
      }

      const channel = interaction.options.getChannel('canale');
      const pingRole = interaction.options.getRole('ruolo_ping');
      const minMembers = interaction.options.getInteger('min_membri');
      const cooldown = interaction.options.getInteger('cooldown');
      const active = interaction.options.getBoolean('attivo');

      const updates = {};
      if (channel) updates.channel_id = channel.id;
      if (pingRole) updates.ping_role_id = pingRole.id;
      if (minMembers !== null) updates.min_members = minMembers;
      if (cooldown !== null) updates.cooldown_minutes = cooldown;
      if (active !== null) updates.enabled = active;

      const newConfig = DatabaseHelper.updatePartnershipConfig(interaction.guild.id, updates);

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setTitle('⚙️ Configurazione Partnership Aggiornata')
        .addFields(
          { name: 'Stato Modulo', value: newConfig.enabled ? '🟢 `Attivo`' : '🔴 `Disattivato`', inline: true },
          { name: 'Canale Invio', value: newConfig.channel_id ? `<#${newConfig.channel_id}>` : '`Non impostato`', inline: true },
          { name: 'Ruolo Ping', value: newConfig.ping_role_id ? `<@&${newConfig.ping_role_id}>` : '`Nessuno`', inline: true },
          { name: 'Minimo Membri', value: `\`${newConfig.min_members}\` membri`, inline: true },
          { name: 'Cooldown', value: `\`${newConfig.cooldown_minutes}\` minuti`, inline: true }
        )
        .setFooter({ text: 'Puoi modificare queste impostazioni anche dalla Dashboard Web' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'stats') {
      const stats = DatabaseHelper.getPartnershipStats(interaction.guild.id);
      const recent = DatabaseHelper.getPartnerships(interaction.guild.id, 5);

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setTitle(`📊 Statistiche Partnership | ${interaction.guild.name}`)
        .addFields(
          { name: '🤝 Totale Partnership', value: `\`${stats.total}\``, inline: true },
          { name: '🏆 Top Partner Manager', value: stats.leaderboard[0] ? `<@${stats.leaderboard[0].rep_user_id}> (\`${stats.leaderboard[0].count}\` fatte)` : '`Nessuno`', inline: true }
        );

      if (recent.length > 0) {
        const recentList = recent.map(p => `• **${p.partner_name}** (<t:${p.timestamp}:R>) di <@${p.rep_user_id}>`).join('\n');
        embed.addFields({ name: '🕒 Ultime 5 Partnership', value: recentList });
      }

      embed.setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'leaderboard') {
      const stats = DatabaseHelper.getPartnershipStats(interaction.guild.id);
      if (stats.leaderboard.length === 0) {
        return interaction.reply({ content: '📊 Non ci sono ancora partnership registrate in questo server.', ephemeral: true });
      }

      const desc = stats.leaderboard
        .map((entry, idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;
          return `${medal} <@${entry.rep_user_id}> — **${entry.count}** partnership`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setTitle(`🏆 Classifica Partner Manager | ${interaction.guild.name}`)
        .setDescription(desc)
        .setFooter({ text: `Totale complessivo: ${stats.total} partnership` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};
