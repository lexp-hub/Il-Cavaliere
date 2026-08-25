import { createBotClient, loadCommandsAndEvents, registerSlashCommands } from './bot/client.js';
import { createDashboardServer } from './dashboard/server.js';
import { CONFIG } from './config.js';

async function main() {
  console.log('====================================================');
  console.log('🛡️  IL CAVALIERE - DISCORD BOT & NOCTALY DASHBOARD  🛡️');
  console.log('====================================================');

  // 1. Initialize Discord Bot Client
  const botClient = createBotClient();

  try {
    console.log('[System] Caricamento comandi slash ed eventi Discord...');
    await loadCommandsAndEvents(botClient);
  } catch (error) {
    console.error('[System] Errore nel caricamento dei comandi:', error);
  }

  // 2. Start Web Dashboard Server (Express + WebSockets)
  const { server } = createDashboardServer(botClient);
  
  server.listen(CONFIG.PORT, () => {
    console.log(`\n🌐 [Dashboard] Web Server attivo con successo!`);
    console.log(`🔗 URL Dashboard: \x1b[36m${CONFIG.DASHBOARD_URL}\x1b[0m`);
    console.log(`🎨 Stile UI: Noctaly Cyberpunk & Glassmorphism`);
    console.log(`📊 Moduli abilitati: Partnerships, Embeds, Reaction Roles, Welcomer, AutoMod, Tickets, Leveling, Starboard\n`);
  });

  // 3. Connect Discord Bot if Token is provided
  if (CONFIG.BOT_TOKEN && CONFIG.BOT_TOKEN.trim().length > 10) {
    console.log('[Bot] Connessione al gateway Discord in corso...');
    botClient.login(CONFIG.BOT_TOKEN)
      .then(async () => {
        await registerSlashCommands(botClient);
      })
      .catch((err) => {
        console.error('[Bot] Errore di login con il token Discord fornito:', err.message);
        console.log('[Bot] La dashboard continuerà ad essere attiva in modalità Standalone / Preview.');
      });
  } else {
    console.log('\x1b[33m[Bot Avviso] DISCORD_BOT_TOKEN non impostato nel file .env o vuoto.\x1b[0m');
    console.log('\x1b[32m[Dashboard] La Dashboard è pienamente accessibile in modalità Demo all\'indirizzo: \x1b[36m' + CONFIG.DASHBOARD_URL + '\x1b[0m');
    console.log('\x1b[32m[Config] Per collegare il bot reale a Discord, inserisci il tuo token in .env o config.js!\x1b[0m\n');
  }
}

// Global Exception Handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

main();

