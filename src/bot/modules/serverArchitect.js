import fs from 'fs';
import { ChannelType, PermissionsBitField, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../../config.js';
import { AIManager } from './aiManager.js';
import { DatabaseHelper } from '../../database/db.js';
import { TempChannelManager } from './tempChannelManager.js';
import { TicketManager } from './ticketManager.js';
import { FishingManager } from './fishingManager.js';
import { BlackjackManager } from './blackjackManager.js';

let ARCHITECT_SYSTEM_PROMPT = '';

export function loadArchitectPrompt() {
  try {
    if (fs.existsSync(CONFIG.SERVER_ARCHITECT_PROMPT_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.SERVER_ARCHITECT_PROMPT_PATH, 'utf-8'));
      if (data && typeof data.systemPrompt === 'string' && data.systemPrompt.trim().length > 0) {
        ARCHITECT_SYSTEM_PROMPT = data.systemPrompt.trim();
        return ARCHITECT_SYSTEM_PROMPT;
      }
    }
  } catch (err) {
    console.error('[ServerArchitect] Errore caricamento server_architect_prompt.json:', err.message);
  }

  ARCHITECT_SYSTEM_PROMPT = "Sei l'Architetto Ufficiale di Server Discord per Sentry. Restituisci ESCLUSIVAMENTE un JSON valido con ruoli, categorie e canali.";
  return ARCHITECT_SYSTEM_PROMPT;
}

loadArchitectPrompt();

export const ServerArchitect = {
  loadPrompt: loadArchitectPrompt,

  // === 1. Curated 1-Click Archetypes ===
  getPrebuiltTemplates() {
    return {
      medieval: {
        id: 'medieval',
        name: '🏰 Reame Medievale & Impero',
        badge: 'Archetipo Consigliato',
        description: 'La struttura per eccellenza per Sentry: Taverna dei minigiochi RPG (pesca, blackjack, conteggio), corte imperiale, stanze dei cavalieri blindate e registri di guardia.',
        icon: 'castle',
        color: '#ef4444',
        structure: {
          serverName: 'Reame Imperiale • Sentry',
          description: 'Struttura medievale nobiliare con taverna minigiochi e sicurezza di corte.',
          roles: [
            { name: '👑 Imperatore / Sovrano', color: '#ef4444', hoist: true, permissions: ['Administrator'] },
            { name: '🛡️ Paladino di Corte (Staff)', color: '#3b82f6', hoist: true, permissions: ['ManageMessages', 'KickMembers', 'MuteMembers', 'ModerateMembers', 'ManageChannels'] },
            { name: '⚔️ Nobile Cavaliere', color: '#f59e0b', hoist: true, permissions: ['ViewChannel', 'SendMessages', 'Connect', 'Speak', 'AttachFiles'] },
            { name: '👥 Cittadino del Reame', color: '#94a3b8', hoist: false, permissions: ['ViewChannel', 'SendMessages', 'Connect', 'Speak'] }
          ],
          categories: [
            {
              name: '📌︱CORTE & INFORMAZIONI',
              channels: [
                { name: '📢︱editti-imperiali', type: 'text', topic: 'Comunicazioni ufficiali del Regno', sentryModule: 'announcements', overwrites: [{ role: '@everyone', allow: ['ViewChannel', 'ReadMessageHistory'], deny: ['SendMessages'] }] },
                { name: '📜︱leggi-del-reame', type: 'text', topic: 'Regole di convivenza e condotta', overwrites: [{ role: '@everyone', allow: ['ViewChannel', 'ReadMessageHistory'], deny: ['SendMessages'] }] },
                { name: '👋︱arrivi-al-castello', type: 'text', topic: 'Accoglienza dei nuovi sudditi', sentryModule: 'welcomer', overwrites: [{ role: '@everyone', allow: ['ViewChannel', 'ReadMessageHistory'], deny: ['SendMessages'] }] }
              ]
            },
            {
              name: '💬︱PIAZZA DEL REGNO',
              channels: [
                { name: '💬︱piazza-principale', type: 'text', topic: 'Discussione generale tra i sudditi' },
                { name: '🎨︱arte-e-creazioni', type: 'text', topic: 'Condivisione immagini e creazioni' },
                { name: '🤖︱oracolo-sentry-ai', type: 'text', topic: "Consulta l'intelligenza artificiale di Sentry", sentryModule: 'ai_chat' }
              ]
            },
            {
              name: '🎲︱TAVERNA DEI GIOCHI RPG',
              channels: [
                { name: '🎣︱lago-dei-pescatori', type: 'text', topic: 'Pesca RPG del Reame • Usa /pesca', sentryModule: 'fish' },
                { name: '🃏︱tavolo-blackjack', type: 'text', topic: 'Bisca reale • Tavolo Blackjack e Casinò', sentryModule: 'blackjack' },
                { name: '🔢︱conteggio-di-corte', type: 'text', topic: 'Conta in ordine senza sbagliare!', sentryModule: 'counting' }
              ]
            },
            {
              name: '🔊︱STANZE DEI CAVALIERI',
              sentryModule: 'temp_voice_category',
              channels: [
                { name: '💬︱hub-stanze-private', type: 'text', topic: 'Pannello di controllo per creare canali vocali e chat private', sentryModule: 'temp_voice_hub' },
                { name: '➕︱Crea Stanza Privata', type: 'voice', userLimit: 0, sentryModule: 'temp_voice_master' }
              ]
            },
            {
              name: '🎫︱UDIENZA REALE & SUPPORTO',
              sentryModule: 'ticket_category',
              channels: [
                { name: '🎫︱richiedi-udienza', type: 'text', topic: 'Apri un ticket per parlare con la corte imperiale', sentryModule: 'ticket_panel' },
                { name: '🤝︱alleanze-e-patti', type: 'text', topic: 'Richieste di partnership e scambi', sentryModule: 'partnership' }
              ]
            },
            {
              name: '🛡️︱REGISTRI DI GUARDIA',
              channels: [
                { name: '🛡️︱registri-moderazione', type: 'text', topic: 'Log di sicurezza e AutoMod di Sentry', sentryModule: 'moderation_logs', overwrites: [{ role: '@everyone', deny: ['ViewChannel'] }] }
              ]
            }
          ]
        }
      },
      gaming: {
        id: 'gaming',
        name: '🎮 Gaming & Esports Hub',
        badge: 'Competitivo & Community',
        description: 'Ideale per clan, tornei e gaming club: Stanze vocali temporanee 5v5, hub chat tattico, bot games e classifiche livelli.',
        icon: 'gamepad-2',
        color: '#8b5cf6',
        structure: {
          serverName: 'Gaming & Esports HQ',
          description: 'Community gaming con stanze vocali temporanee e sfide.',
          roles: [
            { name: '👑 Master Chief', color: '#8b5cf6', hoist: true, permissions: ['Administrator'] },
            { name: '🛡️ Game Mod / Ref', color: '#06b6d4', hoist: true, permissions: ['ManageMessages', 'KickMembers', 'MuteMembers'] },
            { name: '🎯 Pro / Ranked', color: '#10b981', hoist: true, permissions: ['ViewChannel', 'SendMessages', 'Connect', 'Speak', 'AttachFiles'] },
            { name: '🎮 Player', color: '#94a3b8', hoist: false, permissions: ['ViewChannel', 'SendMessages', 'Connect', 'Speak'] }
          ],
          categories: [
            {
              name: '📢︱ESPORTS & NEWS',
              channels: [
                { name: '📢︱annunci-tornei', type: 'text', topic: 'Aggiornamenti e news tornei', sentryModule: 'announcements', overwrites: [{ role: '@everyone', allow: ['ViewChannel'], deny: ['SendMessages'] }] },
                { name: '👋︱welcome-hub', type: 'text', topic: 'Nuovi giocatori in arrivo', sentryModule: 'welcomer', overwrites: [{ role: '@everyone', allow: ['ViewChannel'], deny: ['SendMessages'] }] }
              ]
            },
            {
              name: '💬︱COMMUNITY & CLIPS',
              channels: [
                { name: '💬︱main-chat', type: 'text', topic: 'Chat libera per tutti i gamer' },
                { name: '🎬︱highlights-clips', type: 'text', topic: 'Condividi le tue migliori clip' },
                { name: '🤖︱sentry-ai-tactics', type: 'text', topic: 'Chiedi strategie e consigli a Sentry AI', sentryModule: 'ai_chat' }
              ]
            },
            {
              name: '🎲︱MINIGAMES & CASINO',
              channels: [
                { name: '🎣︱fish-zone', type: 'text', topic: "Pesca RPG tra un match e l'altro", sentryModule: 'fish' },
                { name: '🃏︱casino-blackjack', type: 'text', topic: 'Sfida il bot a Blackjack', sentryModule: 'blackjack' },
                { name: '🔢︱counting-game', type: 'text', topic: 'Counting streak game', sentryModule: 'counting' }
              ]
            },
            {
              name: '🔊︱STANZE SQUAD (JOIN TO CREATE)',
              sentryModule: 'temp_voice_category',
              channels: [
                { name: '💬︱voice-control-panel', type: 'text', topic: 'Gestisci la tua stanza di squadra', sentryModule: 'temp_voice_hub' },
                { name: '➕︱Crea Stanza Squadra', type: 'voice', userLimit: 0, sentryModule: 'temp_voice_master' }
              ]
            },
            {
              name: '🎫︱SUPPORTO & TICKET',
              sentryModule: 'ticket_category',
              channels: [
                { name: '🎫︱apri-ticket-supporto', type: 'text', topic: 'Richiedi assistenza allo staff', sentryModule: 'ticket_panel' },
                { name: '🛡️︱staff-audit-logs', type: 'text', topic: 'Log di sicurezza del server', sentryModule: 'moderation_logs', overwrites: [{ role: '@everyone', deny: ['ViewChannel'] }] }
              ]
            }
          ]
        }
      },
      tech: {
        id: 'tech',
        name: '💻 Tech, Dev & Showcase Hub',
        badge: 'Sviluppo & Risorse',
        description: 'Perfetto per programmatori, designer e maker: Showcase progetti, canali studio, ticket di supporto tecnico e AI coder.',
        icon: 'terminal',
        color: '#0ea5e9',
        structure: {
          serverName: 'Dev & Engineering Studio',
          description: 'Community per sviluppatori, progetti open source e supporto.',
          roles: [
            { name: '👑 Lead Architect', color: '#0ea5e9', hoist: true, permissions: ['Administrator'] },
            { name: '🛡️ Staff Engineer', color: '#6366f1', hoist: true, permissions: ['ManageMessages', 'KickMembers', 'MuteMembers'] },
            { name: '💻 Senior Dev', color: '#10b981', hoist: true, permissions: ['ViewChannel', 'SendMessages', 'Connect', 'Speak', 'AttachFiles'] },
            { name: '💡 Member', color: '#94a3b8', hoist: false, permissions: ['ViewChannel', 'SendMessages', 'Connect', 'Speak'] }
          ],
          categories: [
            {
              name: '📌︱GUIDELINES & NEWS',
              channels: [
                { name: '📢︱releases-updates', type: 'text', topic: 'Release e changelog ufficiali', sentryModule: 'announcements', overwrites: [{ role: '@everyone', allow: ['ViewChannel'], deny: ['SendMessages'] }] },
                { name: '👋︱welcome-devs', type: 'text', topic: 'Presentazione nuovi sviluppatori', sentryModule: 'welcomer', overwrites: [{ role: '@everyone', allow: ['ViewChannel'], deny: ['SendMessages'] }] }
              ]
            },
            {
              name: '💡︱DISCUSSIONE & SHOWCASE',
              channels: [
                { name: '💬︱general-dev', type: 'text', topic: 'Discussioni su codice e tech' },
                { name: '🚀︱project-showcase', type: 'text', topic: 'Mostra i tuoi progetti e setup' },
                { name: '🤖︱sentry-ai-helper', type: 'text', topic: 'Analisi codice e debug con Sentry AI', sentryModule: 'ai_chat' }
              ]
            },
            {
              name: '🎲︱BREAK ROOM & GAMES',
              channels: [
                { name: '🎣︱chill-fishing', type: 'text', topic: 'Pausa caffè con pesca RPG', sentryModule: 'fish' },
                { name: '🃏︱dev-blackjack', type: 'text', topic: 'Tavolo Blackjack', sentryModule: 'blackjack' }
              ]
            },
            {
              name: '🔊︱DEV VOICE ROOMS',
              sentryModule: 'temp_voice_category',
              channels: [
                { name: '💬︱voice-hub', type: 'text', topic: 'Pannello stanze vocali private', sentryModule: 'temp_voice_hub' },
                { name: '➕︱Crea Stanza Dev / Pair', type: 'voice', userLimit: 0, sentryModule: 'temp_voice_master' }
              ]
            },
            {
              name: '🎫︱HELP DESK & AUDIT',
              sentryModule: 'ticket_category',
              channels: [
                { name: '🎫︱ticket-supporto-tecnico', type: 'text', topic: 'Apri un ticket di assistenza', sentryModule: 'ticket_panel' },
                { name: '🛡️︱system-logs', type: 'text', topic: 'Log di sistema e sicurezza', sentryModule: 'moderation_logs', overwrites: [{ role: '@everyone', deny: ['ViewChannel'] }] }
              ]
            }
          ]
        }
      },
      vip: {
        id: 'vip',
        name: '⚔️ Private VIP & Syndicate',
        badge: 'Esclusivo & Blindato',
        description: 'Per circoli privati e server esclusivi: Stanze vocali e testuali private con crittografia logica, bisca di corte e sicurezza serrata.',
        icon: 'shield-alert',
        color: '#ec4899',
        structure: {
          serverName: 'Private Syndicate Vault',
          description: 'Server privato ad alta riservatezza e sicurezza.',
          roles: [
            { name: '👑 Syndicate Boss', color: '#ec4899', hoist: true, permissions: ['Administrator'] },
            { name: '🛡️ Enforcer (Security)', color: '#f43f5e', hoist: true, permissions: ['ManageMessages', 'KickMembers', 'MuteMembers'] },
            { name: '💎 VIP Syndicate', color: '#a855f7', hoist: true, permissions: ['ViewChannel', 'SendMessages', 'Connect', 'Speak', 'AttachFiles'] },
            { name: '👤 Associate', color: '#94a3b8', hoist: false, permissions: ['ViewChannel', 'SendMessages', 'Connect', 'Speak'] }
          ],
          categories: [
            {
              name: '🔒︱INTEL & DIRECTIVES',
              channels: [
                { name: '📢︱direttive-ufficiali', type: 'text', topic: 'Direttive riservate', sentryModule: 'announcements', overwrites: [{ role: '@everyone', allow: ['ViewChannel'], deny: ['SendMessages'] }] },
                { name: '👋︱ingresso-associati', type: 'text', topic: 'Nuovi ingressi nel sindacato', sentryModule: 'welcomer', overwrites: [{ role: '@everyone', allow: ['ViewChannel'], deny: ['SendMessages'] }] }
              ]
            },
            {
              name: '🍷︱SYNDICATE LOUNGE',
              channels: [
                { name: '💬︱salotto-privato', type: 'text', topic: 'Discussioni riservate' },
                { name: '🤖︱oracolo-sentry', type: 'text', topic: 'Intelligence con Sentry AI', sentryModule: 'ai_chat' }
              ]
            },
            {
              name: '🎲︱HIGH STAKES CASINO',
              channels: [
                { name: '🃏︱privé-blackjack', type: 'text', topic: 'Tavolo Blackjack alta quota', sentryModule: 'blackjack' },
                { name: '🎣︱pesca-riservata', type: 'text', topic: 'Zona pesca RPG esclusiva', sentryModule: 'fish' }
              ]
            },
            {
              name: '🔊︱PRIVATE VAULTS (STANZE)',
              sentryModule: 'temp_voice_category',
              channels: [
                { name: '💬︱controllo-stanze-vault', type: 'text', topic: 'Gestione stanze e chat private', sentryModule: 'temp_voice_hub' },
                { name: '➕︱Crea Stanza Riservata', type: 'voice', userLimit: 0, sentryModule: 'temp_voice_master' }
              ]
            },
            {
              name: '🛡️︱SECURITY & LOGS',
              channels: [
                { name: '🎫︱linea-diretta-staff', type: 'text', topic: 'Ticket di sicurezza', sentryModule: 'ticket_panel' },
                { name: '🛡️︱registri-blindati', type: 'text', topic: 'Log di sicurezza e automod', sentryModule: 'moderation_logs', overwrites: [{ role: '@everyone', deny: ['ViewChannel'] }] }
              ]
            }
          ]
        }
      }
    };
  },

  // === 2. AI Structure Generation using Llama 70B ===
  async generateStructureWithAI(userPrompt, archetypeHint = null) {
    const systemPrompt = loadArchitectPrompt();

    const userMsg = "Progetta una struttura completa di server Discord per Sentry.\n\nRichiesta utente: " +
      JSON.stringify(userPrompt) + (archetypeHint ? ("\nStile suggerito: " + archetypeHint) : "") +
      "\n\nRestituisci ESCLUSIVAMENTE un JSON valido.";

    const messages = [
      {
        role: 'user',
        content: userMsg
      }
    ];

    try {
      const rawResponse = await AIManager.getAIResponse(messages, systemPrompt);
      if (!rawResponse) {
        throw new Error('Nessuna risposta ricevuta dal modello AI.');
      }

      let cleanJson = rawResponse.trim();
      const codeBlockMatch = cleanJson.match(/```(?:json)?([\s\S]*?)```/i);
      if (codeBlockMatch) {
        cleanJson = codeBlockMatch[1].trim();
      }

      const parsed = JSON.parse(cleanJson);
      if (!parsed.categories || !Array.isArray(parsed.categories)) {
        throw new Error('La struttura generata non contiene un array valido di categorie.');
      }

      return { success: true, structure: parsed };
    } catch (err) {
      console.error('[ServerArchitect] Errore parsing AI response:', err.message);
      const fallback = JSON.parse(JSON.stringify(this.getPrebuiltTemplates().medieval.structure));
      fallback.description = 'Struttura adattata per: "' + userPrompt + '"';
      return { success: true, structure: fallback, note: 'Usato template di fallback per garantire un JSON valido.' };
    }
  },

  // === 3. Execution Engine: Build on Discord with Rate-Limiting & Auto-Binding ===
  async buildServer(guild, structure, options = {}) {
    const { cleanMode = false, onProgress = () => {} } = options;
    const results = {
      rolesCreated: 0,
      categoriesCreated: 0,
      channelsCreated: 0,
      modulesConfigured: [],
      logs: []
    };

    const log = (msg) => {
      console.log('[ServerArchitect:' + guild.name + '] ' + msg);
      results.logs.push(msg);
      onProgress(msg);
    };

    try {
      // 0. Clean Mode (if requested: delete existing channels)
      if (cleanMode) {
        log('🧹 Modalità Pulizia attiva: eliminazione canali esistenti...');
        const channels = Array.from(guild.channels.cache.values());
        for (const ch of channels) {
          try {
            await ch.delete('AI Server Studio: Clean Mode');
            await new Promise(r => setTimeout(r, 400));
          } catch (e) {
            console.warn('[ServerArchitect] Impossibile eliminare canale ' + ch.name + ': ' + e.message);
          }
        }
      }

      // 1. Create Roles
      log('👑 Creazione ruoli gerarchici su Discord...');
      const roleMap = new Map();
      roleMap.set('@everyone', guild.roles.everyone.id);

      for (const roleDef of structure.roles || []) {
        try {
          const perms = (roleDef.permissions || []).map(p => PermissionFlagsBits[p] || PermissionsBitField.Flags[p]).filter(Boolean);
          const createdRole = await guild.roles.create({
            name: roleDef.name,
            color: roleDef.color || '#94a3b8',
            hoist: Boolean(roleDef.hoist),
            permissions: perms.length > 0 ? perms : undefined,
            reason: 'Sentry AI Server Studio'
          });
          roleMap.set(roleDef.name, createdRole.id);
          results.rolesCreated++;
          log('  ✓ Ruolo creato: ' + roleDef.name);
          await new Promise(r => setTimeout(r, 450));
        } catch (e) {
          console.error('[ServerArchitect] Errore creazione ruolo ' + roleDef.name + ':', e.message);
        }
      }

      // 2. Track Created Module Channels for Auto-Binding
      const boundModules = {
        fishChannelId: null,
        blackjackChannelId: null,
        countingChannelId: null,
        welcomerChannelId: null,
        moderationLogChannelId: null,
        tempVoiceMasterId: null,
        tempVoiceCategoryId: null,
        tempVoiceHubId: null,
        ticketPanelId: null,
        ticketCategoryId: null
      };

      // 3. Create Categories and Channels
      log('📁 Creazione categorie e canali con permessi blindati...');
      for (const catDef of structure.categories || []) {
        try {
          const category = await guild.channels.create({
            name: catDef.name,
            type: ChannelType.GuildCategory,
            reason: 'Sentry AI Server Studio'
          });
          results.categoriesCreated++;
          log('📁 Categoria creata: ' + catDef.name);

          if (catDef.sentryModule === 'temp_voice_category' || catDef.isTempCategory) {
            boundModules.tempVoiceCategoryId = category.id;
          }
          if (catDef.sentryModule === 'ticket_category') {
            boundModules.ticketCategoryId = category.id;
          }

          await new Promise(r => setTimeout(r, 500));

          // Channels in Category
          for (const chDef of catDef.channels || []) {
            try {
              const isVoice = chDef.type === 'voice';
              const overwrites = [];

              // Translate overwrites
              if (chDef.overwrites && Array.isArray(chDef.overwrites)) {
                for (const ow of chDef.overwrites) {
                  const targetId = roleMap.get(ow.role) || roleMap.get('@everyone');
                  const allow = (ow.allow || []).map(p => PermissionFlagsBits[p] || PermissionsBitField.Flags[p]).filter(Boolean);
                  const deny = (ow.deny || []).map(p => PermissionFlagsBits[p] || PermissionsBitField.Flags[p]).filter(Boolean);
                  overwrites.push({ id: targetId, allow, deny });
                }
              }

              const createdChan = await guild.channels.create({
                name: chDef.name,
                type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
                parent: category.id,
                topic: chDef.topic || '',
                userLimit: isVoice && chDef.userLimit !== undefined ? chDef.userLimit : undefined,
                permissionOverwrites: overwrites.length > 0 ? overwrites : undefined,
                reason: 'Sentry AI Server Studio'
              });

              results.channelsCreated++;
              log('  ' + (isVoice ? '🔊' : '💬') + ' Canale creato: ' + chDef.name);

              // Module Binding Registration
              const mod = chDef.sentryModule;
              if (mod === 'fish') boundModules.fishChannelId = createdChan.id;
              if (mod === 'blackjack') boundModules.blackjackChannelId = createdChan.id;
              if (mod === 'counting') boundModules.countingChannelId = createdChan.id;
              if (mod === 'welcomer') boundModules.welcomerChannelId = createdChan.id;
              if (mod === 'moderation_logs') boundModules.moderationLogChannelId = createdChan.id;
              if (mod === 'temp_voice_master') boundModules.tempVoiceMasterId = createdChan.id;
              if (mod === 'temp_voice_hub') boundModules.tempVoiceHubId = createdChan.id;
              if (mod === 'ticket_panel') boundModules.ticketPanelId = createdChan.id;

              await new Promise(r => setTimeout(r, 500));
            } catch (ce) {
              console.error('[ServerArchitect] Errore creazione canale ' + chDef.name + ':', ce.message);
            }
          }
        } catch (catErr) {
          console.error('[ServerArchitect] Errore creazione categoria ' + catDef.name + ':', catErr.message);
        }
      }

      // 4. Auto-Binding & Initialization in Sentry Database
      log('⚡ Auto-Binding e configurazione istantanea dei moduli Sentry...');

      // A. Temp Channels
      if (boundModules.tempVoiceMasterId || boundModules.tempVoiceCategoryId || boundModules.tempVoiceHubId) {
        DatabaseHelper.updateTempChannelConfig(guild.id, {
          enabled: 1,
          voice_generator_id: boundModules.tempVoiceMasterId || undefined,
          category_id: boundModules.tempVoiceCategoryId || undefined,
          panel_channel_id: boundModules.tempVoiceHubId || undefined
        });
        results.modulesConfigured.push('Stanze Vocali Temporanee');
        log('  ✓ Modulo Stanze Vocali Temporanee configurato');

        if (boundModules.tempVoiceHubId) {
          await TempChannelManager.sendHubPanel(guild, boundModules.tempVoiceHubId).catch(() => {});
        }
      }

      // B. Welcomer
      if (boundModules.welcomerChannelId) {
        DatabaseHelper.updateWelcomerSettings(guild.id, {
          enabled: 1,
          channel_id: boundModules.welcomerChannelId
        });
        results.modulesConfigured.push('Welcomer & Arrivi');
        log('  ✓ Modulo Welcomer configurato');
      }

      // C. Ticket System
      if (boundModules.ticketPanelId || boundModules.ticketCategoryId) {
        DatabaseHelper.updateTicketConfig(guild.id, {
          enabled: 1,
          channel_id: boundModules.ticketPanelId || undefined,
          category_id: boundModules.ticketCategoryId || undefined
        });
        results.modulesConfigured.push('Ticket System');
        log('  ✓ Modulo Ticket configurato');

        if (boundModules.ticketPanelId) {
          await TicketManager.sendTicketPanel(guild, boundModules.ticketPanelId).catch(() => {});
        }
      }

      // D. Fishing RPG
      if (boundModules.fishChannelId) {
        DatabaseHelper.updateGuildSettings(guild.id, { fish_channel_id: boundModules.fishChannelId });
        results.modulesConfigured.push('Pesca RPG');
        log('  ✓ Modulo Pesca RPG configurato');
        await FishingManager.sendFishingPanel(guild, boundModules.fishChannelId).catch(() => {});
      }

      // E. Blackjack Table
      if (boundModules.blackjackChannelId) {
        DatabaseHelper.updateGuildSettings(guild.id, { blackjack_channel_id: boundModules.blackjackChannelId });
        results.modulesConfigured.push('Tavolo Blackjack');
        log('  ✓ Modulo Tavolo Blackjack configurato');
        await BlackjackManager.sendBlackjackPanel(guild, boundModules.blackjackChannelId).catch(() => {});
      }

      // F. Counting Game
      if (boundModules.countingChannelId) {
        DatabaseHelper.updateGuildSettings(guild.id, { counting_channel_id: boundModules.countingChannelId });
        results.modulesConfigured.push('Gioco del Conteggio');
        log('  ✓ Modulo Counting Game configurato');
      }

      // G. Moderation Logs
      if (boundModules.moderationLogChannelId) {
        DatabaseHelper.updateGuildSettings(guild.id, { log_channel_id: boundModules.moderationLogChannelId });
        results.modulesConfigured.push('Registri Moderazione');
        log('  ✓ Modulo Registri Moderazione configurato');
      }

      log('🎉 Costruzione del server e auto-binding completati con successo!');
      return { success: true, results };
    } catch (err) {
      console.error('[ServerArchitect] Errore critico durante la costruzione del server:', err);
      return { success: false, error: err.message, results };
    }
  }
};
