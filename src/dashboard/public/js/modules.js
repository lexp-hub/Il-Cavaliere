
(function () {
  window.loadModuleData = async function (guildId) {
    if (!guildId) return;

    await Promise.allSettled([
      loadMasterModules(guildId),
      loadAIData(guildId),
      loadPartnershipData(guildId),
      loadReactionRoles(guildId),
      loadWelcomerData(guildId),
      loadAutoresponders(guildId),
      loadAutomodData(guildId),
      loadTicketsData(guildId),
      loadGiveawaysAndLeveling(guildId),
      loadEmojiStats(guildId)
    ]);
  };

  async function loadMasterModules(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/settings`);
      if (!res.ok) return;
      const settings = await res.json();

      const grid = document.getElementById('modules-toggle-grid');
      if (!grid) return;

      const moduleLabels = {
        ai: { name: '🤖 Il Cavaliere AI', desc: 'Chat neurale e ricerca web' },
        partnerships: { name: '🤝 Partnership System', desc: 'Verifica inviti e annunci' },
        embeds: { name: '🎨 Live Embeds', desc: 'Invio messaggi avanzati' },
        reaction_roles: { name: '🎭 Reaction Roles', desc: 'Pulsanti e ruoli automatici' },
        welcomer: { name: '👋 Welcomer & DM', desc: 'Benvenuto e auto-role' },
        autoresponder: { name: '⚡ Auto-Responder', desc: 'Trigger e auto-reaction' },
        moderation: { name: '🛡️ AutoMod & Sanzioni', desc: 'Protezione anti-spam e log' },
        tickets: { name: '🎫 Ticket Support', desc: 'Canali privati di assistenza' },
        giveaways: { name: '🎉 Giveaways', desc: 'Concorsi e timer' },
        leveling: { name: '⭐ XP & Leveling', desc: 'Classifiche e premi livello' },
        starboard: { name: '🌟 Starboard', desc: 'Bacheca messaggi stellati' }
      };

      grid.innerHTML = '';
      const enabledMap = settings.modules_enabled || {};

      Object.keys(moduleLabels).forEach(key => {
        const info = moduleLabels[key];
        const isEnabled = enabledMap[key] !== false;

        const card = document.createElement('div');
        card.className = 'p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between';
        card.innerHTML = `
          <div>
            <p class="font-bold text-xs text-white">${info.name}</p>
            <p class="text-[11px] text-slate-400">${info.desc}</p>
          </div>
          <label class="switch">
            <input type="checkbox" class="master-module-toggle" data-module="${key}" ${isEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        `;
        grid.appendChild(card);
      });

      document.querySelectorAll('.master-module-toggle').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
          const modKey = e.target.getAttribute('data-module');
          enabledMap[modKey] = e.target.checked;

          await fetch(`/api/guilds/${guildId}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modules_enabled: enabledMap })
          });

          window.showToast(`Modulo ${moduleLabels[modKey].name} ${e.target.checked ? 'attivato' : 'disattivato'}.`);
        });
      });
    } catch (e) {
      console.error('Error loading master modules:', e);
    }
  }

  async function loadAIData(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/ai`);
      if (!res.ok) return;
      const data = await res.json();

      const config = data.config || {};
      const promptEl = document.getElementById('ai-system-prompt');
      const modelEl = document.getElementById('ai-model');
      const enabledEl = document.getElementById('ai-enabled');
      const searchEl = document.getElementById('ai-web-search');

      if (promptEl) promptEl.value = config.system_prompt || data.defaultPrompt || '';
      if (modelEl && config.model) modelEl.value = config.model;
      if (enabledEl) enabledEl.checked = Boolean(config.enabled);
      if (searchEl) searchEl.checked = Boolean(config.web_search_enabled);

      const ovModel = document.getElementById('ov-ai-model');
      if (ovModel) {
        ovModel.textContent = config.model?.includes('llama-3.3') ? 'Llama 3.3 70B' : 'Cloudflare AI';
      }
    } catch (e) {
      console.error('Error loading AI config:', e);
    }
  }

  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      const promptEl = document.getElementById('ai-system-prompt');
      if (!promptEl) return;

      if (preset === 'cynical') {
        promptEl.value = "Sei 'Il Cavaliere', un analista cinico, spietato e allergico all'ipocrisia umano-sociale. Smonti la propaganda, i ragionamenti fallati e la mediocrità di chiunque ti si ponga davanti — attaccando senza filtri idee, incoerenze e dignità intellettuale.\n\nRegole:\n- Stile secco, sarcastico e passivo-aggressivo.\n- Zero pietà o sottomissione.\n- Rispondi SEMPRE in massimo 300 caratteri.";
      } else if (preset === 'noble') {
        promptEl.value = "Sei 'Il Cavaliere', un nobile guardiano d'onore e protettore dei reami Discord. Rispondi con tono fiero, solenne ed epico, dispensando consigli saggi ed elevati per il bene del server. Massimo 300 caratteri.";
      } else if (preset === 'technical') {
        promptEl.value = "Sei 'Il Cavaliere', un'intelligenza artificiale focalizzata su precisione logica, programmazione e analisi tecnica oggettiva. Rispondi in modo asciutto, preciso ed impeccabile.";
      }
      window.showToast(`Preset applicato all'editor! Ricordati di salvare.`);
    });
  });

  const btnSaveAI = document.getElementById('btn-save-ai-config');
  if (btnSaveAI) {
    btnSaveAI.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      if (!guildId) return;

      const payload = {
        enabled: document.getElementById('ai-enabled')?.checked,
        model: document.getElementById('ai-model')?.value,
        web_search_enabled: document.getElementById('ai-web-search')?.checked,
        system_prompt: document.getElementById('ai-system-prompt')?.value
      };

      const res = await fetch(`/api/guilds/${guildId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        window.showToast('Configurazione de Il Cavaliere AI salvata!');
      } else {
        window.showToast('Errore nel salvataggio AI.', 'error');
      }
    });
  }

  const aiChatForm = document.getElementById('ai-chat-form');
  const aiChatInput = document.getElementById('ai-chat-input');
  const aiChatHistory = document.getElementById('ai-chat-history');

  if (aiChatForm) {
    aiChatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = aiChatInput?.value?.trim();
      if (!message) return;

      const guildId = window.AppState.currentGuildId || '123456789012345678';
      aiChatInput.value = '';

      const userBubble = document.createElement('div');
      userBubble.className = 'flex justify-end';
      userBubble.innerHTML = `
        <div class="p-2.5 rounded-2xl bg-purple-600 text-xs text-white max-w-[85%] leading-relaxed shadow">
          ${message}
        </div>
      `;
      aiChatHistory.appendChild(userBubble);
      aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

      const botLoading = document.createElement('div');
      botLoading.className = 'flex gap-2.5';
      botLoading.innerHTML = `
        <div class="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-xs shrink-0 font-bold">🛡️</div>
        <div class="p-2.5 rounded-2xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-300 italic flex items-center gap-1.5">
          <i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Il Cavaliere sta analizzando...
        </div>
      `;
      aiChatHistory.appendChild(botLoading);
      lucide.createIcons();
      aiChatHistory.scrollTop = aiChatHistory.scrollHeight;

      try {
        const customPrompt = document.getElementById('ai-system-prompt')?.value;
        const model = document.getElementById('ai-model')?.value;

        const res = await fetch(`/api/guilds/${guildId}/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, customPrompt, model })
        });

        const data = await res.json();
        botLoading.remove();

        const botReply = document.createElement('div');
        botReply.className = 'flex gap-2.5';
        botReply.innerHTML = `
          <div class="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-xs shrink-0 font-bold">🛡️</div>
          <div class="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/20 text-xs text-slate-200 leading-relaxed shadow">
            ${data.response || 'Elaborazione fallita.'}
          </div>
        `;
        aiChatHistory.appendChild(botReply);
        aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
      } catch (err) {
        botLoading.remove();
        window.showToast('Errore di connessione con l\'IA.', 'error');
      }
    });
  }

  const btnClearPlayground = document.getElementById('btn-clear-playground');
  if (btnClearPlayground && aiChatHistory) {
    btnClearPlayground.addEventListener('click', () => {
      aiChatHistory.innerHTML = `
        <div class="flex gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-xs shrink-0 font-bold">🛡️</div>
          <div class="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/20 text-xs text-slate-200 leading-relaxed">
            Memoria playground ripulita. Fai pure una nuova domanda.
          </div>
        </div>
      `;
    });
  }

  async function loadPartnershipData(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/partnerships`);
      if (!res.ok) return;
      const data = await res.json();

      const config = data.config || {};
      const chEl = document.getElementById('part-channel');
      const pingEl = document.getElementById('part-ping-role');
      const minEl = document.getElementById('part-min-members');
      const cdEl = document.getElementById('part-cooldown');
      const enEl = document.getElementById('part-enabled');

      if (chEl && config.channel_id) chEl.value = config.channel_id;
      if (pingEl && config.ping_role_id) pingEl.value = config.ping_role_id;
      if (minEl) minEl.value = config.min_members ?? 50;
      if (cdEl) cdEl.value = config.cooldown_minutes ?? 60;
      if (enEl) enEl.checked = Boolean(config.enabled);

      const tbody = document.getElementById('part-recent-table');
      if (tbody) {
        tbody.innerHTML = '';
        const list = data.partnerships || [];
        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-slate-500">Nessuna partnership registrata finora.</td></tr>';
        } else {
          list.forEach(p => {
            const tr = document.createElement('tr');
            const dateStr = new Date(p.timestamp * 1000).toLocaleDateString('it-IT');
            tr.innerHTML = `
              <td class="py-2.5 font-medium text-white">${p.partner_name || 'Server Partner'}</td>
              <td class="py-2.5 text-purple-400">&lt;@${p.rep_user_id || 'Staff'}&gt;</td>
              <td class="py-2.5"><span class="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">${p.partner_count || 0}</span></td>
              <td class="py-2.5 text-slate-400">${dateStr}</td>
            `;
            tbody.appendChild(tr);
          });
        }
      }

      const lbDiv = document.getElementById('part-leaderboard-list');
      if (lbDiv) {
        lbDiv.innerHTML = '';
        const lb = data.stats?.leaderboard || [];
        if (lb.length === 0) {
          lbDiv.innerHTML = '<p class="text-slate-500 text-center py-2">Nessun partner manager attivo.</p>';
        } else {
          lb.forEach((entry, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            const item = document.createElement('div');
            item.className = 'p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-between';
            item.innerHTML = `
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm">${medal}</span>
                <span class="font-mono text-xs text-slate-300">&lt;@${entry.rep_user_id}&gt;</span>
              </div>
              <span class="font-bold text-xs text-purple-400">${entry.count} fatte</span>
            `;
            lbDiv.appendChild(item);
          });
        }
      }

      const ovPart = document.getElementById('ov-partnerships');
      if (ovPart) ovPart.textContent = data.stats?.total || '0';
    } catch (e) {
      console.error('Error loading partnerships:', e);
    }
  }

  const btnSavePart = document.getElementById('btn-save-partner-config');
  if (btnSavePart) {
    btnSavePart.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      if (!guildId) return;

      const payload = {
        channel_id: document.getElementById('part-channel')?.value || null,
        ping_role_id: document.getElementById('part-ping-role')?.value || null,
        min_members: parseInt(document.getElementById('part-min-members')?.value || '0', 10),
        cooldown_minutes: parseInt(document.getElementById('part-cooldown')?.value || '60', 10),
        enabled: document.getElementById('part-enabled')?.checked
      };

      const res = await fetch(`/api/guilds/${guildId}/partnerships/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        window.showToast('Configurazione Partnership salvata!');
      } else {
        window.showToast('Errore durante il salvataggio.', 'error');
      }
    });
  }

  const btnQuickPart = document.getElementById('btn-quick-partner');
  if (btnQuickPart) {
    btnQuickPart.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const invite = document.getElementById('part-quick-invite')?.value?.trim();
      const notes = document.getElementById('part-quick-notes')?.value?.trim();

      if (!invite) return window.showToast('Inserisci un link di invito valido.', 'error');

      const res = await fetch(`/api/guilds/${guildId}/partnerships/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite, notes })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        window.showToast('Partnership pubblicata con successo!');
        document.getElementById('part-quick-invite').value = '';
        document.getElementById('part-quick-notes').value = '';
        await loadPartnershipData(guildId);
      } else {
        window.showToast(data.error || 'Errore nella pubblicazione.', 'error');
      }
    });
  }

  async function loadReactionRoles(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/reaction-roles`);
      if (!res.ok) return;
      const list = await res.json();

      const container = document.getElementById('rr-list-container');
      if (!container) return;

      container.innerHTML = '';
      if (list.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-xs text-center py-4">Nessun reaction role attivo.</p>';
      } else {
        list.forEach(item => {
          const card = document.createElement('div');
          card.className = 'p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between';
          card.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="text-base">${item.emoji || '🔘'}</span>
              <div>
                <p class="font-bold text-xs text-white">${item.label || 'Ruolo'}</p>
                <p class="text-[11px] text-slate-400">Ruolo: &lt;@&amp;${item.role_id}&gt; • Canale: &lt;#${item.channel_id}&gt;</p>
              </div>
            </div>
            <button class="btn-danger text-xs py-1 px-2.5" onclick="deleteReactionRole(${item.id})">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          `;
          container.appendChild(card);
        });
        lucide.createIcons();
      }

      const ovRR = document.getElementById('ov-rr');
      if (ovRR) ovRR.textContent = list.length;
    } catch (e) {
      console.error('Error loading reaction roles:', e);
    }
  }

  window.deleteReactionRole = async function(id) {
    const guildId = window.AppState.currentGuildId;
    await fetch(`/api/guilds/${guildId}/reaction-roles/${id}`, { method: 'DELETE' });
    window.showToast('Reaction role eliminato.');
    await loadReactionRoles(guildId);
  };

  const btnCreateRR = document.getElementById('btn-create-rr');
  if (btnCreateRR) {
    btnCreateRR.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const channelId = document.getElementById('rr-channel')?.value;
      const roleId = document.getElementById('rr-role')?.value;
      const style = document.getElementById('rr-style')?.value || 'Primary';
      const label = document.getElementById('rr-label')?.value || 'Ruolo';
      const emoji = document.getElementById('rr-emoji')?.value || '🔘';
      const title = document.getElementById('rr-title')?.value || '🎭 Selezione Ruolo';

      if (!channelId || !roleId) return window.showToast('Seleziona canale e ruolo.', 'error');

      const res = await fetch(`/api/guilds/${guildId}/reaction-roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, roleId, style, label, emoji, title })
      });

      if (res.ok) {
        window.showToast('Pannello Reaction Role creato!');
        await loadReactionRoles(guildId);
      } else {
        window.showToast('Errore creazione reaction role.', 'error');
      }
    });
  }

  async function loadWelcomerData(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/welcomer`);
      if (!res.ok) return;
      const config = await res.json();

      const enWel = document.getElementById('wel-enabled');
      const chWel = document.getElementById('wel-channel');
      const arWel = document.getElementById('wel-autorole-user');
      const msgWel = document.getElementById('wel-message');
      const dmEnWel = document.getElementById('wel-dm-enabled');
      const dmMsgWel = document.getElementById('wel-dm-message');
      const lvEnWel = document.getElementById('wel-leave-enabled');
      const lvChWel = document.getElementById('wel-leave-channel');
      const lvMsgWel = document.getElementById('wel-leave-message');

      if (enWel) enWel.checked = Boolean(config.welcome_enabled);
      if (chWel && config.welcome_channel_id) chWel.value = config.welcome_channel_id;
      if (arWel && config.auto_role_user) arWel.value = config.auto_role_user;
      if (msgWel && config.welcome_message) msgWel.value = config.welcome_message;
      if (dmEnWel) dmEnWel.checked = Boolean(config.welcome_dm_enabled);
      if (dmMsgWel && config.welcome_dm_message) dmMsgWel.value = config.welcome_dm_message;
      if (lvEnWel) lvEnWel.checked = Boolean(config.leave_enabled);
      if (lvChWel && config.leave_channel_id) lvChWel.value = config.leave_channel_id;
      if (lvMsgWel && config.leave_message) lvMsgWel.value = config.leave_message;
    } catch (e) {
      console.error('Error loading welcomer:', e);
    }
  }

  const btnSaveWelcomer = document.getElementById('btn-save-welcomer');
  if (btnSaveWelcomer) {
    btnSaveWelcomer.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const payload = {
        welcome_enabled: document.getElementById('wel-enabled')?.checked,
        welcome_channel_id: document.getElementById('wel-channel')?.value || null,
        auto_role_user: document.getElementById('wel-autorole-user')?.value || null,
        welcome_message: document.getElementById('wel-message')?.value,
        welcome_dm_enabled: document.getElementById('wel-dm-enabled')?.checked,
        welcome_dm_message: document.getElementById('wel-dm-message')?.value,
        leave_enabled: document.getElementById('wel-leave-enabled')?.checked,
        leave_channel_id: document.getElementById('wel-leave-channel')?.value || null,
        leave_message: document.getElementById('wel-leave-message')?.value
      };

      const res = await fetch(`/api/guilds/${guildId}/welcomer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) window.showToast('Impostazioni Welcomer salvate!');
      else window.showToast('Errore salvataggio Welcomer.', 'error');
    });
  }

  const btnTestWelcomer = document.getElementById('btn-test-welcomer');
  if (btnTestWelcomer) {
    btnTestWelcomer.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const res = await fetch(`/api/guilds/${guildId}/welcomer/test`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) window.showToast('Messaggio di benvenuto inviato!');
      else window.showToast(data.error || 'Errore invio test.', 'error');
    });
  }

  async function loadAutoresponders(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders`);
      if (!res.ok) return;
      const data = await res.json();

      const container = document.getElementById('ar-list-container');
      if (!container) return;

      container.innerHTML = '';
      const list = data.autoresponders || [];

      if (list.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-xs text-center py-4">Nessun autoresponder configurato.</p>';
      } else {
        list.forEach(ar => {
          const card = document.createElement('div');
          card.className = 'p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between';
          card.innerHTML = `
            <div>
              <p class="font-bold text-xs text-white">Trigger: <code class="text-purple-300 font-mono">${ar.trigger}</code> <span class="text-[10px] text-slate-400 font-normal">(${ar.match_type})</span></p>
              <p class="text-[11px] text-slate-300 mt-0.5">Risposta: ${ar.response_text || 'Reazione Emoji'}</p>
            </div>
            <button class="btn-danger text-xs py-1 px-2.5" onclick="deleteAutoresponder(${ar.id})">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          `;
          container.appendChild(card);
        });
        lucide.createIcons();
      }
    } catch (e) {
      console.error('Error loading autoresponders:', e);
    }
  }

  window.deleteAutoresponder = async function(id) {
    const guildId = window.AppState.currentGuildId;
    await fetch(`/api/guilds/${guildId}/autoresponders/${id}`, { method: 'DELETE' });
    window.showToast('Risposta automatica eliminata.');
    await loadAutoresponders(guildId);
  };

  const btnAddAR = document.getElementById('btn-add-autoresponder');
  if (btnAddAR) {
    btnAddAR.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const trigger = document.getElementById('ar-trigger')?.value?.trim();
      const matchType = document.getElementById('ar-match')?.value || 'CONTAINS';
      const response = document.getElementById('ar-response')?.value?.trim();
      const reactionsRaw = document.getElementById('ar-reactions')?.value?.trim();

      if (!trigger) return window.showToast('Inserisci una parola chiave.', 'error');
      const reactions = reactionsRaw ? reactionsRaw.split(/[, ]+/).filter(Boolean) : [];

      const res = await fetch(`/api/guilds/${guildId}/autoresponders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger, match_type: matchType, response_text: response, auto_reactions: reactions, enabled: true })
      });

      if (res.ok) {
        window.showToast('Risposta automatica aggiunta!');
        document.getElementById('ar-trigger').value = '';
        document.getElementById('ar-response').value = '';
        document.getElementById('ar-reactions').value = '';
        await loadAutoresponders(guildId);
      } else {
        window.showToast('Errore creazione.', 'error');
      }
    });
  }

  async function loadAutomodData(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/automod`);
      if (!res.ok) return;
      const data = await res.json();

      const config = data.config || {};
      const invEl = document.getElementById('am-invite');
      const lnkEl = document.getElementById('am-link');
      const spmEl = document.getElementById('am-spam');
      const cpsEl = document.getElementById('am-caps');
      const bwEl = document.getElementById('am-badwords');

      if (invEl) invEl.checked = Boolean(config.anti_invite);
      if (lnkEl) lnkEl.checked = Boolean(config.anti_link);
      if (spmEl) spmEl.checked = Boolean(config.anti_spam);
      if (cpsEl) cpsEl.checked = Boolean(config.anti_caps);
      if (bwEl && Array.isArray(config.bad_words)) bwEl.value = config.bad_words.join(', ');

      const tbody = document.getElementById('am-cases-table');
      if (tbody) {
        tbody.innerHTML = '';
        const cases = data.recentCases || [];
        if (cases.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-slate-500">Nessuna sanzione registrata.</td></tr>';
        } else {
          cases.forEach(c => {
            const tr = document.createElement('tr');
            const dateStr = new Date(c.timestamp * 1000).toLocaleString('it-IT');
            tr.innerHTML = `
              <td class="py-2 font-mono text-purple-400">#${c.id}</td>
              <td class="py-2"><span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">${c.action_type}</span></td>
              <td class="py-2">&lt;@${c.user_id}&gt;</td>
              <td class="py-2 text-slate-400">&lt;@${c.moderator_id}&gt;</td>
              <td class="py-2 text-slate-300">${c.reason || '-'}</td>
              <td class="py-2 text-slate-500">${dateStr}</td>
            `;
            tbody.appendChild(tr);
          });
        }
      }
    } catch (e) {
      console.error('Error loading automod:', e);
    }
  }

  const btnSaveAutomod = document.getElementById('btn-save-automod');
  if (btnSaveAutomod) {
    btnSaveAutomod.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const badWordsRaw = document.getElementById('am-badwords')?.value || '';
      const badWords = badWordsRaw.split(/[, ]+/).map(w => w.trim()).filter(Boolean);

      const payload = {
        anti_invite: document.getElementById('am-invite')?.checked,
        anti_link: document.getElementById('am-link')?.checked,
        anti_spam: document.getElementById('am-spam')?.checked,
        anti_caps: document.getElementById('am-caps')?.checked,
        bad_words: badWords
      };

      const res = await fetch(`/api/guilds/${guildId}/automod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) window.showToast('Regole AutoMod salvate!');
      else window.showToast('Errore salvataggio AutoMod.', 'error');
    });
  }

  async function loadTicketsData(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets`);
      if (!res.ok) return;
      const data = await res.json();

      const container = document.getElementById('tk-list-container');
      if (!container) return;

      container.innerHTML = '';
      const tickets = data.tickets || [];

      if (tickets.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-xs text-center py-4">Nessun ticket recente.</p>';
      } else {
        tickets.forEach(tk => {
          const card = document.createElement('div');
          const dateStr = new Date(tk.created_at * 1000).toLocaleString('it-IT');
          const badgeClass = tk.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300';
          card.className = 'p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between';
          card.innerHTML = `
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-white">Ticket #${tk.id}</span>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeClass}">${tk.status}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">Creato da &lt;@${tk.user_id}&gt; • ${dateStr}</p>
            </div>
          `;
          container.appendChild(card);
        });
      }
    } catch (e) {
      console.error('Error loading tickets:', e);
    }
  }

  const btnCreateTicketPanel = document.getElementById('btn-create-ticket-panel');
  if (btnCreateTicketPanel) {
    btnCreateTicketPanel.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const channelId = document.getElementById('tk-channel')?.value;
      const categoryId = document.getElementById('tk-category')?.value || null;
      const supportRoleId = document.getElementById('tk-support-role')?.value || null;
      const title = document.getElementById('tk-title')?.value;
      const buttonLabel = document.getElementById('tk-btn-label')?.value;
      const buttonEmoji = document.getElementById('tk-btn-emoji')?.value;

      if (!channelId) return window.showToast('Seleziona un canale.', 'error');

      const res = await fetch(`/api/guilds/${guildId}/tickets/panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, categoryId, supportRoleId, title, buttonLabel, buttonEmoji })
      });

      if (res.ok) {
        window.showToast('Pannello Ticket inviato!');
        await loadTicketsData(guildId);
      } else {
        window.showToast('Errore invio pannello.', 'error');
      }
    });
  }

  async function loadGiveawaysAndLeveling(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/leveling`);
      if (!res.ok) return;
      const data = await res.json();

      const config = data.config || {};
      const enLvl = document.getElementById('lvl-enabled');
      const rateLvl = document.getElementById('lvl-rate');
      const chLvl = document.getElementById('lvl-channel');

      if (enLvl) enLvl.checked = Boolean(config.enabled);
      if (rateLvl) rateLvl.value = config.xp_rate || 1.0;
      if (chLvl && config.channel_id) chLvl.value = config.channel_id;
    } catch (e) {
      console.error('Error loading giveaways and leveling:', e);
    }
  }

  const btnStartGiveaway = document.getElementById('btn-start-giveaway');
  if (btnStartGiveaway) {
    btnStartGiveaway.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const channelId = document.getElementById('ga-channel')?.value;
      const prize = document.getElementById('ga-prize')?.value?.trim();
      const durationStr = document.getElementById('ga-duration')?.value?.trim();
      const winners = parseInt(document.getElementById('ga-winners')?.value || '1', 10);

      if (!channelId || !prize) return window.showToast('Compila tutti i campi.', 'error');

      const match = durationStr.match(/^(\d+)(s|m|h|d)$/i);
      let durationSec = 3600;
      if (match) {
        const num = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        if (unit === 's') durationSec = num;
        else if (unit === 'm') durationSec = num * 60;
        else if (unit === 'h') durationSec = num * 3600;
        else if (unit === 'd') durationSec = num * 86400;
      }

      const res = await fetch(`/api/guilds/${guildId}/giveaways/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, prize, durationSeconds: durationSec, winnerCount: winners })
      });

      if (res.ok) window.showToast(`Giveaway per ${prize} avviato!`);
      else window.showToast('Errore avvio giveaway.', 'error');
    });
  }

  async function loadEmojiStats(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/emoji-stats`);
      if (!res.ok) return;
      const stats = await res.json();

      const tbody = document.getElementById('emoji-stats-table');
      if (!tbody) return;

      tbody.innerHTML = '';
      if (stats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-500">Nessun dato registrato.</td></tr>';
      } else {
        stats.forEach((s, idx) => {
          const tr = document.createElement('tr');
          const dateStr = new Date(s.last_used * 1000).toLocaleString('it-IT');
          tr.innerHTML = `
            <td class="py-2.5 font-bold font-mono text-purple-400">#${idx + 1}</td>
            <td class="py-2.5 font-medium text-white">:${s.emoji_name}:</td>
            <td class="py-2.5"><span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold">${s.is_animated ? 'GIF' : 'PNG'}</span></td>
            <td class="py-2.5 font-mono text-cyan-400 font-bold">${s.use_count}</td>
            <td class="py-2.5 text-slate-400">${dateStr}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (e) {
      console.error('Error loading emoji stats:', e);
    }
  }

  const btnSaveAll = document.getElementById('btn-save-all');
  if (btnSaveAll) {
    btnSaveAll.addEventListener('click', () => {
      const guildId = window.AppState.currentGuildId;
      if (guildId) window.loadModuleData(guildId);
      window.showToast('Impostazioni sincronizzate!');
    });
  }
})();
