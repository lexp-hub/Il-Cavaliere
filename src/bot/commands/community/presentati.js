import { SlashCommandBuilder } from 'discord.js';
import { PresentationManager } from '../../modules/presentationManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('presentati')
    .setDescription('Compila il form modale per presentarti alla community del server'),

  async execute(interaction) {
    const modal = PresentationManager.createPresentationModal();
    return interaction.showModal(modal);
  }
};

