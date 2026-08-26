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
    const manager = interaction.options.getUser('manager');
    const modal = PartnershipManager.createPartnershipModal(
      manager ? manager.id : null,
      manager ? (manager.tag || manager.username) : ''
    );
    return interaction.showModal(modal);
  }
};

