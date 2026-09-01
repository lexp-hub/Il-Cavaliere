import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} from 'discord.js';
import { WebhookReplacerManager } from '../../modules/webhookReplacerManager.js';
import { DatabaseHelper } from '../../../database/db.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sostituisci')
    .setDescription('Gestione sostituzione messaggi webhook/bot con riassegnazione immagini a Sentry')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub
        .setName('messaggio')
        .setDescription('Sostituisce un messaggio webhook o bot con embed e riassegna le immagini a Sentry')
        .addStringOption(opt =>
          opt
            .setName('id_messaggio')
            .setDescription('ID del messaggio da sostituire nel canale corrente')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('canale')
        .setDescription('Attiva o disattiva la sostituzione automatica dei webhook in un canale')
        .addChannelOption(opt =>
          opt
            .setName('canale')
            .setDescription('Canale testuale')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addBooleanOption(opt =>
          opt
            .setName('attivo')
            .setDescription('Abilita (True) o Disabilita (False)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Mostra i canali con sostituzione automatica webhook attiva')
    ),

  async execute(interaction) {
    const { guild, channel, options } = interaction;
    const subcommand = options.getSubcommand();

    if (subcommand === 'messaggio') {
      const msgId = options.getString('id_messaggio').trim();
      await interaction.deferReply({ ephemeral: true });

      try {
        const targetMsg = await channel.messages.fetch(msgId).catch(() => null);
        if (!targetMsg) {
          return interaction.followUp({
            content: `❌ Impossibile trovare il messaggio con ID \`${msgId}\` in questo canale (<#${channel.id}>). Assicurati di eseguire il comando nello stesso canale dove risiede il messaggio!`,
            ephemeral: true
          });
        }

        if (targetMsg.author.id === interaction.client.user.id) {
          return interaction.followUp({
            content: '⚠️ Questo messaggio è già stato inviato da Sentry!',
            ephemeral: true
          });
        }

        const res = await WebhookReplacerManager.replaceMessage(targetMsg);
        if (res.success) {
          return interaction.followUp({
            content: `✅ **Messaggio sostituito con successo!** Le immagini sono state scaricate e riassegnate permanentemente a Sentry, e il messaggio originale è stato rimosso.\nNuovo messaggio: https://discord.com/channels/${guild.id}/${channel.id}/${res.newMessage.id}`,
            ephemeral: true
          });
        } else {
          return interaction.followUp({
            content: `❌ Errore durante la sostituzione: \`${res.error || 'Errore sconosciuto'}\``,
            ephemeral: true
          });
        }
      } catch (err) {
        return interaction.followUp({
          content: `❌ Errore durante il recupero o sostituzione del messaggio: \`${err.message}\``,
          ephemeral: true
        });
      }
    }

    if (subcommand === 'canale') {
      const targetChannel = options.getChannel('canale');
      const active = options.getBoolean('attivo');

      if (active) {
        DatabaseHelper.setWebhookReplacerChannel(guild.id, targetChannel.id, 1, 1);
        return interaction.reply({
          content: `✅ **Sostituzione automatica attivata per <#${targetChannel.id}>!**\nOgni volta che un webhook o bot invierà un messaggio/embed con immagini in questo canale, Sentry lo sostituirà automaticamente riassegnandosi le immagini per non perderle.`,
          ephemeral: true
        });
      } else {
        DatabaseHelper.removeWebhookReplacerChannel(guild.id, targetChannel.id);
        return interaction.reply({
          content: `🛑 **Sostituzione automatica disattivata per <#${targetChannel.id}>.**`,
          ephemeral: true
        });
      }
    }

    if (subcommand === 'lista') {
      const channels = DatabaseHelper.getWebhookReplacerChannels(guild.id);
      if (!channels || channels.length === 0) {
        return interaction.reply({
          content: 'ℹ️ Nessun canale ha la sostituzione automatica webhook attiva su questo server.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#3b82f6')
        .setTitle('🔄 Canali Sostituzione Automatica Webhook')
        .setDescription(
          channels.map(c => `• <#${c.channel_id}> (Stato: \`${c.enabled ? 'Attivo' : 'Disattivato'}\`)`).join('\n')
        )
        .setFooter({ text: 'Sentry Webhook Replacer • /sostituisci' });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
