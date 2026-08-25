import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} from 'discord.js';
import { PresentationManager } from '../../modules/presentationManager.js';
import { DatabaseHelper } from '../../../database/db.js';

export default {
  data: new SlashCommandBuilder()
    .setName('presentazione')
    .setDescription('Comandi per il sistema di Presentazioni della Community')
    .addSubcommand(sub =>
      sub
        .setName('form')
        .setDescription('Apre il form modale a schermo per presentarti al server')
    )
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Invia il pannello informativo con pulsante per aprire il form presentazioni')
        .addChannelOption(opt =>
          opt
            .setName('canale')
            .setDescription('Canale in cui inviare il pannello')
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
            .setDescription('Descrizione personalizzata')
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
        .setName('config')
        .setDescription('Configura il canale e i premi per le presentazioni')
        .addChannelOption(opt =>
          opt
            .setName('canale')
            .setDescription('Canale dedicato in cui pubblicare le presentazioni')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt
            .setName('ruolo_premio')
            .setDescription('Ruolo da assegnare a chi si presenta (es. Membro Ufficiale)')
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt
            .setName('xp_bonus')
            .setDescription('Punti XP bonus assegnati al completamento')
            .setMinValue(0)
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt
            .setName('attivo')
            .setDescription('Abilita o disabilita il modulo presentazioni')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Mostra le ultime presentazioni registrate')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // 1. OPEN FORM MODAL
    if (subcommand === 'form') {
      const modal = PresentationManager.createPresentationModal();
      return interaction.showModal(modal);
    }

    // 2. SEND PANEL
    if (subcommand === 'panel') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) &&
          !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({
          content: '❌ Non hai i permessi per inviare il pannello presentazioni.',
          ephemeral: true
        });
      }

      const config = DatabaseHelper.getPresentationConfig(interaction.guild.id);
      const targetChannel = interaction.options.getChannel('canale') || 
        (config.channel_id ? interaction.guild.channels.cache.get(config.channel_id) : interaction.channel);

      if (!targetChannel) {
        return interaction.reply({ content: '❌ Nessun canale valido specificato o configurato.', ephemeral: true });
      }

      const title = interaction.options.getString('titolo') || '📜 Sala delle Presentazioni';
      const description = interaction.options.getString('descrizione') || null;
      const image = interaction.options.getString('immagine') || null;

      try {
        await PresentationManager.sendPresentationPanel(interaction.guild, targetChannel.id, title, description, '#6366f1', image);
        return interaction.reply({ content: `✅ Pannello presentazioni inviato con successo in ${targetChannel}!`, ephemeral: true });
      } catch (err) {
        return interaction.reply({ content: `❌ Errore durante l'invio del pannello: ${err.message}`, ephemeral: true });
      }
    }

    // 3. CONFIG
    if (subcommand === 'config') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: '❌ Solo gli amministratori possono modificare la configurazione delle presentazioni.',
          ephemeral: true
        });
      }

      const channel = interaction.options.getChannel('canale');
      const rewardRole = interaction.options.getRole('ruolo_premio');
      const xpReward = interaction.options.getInteger('xp_bonus');
      const active = interaction.options.getBoolean('attivo');

      const updates = {};
      if (channel) updates.channel_id = channel.id;
      if (rewardRole) updates.reward_role_id = rewardRole.id;
      if (xpReward !== null) updates.xp_reward = xpReward;
      if (active !== null) updates.enabled = active;

      const newConfig = DatabaseHelper.updatePresentationConfig(interaction.guild.id, updates);

      const embed = new EmbedBuilder()
        .setColor('#6366f1')
        .setTitle('⚙️ Configurazione Presentazioni Aggiornata')
        .addFields(
          { name: 'Stato Modulo', value: newConfig.enabled ? '🟢 `Attivo`' : '🔴 `Disattivato`', inline: true },
          { name: 'Canale Presentazioni', value: newConfig.channel_id ? `<#${newConfig.channel_id}>` : '`Non impostato`', inline: true },
          { name: 'Ruolo Ricompensa', value: newConfig.reward_role_id ? `<@&${newConfig.reward_role_id}>` : '`Nessuno`', inline: true },
          { name: 'XP Bonus', value: `\`+${newConfig.xp_reward}\` XP`, inline: true }
        )
        .setFooter({ text: 'Puoi personalizzare tutto anche dalla Dashboard Web' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // 4. LIST RECENT
    if (subcommand === 'list') {
      const list = DatabaseHelper.getPresentations(interaction.guild.id, 10);
      if (list.length === 0) {
        return interaction.reply({ content: '📜 Nessuna presentazione registrata finora.', ephemeral: true });
      }

      const desc = list.map(p => `• **${p.name}** (<@${p.user_id}>) — <t:${p.timestamp}:R>`).join('\n');
      const embed = new EmbedBuilder()
        .setColor('#6366f1')
        .setTitle(`📜 Ultime Presentazioni | ${interaction.guild.name}`)
        .setDescription(desc)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};

