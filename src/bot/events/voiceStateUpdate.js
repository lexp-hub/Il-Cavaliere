import { TempChannelManager } from '../modules/tempChannelManager.js';

export default {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    try {
      await TempChannelManager.handleVoiceStateUpdate(oldState, newState);
    } catch (error) {
      console.error('[VoiceStateUpdate] Errore gestione evento canali vocali:', error);
    }
  }
};
