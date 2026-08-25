import assert from 'assert';
import { DatabaseHelper } from '../src/database/db.js';
import { createBotClient, loadCommandsAndEvents } from '../src/bot/client.js';
import { XPManager } from '../src/bot/modules/xpManager.js';
import { WelcomerManager } from '../src/bot/modules/welcomerManager.js';
import { AIManager } from '../src/bot/modules/aiManager.js';

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`  [FAIL] ${name}:`, e.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`  [FAIL] ${name}:`, e.message);
      failed++;
    }
  }

  const testGuildId = `test_guild_${Date.now()}`;

  test('Inizializzazione Guild Settings & Modulo AI', () => {
    const settings = DatabaseHelper.getGuildSettings(testGuildId);
    assert(settings.guild_id === testGuildId, 'Guild ID errato');
    assert(settings.prefix === '!', 'Prefisso di default errato');
    assert(typeof settings.modules_enabled === 'object', 'modules_enabled deve essere un oggetto');
    assert(settings.modules_enabled.ai === true, 'Modulo AI deve essere abilitato di default');
  });

  test('Configurazione AI & Memoria Canale', () => {
    const aiConfig = DatabaseHelper.updateAIConfig(testGuildId, {
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      web_search_enabled: true,
      max_chars: 300
    });
    assert(aiConfig.model.includes('llama'), 'Modello AI non aggiornato');
    assert(aiConfig.web_search_enabled === true, 'Web search non attivo');

    const testChannelId = `chan_ai_test_${Date.now()}`;
    DatabaseHelper.addChannelLog(testChannelId, 'user', 'Ciao Cavaliere');
    DatabaseHelper.addChannelLog(testChannelId, 'assistant', 'Salute guerriero.');
    const mem = DatabaseHelper.getChannelMemory(testChannelId);
    assert(mem.logs.length === 2, 'I log di memoria canale devono essere 2');

    DatabaseHelper.resetChannelMemory(testChannelId);
    const resetMem = DatabaseHelper.getChannelMemory(testChannelId);
    assert(resetMem.logs.length === 0, 'I log devono essere azzerati dopo il reset');
  });

  test('Caricamento Identità e Prompt de Il Cavaliere', () => {
    const prompt = AIManager.loadPrompt();
    assert(prompt.includes('Il Cavaliere'), 'L\'identità deve contenere "Il Cavaliere"');
    assert(!prompt.toLowerCase().includes('runeai'), 'L\'identità non deve contenere "RuneAi"');
  });

  test('Configurazione e Salvataggio Partnership', () => {
    const config = DatabaseHelper.updatePartnershipConfig(testGuildId, {
      min_members: 100,
      cooldown_minutes: 30,
      enabled: true
    });
    assert(config.min_members === 100, 'Min members non aggiornato');
    assert(config.cooldown_minutes === 30, 'Cooldown non aggiornato');

    const added = DatabaseHelper.addPartnership(testGuildId, {
      partner_name: 'Test Partner Server',
      invite_url: 'https://discord.gg/test',
      rep_user_id: 'user_999',
      partner_count: 250
    });
    assert(added.id > 0, 'ID partnership non valido');

    const stats = DatabaseHelper.getPartnershipStats(testGuildId);
    assert(stats.total >= 1, 'Conteggio partnership non registrato');
  });

  test('Salvataggio e Recupero Template Embed', () => {
    const templateId = `tpl_test_${Date.now()}`;
    const embedData = { title: 'Titolo Test', description: 'Descrizione test', color: 0x8B5CF6 };
    DatabaseHelper.saveEmbedTemplate(testGuildId, templateId, 'Template Test', embedData);

    const retrieved = DatabaseHelper.getEmbedTemplate(templateId);
    assert(retrieved !== null, 'Template non trovato');
    assert(retrieved.name === 'Template Test', 'Nome template non corrispondente');

    DatabaseHelper.deleteEmbedTemplate(templateId);
    assert(DatabaseHelper.getEmbedTemplate(templateId) === null, 'Template non eliminato');
  });

  test('Salvataggio Reaction Roles', () => {
    const rr = DatabaseHelper.addReactionRole(
      testGuildId,
      'chan_101',
      'msg_202',
      'BUTTON',
      'role_303',
      '🔔',
      'Notifiche',
      'Primary'
    );
    assert(rr.id > 0, 'ID Reaction Role non creato');
    DatabaseHelper.deleteReactionRole(rr.id);
  });

  test('Welcomer Config & Formattazione Testo', () => {
    const updated = DatabaseHelper.updateWelcomerConfig(testGuildId, {
      welcome_enabled: true,
      welcome_message: 'Benvenuto {user.mention} in {server.name}!'
    });
    assert(updated.welcome_enabled === true, 'Welcomer enabled errato');

    const fakeMember = {
      id: '123456789',
      user: { username: 'Guerriero', tag: 'Guerriero#0001' },
      guild: { name: 'Reame Test', memberCount: 150 }
    };
    const formatted = WelcomerManager.formatText(updated.welcome_message, fakeMember);
    assert(formatted === 'Benvenuto <@123456789> in Reame Test!', `Testo non corretto: ${formatted}`);
  });

  test('Leveling & Calcolo XP', () => {
    const userId = `user_xp_test_${Date.now()}`;
    const result1 = DatabaseHelper.addXp(testGuildId, userId, 200);
    assert(result1.currentXp === 200, `XP non corretti: ${result1.currentXp}`);
    assert(result1.newLevel >= 1, 'Livello iniziale non calcolato');

    const neededXp = XPManager.getXpNeededForLevel(2);
    assert(neededXp === 400, `XP per livello 2 devono essere 400, ottenuto: ${neededXp}`);
  });

  await asyncTest('Caricamento dinamico dei comandi ed eventi (incluso /ai)', async () => {
    const client = createBotClient();
    await loadCommandsAndEvents(client);
    assert(client.commands.size >= 16, `Numero comandi caricati: ${client.commands.size}`);
    assert(client.commands.has('ai'), 'Comando /ai non trovato!');
    assert(client.commands.has('help'), 'Comando /help non trovato');
    assert(client.commands.has('partner'), 'Comando /partner non trovato');
    assert(client.commands.has('embed'), 'Comando /embed non trovato');
  });

  console.log(`\nTEST COMPLETATI: ${passed} passati, ${failed} falliti.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Crash durante l\'esecuzione dei test:', err);
  process.exit(1);
});
