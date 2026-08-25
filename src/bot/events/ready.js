import { ActivityType } from 'discord.js';
import { GiveawayManager } from '../modules/giveawayManager.js';
import { CONFIG } from '../../config.js';

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`\n🛡️ [Il Cavaliere] Bot avviato con successo come ${client.user.tag}!`);
    console.log(`🌐 Connesso a ${client.guilds.cache.size} server e ${client.users.cache.size} utenti.`);
    console.log(`📊 Dashboard attiva su: ${CONFIG.DASHBOARD_URL}\n`);

    // Set custom rich activity
    client.user.setPresence({
      activities: [
        {
          name: '🛡️ Proteggendo i Reami | /help',
          type: ActivityType.Custom
        }
      ],
      status: 'online'
    });

    // Initialize giveaway timers
    GiveawayManager.init(client);
  }
};

