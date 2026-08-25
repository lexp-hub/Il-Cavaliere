import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} from 'discord.js';
import { DatabaseHelper } from '../../../database/db.js';
import { TicketManager } from '../../modules/ticketManager.js';
import { CONFIG } from '../../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gestione del sistema Ticket di supporto')
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Invia un pannello interattivo per aprire i ticket')
        .addChannelOption(opt =>
          opt
            .setName('canale')
            .setDescription('Canale in cui inviare il pannello')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(opt => opt.setName('titolo').setDescription('Titolo del pannello').setRequired(false))
        .addStringOption(opt => opt.setName('descrizione').setDescription('Descrizione del pannello').setRequired(false))
        .addChannelOption(opt =>
          opt
            .setName('categoria')
            .setDescription('Categoria Discord dove creare i canali ticket')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt
            .setName('ruolo_supporto')
            .setDescription('Ruolo dello staff di supporto autorizzato a vedere i ticket')
            .setRequired(false)
        )
        .addStringOption(opt => opt.setName('testo_bottone').setDescription('Testo sul pulsante di apertura').setRequired(false))
        .addStringOption(opt => opt.setName('emoji_bottone').setDescription('Emoji sul pulsante').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('close')
        .setDescription('Chiude il ticket corrente')
        .addStringOption(opt => opt.setName('motivo').setDescription('Motivo della chiusura').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('claim')
        .setDescription('Prende in carico il ticket corrente')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'panel') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
          !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({
          content: '❌ Solo gli amministratori possono inviare pannelli ticket.',
          ephemeral: true
        });
      }

      const channel = interaction.options.getChannel('canale');
      const title = interaction.options.getString('titolo') || '🎫 Centro Assistenza & Ticket';
      const desc = interaction.options.getString('descrizione') || 'Hai bisogno di aiuto, vuoi proporre una partnership o segnalare un problema?\nClicca sul pulsante qui sotto per aprire una conversazione privata con il nostro staff!';
      const category = interaction.options.getChannel('categoria');
      const supportRole = interaction.options.getRole('ruolo_supporto');
      const buttonLabel = interaction.options.getString('testo_bottone') || 'Apri Ticket';
      const buttonEmoji = interaction.options.getString('emoji_bottone') || '📩';

      const panelId = `panel_${Date.now()}`;

      const openButton = new ButtonBuilder()
        .setCustomId(`ticket_open_${panelId}`)
        .setLabel(buttonLabel)
        .setEmoji(buttonEmoji)
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(openButton);

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setTitle(title)
        .setDescription(desc)
        .setFooter({ text: 'Il Cavaliere • Assistenza Clienti', iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      const sent = await channel.send({ embeds: [embed], components: [row] });

      DatabaseHelper.saveTicketPanel({
        id: panelId,
        guild_id: interaction.guild.id,
        channel_id: channel.id,
        message_id: sent.id,
        title,
        description: desc,
        category_id: category?.id || null,
        button_label: buttonLabel,
        button_emoji: buttonEmoji,
        support_role_id: supportRole?.id || null
      });

      await interaction.reply({ content: `✅ Pannello Ticket inviato con successo in ${channel}!`, ephemeral: true });
    } else if (subcommand === 'close') {
      const reason = interaction.options.getString('motivo') || 'Nessun motivo specificato';
      await TicketManager.handleTicketClose(interaction, reason);
    } else if (subcommand === 'claim') {
      await TicketManager.handleTicketClaim(interaction);
    }
  }
};

