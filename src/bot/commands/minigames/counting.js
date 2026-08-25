import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} from 'discord.js';
import { DatabaseHelper } from '../../../database/db.js';
import { CONFIG } from '../../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('counting')
    .setDescription('Minigioco cooperativo di conteggio per la community')
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Imposta il canale dedicato al gioco del conteggio')
        .addChannelOption(opt =>
          opt
            .setName('canale')
            .setDescription('Il canale dove gli utenti conteranno')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('stats')
        .setDescription('Mostra le statistiche e il record attuale di conteggio')
    )
    .addSubcommand(sub =>
      sub
        .setName('leaderboard')
        .setDescription('Classifica dei migliori contatori del server')
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Azzera il conteggio attuale (Solo Amministratori)')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) &&
          !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo i moderatori possono impostare il canale di conteggio.', ephemeral: true });
      }

      const channel = interaction.options.getChannel('canale');
      DatabaseHelper.saveCountingConfig(interaction.guild.id, {
        channel_id: channel.id,
        enabled: true,
        current_number: 0
      });

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_SUCCESS_COLOR || '#10b981')
        .setTitle('🔢 Canale Counting Impostato!')
        .setDescription(`Il canale ${channel} è ora attivo per il gioco del conteggio!\n\n**Regole del Gioco:**\n1. Iniziate scrivendo **1**, poi **2**, **3**, ecc.\n2. La stessa persona **non può** contare due volte di fila!\n3. Se qualcuno sbaglia o conta due volte, si ricomincia da 1!\n\n*Buona fortuna, cavalieri!*`)
        .setFooter({ text: 'Il Cavaliere • Minigiochi', iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Canale di conteggio impostato con successo in ${channel}!`, ephemeral: true });
    } else if (subcommand === 'stats') {
      const cfg = DatabaseHelper.getCountingConfig(interaction.guild.id);
      const userScore = DatabaseHelper.db.prepare('SELECT * FROM counting_scores WHERE guild_id = ? AND user_id = ?').get(interaction.guild.id, interaction.user.id) || { correct_counts: 0, ruined_counts: 0 };

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR || '#dc2626')
        .setTitle('🔢 Statistiche Counting Server')
        .addFields(
          { name: '📍 Numero Corrente', value: `\`${cfg.current_number || 0}\``, inline: true },
          { name: '👑 Record del Server', value: `\`${cfg.highest_streak || 0}\``, inline: true },
          { name: '📢 Canale Attivo', value: cfg.channel_id ? `<#${cfg.channel_id}>` : '`Non impostato`', inline: true },
          { name: '👤 I Tuoi Numeri Corretti', value: `\`${userScore.correct_counts || 0}\``, inline: true },
          { name: '💀 Errori Commessi', value: `\`${userScore.ruined_counts || 0}\``, inline: true }
        )
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'leaderboard') {
      const leaderboard = DatabaseHelper.getCountingLeaderboard(interaction.guild.id, 10);

      if (!leaderboard || leaderboard.length === 0) {
        return interaction.reply({ content: 'Nessun punteggio registrato nel counting di questo server.', ephemeral: true });
      }

      let desc = '';
      leaderboard.forEach((entry, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `**#${idx + 1}**`;
        desc += `${medal} <@${entry.user_id}> — **${entry.correct_counts}** numeri corretti *(💀 ${entry.ruined_counts} errori)*\n`;
      });

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR || '#dc2626')
        .setTitle('🏆 Classifica Contatori del Reame')
        .setDescription(desc)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'reset') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo gli amministratori possono azzerare il conteggio.', ephemeral: true });
      }

      DatabaseHelper.saveCountingConfig(interaction.guild.id, { current_number: 0, last_user_id: null });
      await interaction.reply({ content: '🔄 Il conteggio è stato azzerato a 0. Il prossimo numero valido è **1**!', ephemeral: false });
    }
  }
};

