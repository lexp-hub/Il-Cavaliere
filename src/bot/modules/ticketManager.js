import { DatabaseHelper } from '../../database/db.js';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} from 'discord.js';
import { CONFIG } from '../../config.js';

export const TicketManager = {
  async handleTicketCreate(interaction, panelId = null) {
    const { guild, user } = interaction;

    // Check if user already has an open ticket
    const existingTicket = DatabaseHelper.db.prepare(
      "SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'OPEN'"
    ).get(guild.id, user.id);

    if (existingTicket) {
      const existingChannel = guild.channels.cache.get(existingTicket.channel_id);
      if (existingChannel) {
        return interaction.reply({
          content: `❌ Hai già un ticket aperto in ${existingChannel}!`,
          ephemeral: true
        });
      }
    }

    await interaction.deferReply({ ephemeral: true });

    let panel = null;
    if (panelId) {
      panel = DatabaseHelper.getTicketPanel(panelId);
    }

    const supportRoleId = panel?.support_role_id;
    const categoryId = panel?.category_id;

    // Permission overwrites for ticket channel
    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks
        ]
      },
      {
        id: guild.client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.EmbedLinks
        ]
      }
    ];

    if (supportRoleId) {
      permissionOverwrites.push({
        id: supportRoleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      });
    }

    try {
      const sanitizedUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const ticketChannel = await guild.channels.create({
        name: `ticket-${sanitizedUsername || 'user'}`,
        type: ChannelType.GuildText,
        parent: categoryId || undefined,
        permissionOverwrites,
        topic: `Ticket di ${user.tag} (${user.id}) | Creato: ${new Date().toLocaleString('it-IT')}`
      });

      // Save ticket in DB
      DatabaseHelper.createTicket(guild.id, ticketChannel.id, user.id, panelId);

      // Create ticket control buttons
      const closeBtn = new ButtonBuilder()
        .setCustomId(`ticket_close_${ticketChannel.id}`)
        .setLabel('Chiudi Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger);

      const claimBtn = new ButtonBuilder()
        .setCustomId(`ticket_claim_${ticketChannel.id}`)
        .setLabel('Prendi in Carico')
        .setEmoji('✋')
        .setStyle(ButtonStyle.Primary);

      const actionRow = new ActionRowBuilder().addComponents(closeBtn, claimBtn);

      const welcomeEmbed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setTitle('🎫 Ticket di Supporto Aperto')
        .setDescription(
          panel?.welcome_message?.replace(/{user\.mention}/g, `<@${user.id}>`) ||
          `Benvenuto ${user}! Uno staffer ti risponderà al più presto.\n\nPer favore descrivi il tuo problema in dettaglio includendo screenshot o informazioni utili.`
        )
        .addFields(
          { name: '👤 Autore', value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: '⏰ Creato il', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'Il Cavaliere • Sistema Ticket', iconURL: guild.iconURL() })
        .setTimestamp();

      const pingContent = supportRoleId ? `<@${user.id}> <@&${supportRoleId}>` : `<@${user.id}>`;
      await ticketChannel.send({ content: pingContent, embeds: [welcomeEmbed], components: [actionRow] });

      await interaction.editReply({
        content: `✅ Il tuo ticket è stato creato con successo: ${ticketChannel}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('[TicketManager] Error creating ticket:', error);
      await interaction.editReply({
        content: `❌ Si è verificato un errore nella creazione del ticket: ${error.message}`,
        ephemeral: true
      });
    }
  },

  async handleTicketClaim(interaction) {
    const { channel, user, guild } = interaction;
    const ticket = DatabaseHelper.getTicketByChannel(channel.id);
    if (!ticket) {
      return interaction.reply({ content: '❌ Questo canale non è un ticket registrato.', ephemeral: true });
    }

    if (ticket.status === 'CLAIMED') {
      return interaction.reply({
        content: `❌ Questo ticket è già stato preso in carico da <@${ticket.claimed_by}>!`,
        ephemeral: true
      });
    }

    DatabaseHelper.claimTicket(channel.id, user.id);

    const claimEmbed = new EmbedBuilder()
      .setColor(CONFIG.EMBED_SUCCESS_COLOR)
      .setDescription(`✋ Il ticket è stato preso in carico da **${user}** (\`${user.tag}\`).`)
      .setTimestamp();

    await interaction.reply({ embeds: [claimEmbed] });
  },

  async handleTicketClose(interaction, reason = 'Nessuna motivazione specificata') {
    const { channel, user, guild } = interaction;
    const ticket = DatabaseHelper.getTicketByChannel(channel.id);
    if (!ticket) {
      return interaction.reply({ content: '❌ Questo canale non è un ticket registrato.', ephemeral: true });
    }

    await interaction.reply({
      content: `🔒 Chiusura del ticket in corso da parte di ${user}... Il canale verrà eliminato tra 5 secondi.`
    });

    // Fetch message history for transcript
    let transcript = `=== TRANSCRIPT TICKET ${channel.name} ===\nGuild: ${guild.name} (${guild.id})\nAutore: ${ticket.user_id}\nChiuso da: ${user.tag} (${user.id})\nMotivo: ${reason}\n\n`;

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const sortedMessages = Array.from(messages.values()).reverse();
      for (const msg of sortedMessages) {
        const time = new Date(msg.createdTimestamp).toISOString();
        transcript += `[${time}] ${msg.author.tag}: ${msg.content}\n`;
        if (msg.attachments.size > 0) {
          msg.attachments.forEach(att => {
            transcript += `  [Allegato: ${att.url}]\n`;
          });
        }
      }
    } catch (e) {
      transcript += `[Errore recupero messaggi: ${e.message}]\n`;
    }

    DatabaseHelper.closeTicket(channel.id, transcript);

    // Send DM transcript to ticket owner if possible
    try {
      const ticketOwner = await guild.client.users.fetch(ticket.user_id);
      if (ticketOwner) {
        const dmEmbed = new EmbedBuilder()
          .setColor(CONFIG.EMBED_COLOR)
          .setTitle('🎫 Ticket Chiuso')
          .setDescription(`Il tuo ticket su **${guild.name}** è stato chiuso.\n**Motivo:** \`${reason}\``)
          .setTimestamp();
        await ticketOwner.send({ embeds: [dmEmbed] }).catch(() => {});
      }
    } catch (e) {}

    setTimeout(async () => {
      try {
        await channel.delete('Ticket chiuso');
      } catch (err) {
        console.error('[TicketManager] Error deleting channel:', err.message);
      }
    }, 5000);
  }
};

export default TicketManager;

