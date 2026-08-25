import { SlashCommandBuilder } from 'discord.js';
import { PartnershipManager } from '../../modules/partnershipManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('partnership')
    .setDescription('Registra una nuova partnership aprendo il form interattivo')
    .addUserOption(opt =>
      opt
        .setName('manager')
        .setDescription('Il partner manager o rappresentante del server partner')
        .setRequired(false)
    ),

  async execute(interaction) {
    const manager = interaction.options.getUser('manager') || interaction.user;
    const modal = PartnershipManager.createPartnershipModal(manager.id);
    return interaction.showModal(modal);
  }
};

