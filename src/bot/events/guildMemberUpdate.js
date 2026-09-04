import { BoostManager } from '../modules/boostManager.js';

export default {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    if (!newMember.guild) return;

    // Detect if member started boosting or renewed/added a boost
    const oldBoost = Boolean(oldMember.premiumSinceTimestamp);
    const newBoost = Boolean(newMember.premiumSinceTimestamp);

    if (!oldBoost && newBoost) {
      await BoostManager.handleMemberBoost(newMember);
    } else if (newMember.premiumSinceTimestamp && oldMember.premiumSinceTimestamp && newMember.premiumSinceTimestamp > oldMember.premiumSinceTimestamp) {
      await BoostManager.handleMemberBoost(newMember);
    }
  }
};
