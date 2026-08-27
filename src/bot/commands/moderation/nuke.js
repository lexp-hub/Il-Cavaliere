import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { CONFIG } from '../../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Ricrea completamente il canale cancellando tutti i messaggi passati'),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Solo gli amministratori possono eseguire il comando nuke.', ephemeral: true });
    }

    const channel = interaction.channel;
    const position = channel.position;
    const parent = channel.parent;
    const topic = channel.topic;
    const name = channel.name;

    await interaction.reply({ content: '💣 Ricreazione del canale in corso...', ephemeral: true });

    try {
      const clonedChannel = await channel.clone({
        name,
        parent,
        topic,
        position,
        reason: `Nuked by ${interaction.user.tag}`
      });

      await channel.delete(`Nuked by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setTitle('💥 Canale Ricreato (Nuked)')
        .setDescription(`Questo canale è stato ripulito e ricreato con successo da ${interaction.user}!`)
        .setImage('https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif')
        .setFooter({ text: 'Sentry • Moderazione' })
        .setTimestamp();

      await clonedChannel.send({ embeds: [embed] });
    } catch (e) {
      console.error('[Nuke Command] Error:', e);
    }
  }
};
