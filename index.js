import { createBotClient, loadCommandsAndEvents, registerSlashCommands } from './src/bot/client.js';
import { createDashboardServer } from './src/dashboard/server.js';
import { CONFIG } from './src/config.js';

async function main() {
  console.log('====================================================');
  console.log('🛡️  IL CAVALIERE - DISCORD BOT & NOCTALY DASHBOARD  🛡️');
  console.log('====================================================');

  const botClient = createBotClient();

  try {
    console.log('[System] Caricamento comandi slash ed eventi Discord...');
    await loadCommandsAndEvents(botClient);
  } catch (error) {
    console.error('[System] Errore nel caricamento dei comandi:', error);
  }

  const { server } = createDashboardServer(botClient);
  
  server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`\n🌐 [Dashboard] Web Server attivo con successo su Wispbyte!`);
    console.log(`🔗 In ascolto su: http://0.0.0.0:${CONFIG.PORT}`);
    console.log(`🎨 Stile UI: Noctaly Cyberpunk & Glassmorphism\n`);
  });

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
    console.log('\x1b[33m[Bot Avviso] DISCORD_BOT_TOKEN non impostato nelle variabili d\'ambiente.\x1b[0m');
    console.log('\x1b[32m[Dashboard] La Dashboard è pienamente accessibile all\'indirizzo: http://0.0.0.0:' + CONFIG.PORT + '\x1b[0m\n');
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

main();
