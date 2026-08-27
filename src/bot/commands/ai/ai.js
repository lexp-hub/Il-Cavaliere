import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { AIManager } from '../../modules/aiManager.js';
import { DatabaseHelper } from '../../../database/db.js';
import { CONFIG } from '../../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Interagisci con l\'Intelligenza Artificiale Sentry AI')
    .addSubcommand(sub =>
      sub
        .setName('ask')
        .setDescription('Poni una domanda diretta a Sentry')
        .addStringOption(opt =>
          opt
            .setName('domanda')
            .setDescription('Cosa vuoi chiedere a Sentry?')
            .setRequired(true)
        )
        .addBooleanOption(opt =>
          opt
            .setName('approfondisci')
            .setDescription('Richiedi una risposta estesa e dettagliata anziché sintetica')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('search')
        .setDescription('Esegue una ricerca web in tempo reale e analizza i risultati')
        .addStringOption(opt =>
          opt
            .setName('ricerca')
            .setDescription('Termine o notizia da cercare sul web')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Azzera la memoria della conversazione in questo canale')
    )
    .addSubcommand(sub =>
      sub
        .setName('prompt')
        .setDescription('Visualizza o reimposta l\'identità e lo stile di Sentry')
        .addStringOption(opt =>
          opt
            .setName('preset')
            .setDescription('Scegli uno stile preimpostato')
            .addChoices(
              { name: '⚔️ Cinico & Spietato (Default)', value: 'cynical' },
              { name: '🛡️ Nobile Sentinella & Guardiano', value: 'noble' },
              { name: '🤖 Assistente Tecnico Preciso', value: 'technical' }
            )
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ask') {
      const question = interaction.options.getString('domanda');
      const detail = interaction.options.getBoolean('approfondisci') || false;

      await interaction.deferReply();

      const guildAI = interaction.guild ? DatabaseHelper.getAIConfig(interaction.guild.id) : { enabled: true };
      const systemPrompt = guildAI.system_prompt || AIManager.loadPrompt();

      const userDisplayName = interaction.member?.displayName || interaction.user.username;
      const userPrompt = detail
        ? `[Utente: ${userDisplayName} | Richiesta dettagliata]: ${question} (spiega in dettaglio)`
        : `[Utente: ${userDisplayName}]: ${question}`;

      const messages = [{ role: 'user', content: userPrompt }];
      let reply = await AIManager.getAIResponse(messages, systemPrompt, guildAI.model);

      const searchMatch = reply.match(/\[CERCA:\s*(.*?)\]/i);
      if (searchMatch) {
        const query = searchMatch[1].trim();
        const searchResults = await AIManager.performWebSearch(query);
        const finalPrompt = `${systemPrompt}\n\nRisultati web trovati per "${query}":\n${searchResults}\n\nRispondi all'utente in modo sintetico e pungente basandoti sui dati.`;
        reply = await AIManager.getAIResponse(messages, finalPrompt, guildAI.model);
        reply = reply.replace(/\[CERCA:\s*.*?\]/gi, '').trim();
      }

      await interaction.editReply({ content: reply });
    } else if (subcommand === 'search') {
      const query = interaction.options.getString('ricerca');
      await interaction.deferReply();

      const searchResults = await AIManager.performWebSearch(query);
      const guildAI = interaction.guild ? DatabaseHelper.getAIConfig(interaction.guild.id) : { enabled: true };
      const systemPrompt = guildAI.system_prompt || AIManager.loadPrompt();

      const searchMessages = [
        {
          role: 'user',
          content: `Ho cercato "${query}". Ecco i risultati dal web:\n\n${searchResults}\n\nFornisci la tua sintesi cinica e lucida su questi fatti in italiano.`
        }
      ];

      const reply = await AIManager.getAIResponse(searchMessages, systemPrompt, guildAI.model);

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setTitle(`🔍 Ricerca Web: ${query}`)
        .setDescription(reply)
        .setFooter({ text: 'Sentry AI • Web Intelligence' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === 'reset') {
      DatabaseHelper.resetChannelMemory(interaction.channel.id);
      await interaction.reply({
        content: '🧹 Memoria della conversazione azzerata per questo canale. Sentry ha dimenticato i messaggi precedenti.'
      });
    } else if (subcommand === 'prompt') {
      const preset = interaction.options.getString('preset');

      if (!preset) {
        const guildAI = interaction.guild ? DatabaseHelper.getAIConfig(interaction.guild.id) : {};
        const currentPrompt = guildAI.system_prompt || AIManager.loadPrompt();

        const embed = new EmbedBuilder()
          .setColor(CONFIG.EMBED_COLOR)
          .setTitle('🎭 Identità Attuale di Sentry')
          .setDescription(`\`\`\`${currentPrompt.slice(0, 1500)}\`\`\``)
          .setFooter({ text: 'Puoi personalizzare il prompt anche dalla Dashboard Web!' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Solo gli amministratori possono modificare il preset dell\'IA.', ephemeral: true });
      }

      let newPrompt = "";
      if (preset === 'noble') {
        newPrompt = "Sei 'Sentry', una nobile sentinella di sicurezza e guardiano dei server Discord. Rispondi con tono fiero, leale ed epico, dispensando consigli saggi ed elevati per il bene del server. Massimo 300 caratteri.";
      } else if (preset === 'technical') {
        newPrompt = "Sei 'Sentry', un'intelligenza artificiale focalizzata su precisione logica, programmazione, sicurezza e analisi tecnica oggettiva. Rispondi in modo pulito, asciutto ed impeccabile.";
      } else {
        newPrompt = AIManager.loadPrompt();
      }

      DatabaseHelper.updateAIConfig(interaction.guild.id, { system_prompt: newPrompt });
      await interaction.reply({ content: `✅ Stile di Sentry aggiornato al preset: **${preset}**!` });
    }
  }
};
