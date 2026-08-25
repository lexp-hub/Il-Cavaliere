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

    const updatePresence = () => {
      const activities = [
        {
          name: 'Cantiche Medievali | /help',
          type: ActivityType.Listening
        },
        {
          name: 'Canti dei Templari',
          type: ActivityType.Listening
        },
        {
          name: 'Inni Gregoriani | /help',
          type: ActivityType.Listening
        },
        {
          name: `${client.guilds.cache.size} Reami | /help`,
          type: ActivityType.Watching
        }
      ];

      const randomActivity = activities[Math.floor(Math.random() * activities.length)];

      client.user.setPresence({
        activities: [randomActivity],
        status: 'online'
      });
    };

    updatePresence();
    setInterval(updatePresence, 60 * 1000);

    GiveawayManager.init(client);
  }
};
