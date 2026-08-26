
(function () {
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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
      loadPresentationsData(guildId),
      loadMinigamesData(guildId),
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
        card.className = 'p-3.5 rounded-xl bg-white/80 border border-slate-300 shadow-sm flex items-center justify-between';
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
        });
      });

      const prefixEl = document.getElementById('gen-prefix');
      const logEl = document.getElementById('gen-log-channel');
      if (prefixEl && settings.prefix) prefixEl.value = settings.prefix;
      if (logEl && settings.log_channel_id) logEl.value = settings.log_channel_id;

      if (prefixEl && !prefixEl.hasAttribute('data-bound')) {
        prefixEl.setAttribute('data-bound', 'true');
        prefixEl.addEventListener('change', async () => {
          await fetch(`/api/guilds/${guildId}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix: prefixEl.value })
          });
          window.showToast('Prefisso comandi salvato!');
        });
      }

      if (logEl && !logEl.hasAttribute('data-bound')) {
        logEl.setAttribute('data-bound', 'true');
        logEl.addEventListener('change', async () => {
          await fetch(`/api/guilds/${guildId}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ log_channel_id: logEl.value })
          });
          window.showToast('Canale Audit Log salvato!');
        });
      }
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
      const mgrEl = document.getElementById('part-manager-role');
      const minEl = document.getElementById('part-min-members');
      const cdEl = document.getElementById('part-cooldown');
      const enEl = document.getElementById('part-enabled');

      if (chEl && config.channel_id) chEl.value = config.channel_id;
      if (pingEl && config.ping_role_id) pingEl.value = config.ping_role_id;
      if (mgrEl && config.manager_role_id) mgrEl.value = config.manager_role_id;
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
            item.className = 'p-2.5 rounded-lg bg-white/80 border border-slate-300 shadow-sm flex items-center justify-between';
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
        manager_role_id: document.getElementById('part-manager-role')?.value || null,
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

  const btnSendPartnerPanel = document.getElementById('btn-send-partner-panel');
  if (btnSendPartnerPanel) {
    btnSendPartnerPanel.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const channelId = document.getElementById('part-channel')?.value;
      const title = document.getElementById('part-panel-title')?.value || '🤝 Sistema Partnership & Alleanze';
      const description = document.getElementById('part-panel-desc')?.value?.trim() || null;
      const image = document.getElementById('part-panel-image')?.value?.trim() || null;

      if (!channelId) return window.showToast('Seleziona un canale per inviare il pannello partnership.', 'error');

      try {
        btnSendPartnerPanel.disabled = true;
        btnSendPartnerPanel.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Invio in corso...';
        if (window.lucide) lucide.createIcons();

        const res = await fetch(`/api/guilds/${guildId}/partnerships/panel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId, title, description, image, color: '#ea580c' })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          window.showToast('Pannello Partnership con pulsante Form inviato su Discord con successo!');
        } else {
          window.showToast(`Errore invio pannello: ${data.error || 'Fallito'}`, 'error');
        }
      } catch (err) {
        window.showToast(`Errore: ${err.message}`, 'error');
      } finally {
        btnSendPartnerPanel.disabled = false;
        btnSendPartnerPanel.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5 text-red-600"></i> Invia Pannello nel Canale';
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  const btnQuickPart = document.getElementById('btn-quick-partner');
  if (btnQuickPart) {
    btnQuickPart.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const invite = document.getElementById('part-quick-invite')?.value?.trim();
      const banner = document.getElementById('part-quick-banner')?.value?.trim() || null;
      const notes = document.getElementById('part-quick-notes')?.value?.trim();

      if (!invite) return window.showToast('Inserisci un link o codice di invito valido.', 'error');

      try {
        btnQuickPart.disabled = true;
        btnQuickPart.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Pubblicazione in corso...';
        if (window.lucide) lucide.createIcons();

        const res = await fetch(`/api/guilds/${guildId}/partnerships/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invite, notes, banner })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          window.showToast('Partnership pubblicata con successo sul canale Discord!');
          document.getElementById('part-quick-invite').value = '';
          if (document.getElementById('part-quick-banner')) document.getElementById('part-quick-banner').value = '';
          document.getElementById('part-quick-notes').value = '';
          await loadPartnershipData(guildId);
        } else {
          window.showToast(data.error || 'Errore nella pubblicazione.', 'error');
        }
      } catch (err) {
        window.showToast(`Errore: ${err.message}`, 'error');
      } finally {
        btnQuickPart.disabled = false;
        btnQuickPart.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i> Pubblica Partnership';
        if (window.lucide) lucide.createIcons();
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
          card.className = 'p-3 rounded-xl bg-white/80 border border-slate-300 shadow-sm flex items-center justify-between';
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
          card.className = 'p-3 rounded-xl bg-white/80 border border-slate-300 shadow-sm flex items-center justify-between';
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

  function updateTicketPreview() {
    const title = document.getElementById('tk-title')?.value || '🎫 Centro Supporto & Assistenza';
    const desc = document.getElementById('tk-description')?.value || 'Clicca sul pulsante sottostante per aprire un ticket.';
    const color = document.getElementById('tk-color')?.value || '#dc2626';
    const image = document.getElementById('tk-image')?.value?.trim();
    const footer = document.getElementById('tk-footer')?.value || 'Il Cavaliere • Sistema Ticket';
    const btnLabel = document.getElementById('tk-btn-label')?.value || 'Apri Ticket';
    const btnEmoji = document.getElementById('tk-btn-emoji')?.value || '📩';
    const btnStyle = document.getElementById('tk-btn-style')?.value || 'Primary';

    const prevBox = document.getElementById('prev-tk-embed-box');
    const prevTitle = document.getElementById('prev-tk-title');
    const prevDesc = document.getElementById('prev-tk-desc');
    const prevImage = document.getElementById('prev-tk-image');
    const prevFooter = document.getElementById('prev-tk-footer-text');
    const prevBtn = document.getElementById('prev-tk-btn');
    const prevBtnLabel = document.getElementById('prev-tk-btn-label');
    const prevBtnEmoji = document.getElementById('prev-tk-btn-emoji');

    if (prevBox) prevBox.style.borderLeftColor = color;
    if (prevTitle) prevTitle.textContent = title;
    if (prevDesc) {
      prevDesc.innerHTML = window.parseDiscordMarkdown ? window.parseDiscordMarkdown(desc) : desc;
    }

    if (prevImage) {
      if (image) {
        prevImage.src = image;
        prevImage.classList.remove('hidden');
      } else {
        prevImage.src = '';
        prevImage.classList.add('hidden');
      }
    }

    if (prevFooter) prevFooter.textContent = footer;
    if (prevBtnLabel) prevBtnLabel.textContent = btnLabel;
    if (prevBtnEmoji) prevBtnEmoji.textContent = btnEmoji;

    if (prevBtn) {
      // Clear style classes
      prevBtn.className = 'px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 shadow transition-all';
      if (btnStyle === 'Primary') {
        prevBtn.classList.add('bg-[#5865F2]', 'text-white');
      } else if (btnStyle === 'Secondary') {
        prevBtn.classList.add('bg-slate-700', 'text-white');
      } else if (btnStyle === 'Success') {
        prevBtn.classList.add('bg-emerald-600', 'text-white');
      } else if (btnStyle === 'Danger') {
        prevBtn.classList.add('bg-rose-600', 'text-white');
      }
    }
  }

  ['tk-title', 'tk-description', 'tk-color', 'tk-color-hex', 'tk-image', 'tk-footer', 'tk-btn-label', 'tk-btn-emoji', 'tk-btn-style'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        if (id === 'tk-color') {
          const hexEl = document.getElementById('tk-color-hex');
          if (hexEl) hexEl.value = e.target.value;
        } else if (id === 'tk-color-hex') {
          const colEl = document.getElementById('tk-color');
          if (colEl && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) colEl.value = e.target.value;
        }
        updateTicketPreview();
      });
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', updateTicketPreview);
      }
    }
  });

  async function loadTicketsData(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets`);
      if (!res.ok) return;
      const data = await res.json();

      const container = document.getElementById('tk-list-container');
      if (container) {
        container.innerHTML = '';
        const tickets = data.tickets || [];

        if (tickets.length === 0) {
          container.innerHTML = '<p class="text-slate-500 text-xs text-center py-4">Nessun ticket recente.</p>';
        } else {
          tickets.forEach(tk => {
            const card = document.createElement('div');
            const dateStr = new Date(tk.created_at * 1000).toLocaleString('it-IT');
            const badgeClass = tk.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300';
            card.className = 'p-3 rounded-xl bg-white/80 border border-slate-300 shadow-sm flex items-center justify-between';
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
      }

      // If existing panel found, optionally preload
      const panel = data.panels?.[0];
      if (panel) {
        if (panel.title) document.getElementById('tk-title').value = panel.title;
        if (panel.description) document.getElementById('tk-description').value = panel.description;
        if (panel.color) {
          document.getElementById('tk-color').value = panel.color;
          document.getElementById('tk-color-hex').value = panel.color;
        }
        if (panel.image) document.getElementById('tk-image').value = panel.image;
        if (panel.footer) document.getElementById('tk-footer').value = panel.footer;
        if (panel.button_label) document.getElementById('tk-btn-label').value = panel.button_label;
        if (panel.button_emoji) document.getElementById('tk-btn-emoji').value = panel.button_emoji;
        if (panel.button_style) document.getElementById('tk-btn-style').value = panel.button_style;
        if (panel.naming_scheme) document.getElementById('tk-naming').value = panel.naming_scheme;
        if (panel.welcome_message) document.getElementById('tk-welcome-msg').value = panel.welcome_message;
        if (panel.channel_id) document.getElementById('tk-channel').value = panel.channel_id;
        if (panel.category_id) document.getElementById('tk-category').value = panel.category_id;
        if (panel.support_role_id) document.getElementById('tk-support-role').value = panel.support_role_id;
        if (panel.log_channel_id) document.getElementById('tk-log-channel').value = panel.log_channel_id;

        const panelIdInput = document.getElementById('tk-active-panel-id');
        const messageIdInput = document.getElementById('tk-active-message-id');
        const btnUpdate = document.getElementById('btn-update-ticket-panel');

        if (panelIdInput) panelIdInput.value = panel.id;
        if (messageIdInput) messageIdInput.value = panel.message_id || '';
        if (btnUpdate) {
          if (panel.message_id) {
            btnUpdate.classList.remove('hidden');
          } else {
            btnUpdate.classList.add('hidden');
          }
        }
      }

      updateTicketPreview();
    } catch (e) {
      console.error('Error loading tickets:', e);
    }
  }

  function getTicketPanelPayload() {
    return {
      channelId: document.getElementById('tk-channel')?.value,
      categoryId: document.getElementById('tk-category')?.value || null,
      supportRoleId: document.getElementById('tk-support-role')?.value || null,
      logChannelId: document.getElementById('tk-log-channel')?.value || null,
      title: document.getElementById('tk-title')?.value,
      description: document.getElementById('tk-description')?.value,
      color: document.getElementById('tk-color')?.value || '#dc2626',
      image: document.getElementById('tk-image')?.value?.trim() || null,
      footer: document.getElementById('tk-footer')?.value,
      buttonLabel: document.getElementById('tk-btn-label')?.value,
      buttonEmoji: document.getElementById('tk-btn-emoji')?.value,
      buttonStyle: document.getElementById('tk-btn-style')?.value || 'Primary',
      namingScheme: document.getElementById('tk-naming')?.value || 'ticket-{user}',
      welcomeMessage: document.getElementById('tk-welcome-msg')?.value
    };
  }

  const btnCreateTicketPanel = document.getElementById('btn-create-ticket-panel');
  if (btnCreateTicketPanel) {
    btnCreateTicketPanel.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const payload = getTicketPanelPayload();

      if (!payload.channelId) return window.showToast('Seleziona un canale per inviare il pannello.', 'error');

      const res = await fetch(`/api/guilds/${guildId}/tickets/panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        window.showToast('Nuovo Pannello Ticket inviato con successo nel canale!');
        await loadTicketsData(guildId);
      } else {
        window.showToast('Errore durante l\'invio del pannello.', 'error');
      }
    });
  }

  const btnUpdateTicketPanel = document.getElementById('btn-update-ticket-panel');
  if (btnUpdateTicketPanel) {
    btnUpdateTicketPanel.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const panelId = document.getElementById('tk-active-panel-id')?.value;
      const messageId = document.getElementById('tk-active-message-id')?.value;
      const payload = getTicketPanelPayload();

      if (!payload.channelId) return window.showToast('Seleziona un canale.', 'error');

      try {
        btnUpdateTicketPanel.disabled = true;
        btnUpdateTicketPanel.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Modifica in corso...';
        if (window.lucide) lucide.createIcons();

        const res = await fetch(`/api/guilds/${guildId}/tickets/panel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, panelId, messageId })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          window.showToast('Pannello Ticket su Discord aggiornato con successo in tempo reale senza cancellarlo!');
          await loadTicketsData(guildId);
        } else {
          window.showToast(`Errore modifica: ${data.error || 'Fallita'}`, 'error');
        }
      } catch (err) {
        window.showToast(`Errore: ${err.message}`, 'error');
      } finally {
        btnUpdateTicketPanel.disabled = false;
        btnUpdateTicketPanel.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4 text-amber-600"></i> Modifica Pannello Esistente';
        if (window.lucide) lucide.createIcons();
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

  // === Community Presentations (Presentazioni) Handler ===
  async function loadPresentationsData(guildId) {
    try {
      const res = await fetch(`/api/guilds/${guildId}/presentations`);
      if (!res.ok) return;
      const data = await res.json();

      const config = data.config || {};
      const enabledEl = document.getElementById('pres-enabled');
      const channelEl = document.getElementById('pres-channel');
      const roleEl = document.getElementById('pres-role');
      const xpEl = document.getElementById('pres-xp');

      if (enabledEl) enabledEl.checked = Boolean(config.enabled);
      if (channelEl && config.channel_id) channelEl.value = config.channel_id;
      if (roleEl && config.reward_role_id) roleEl.value = config.reward_role_id;
      if (xpEl) xpEl.value = config.xp_reward !== undefined ? config.xp_reward : 100;

      const tbody = document.getElementById('pres-recent-table');
      if (tbody) {
        tbody.innerHTML = '';
        const list = data.presentations || [];
        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-400 italic">Nessuna presentazione ricevuta finora.</td></tr>';
        } else {
          list.forEach(p => {
            const tr = document.createElement('tr');
            const dateStr = new Date(p.timestamp * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            tr.innerHTML = `
              <td class="py-2.5 font-mono text-slate-900 font-bold">&lt;@${p.user_id}&gt;</td>
              <td class="py-2.5 font-semibold text-indigo-700">${escapeHtml(p.name)}</td>
              <td class="py-2.5 text-slate-600">${escapeHtml(p.age_pronouns || 'N/A')}</td>
              <td class="py-2.5 text-slate-600 max-w-xs truncate" title="${escapeHtml(p.hobbies)}">${escapeHtml(p.hobbies)}</td>
              <td class="py-2.5 text-slate-400 text-[11px]">${dateStr}</td>
            `;
            tbody.appendChild(tr);
          });
        }
      }
    } catch (e) {
      console.error('Error loading presentations:', e);
    }
  }

  const btnSavePresConfig = document.getElementById('btn-save-pres-config');
  if (btnSavePresConfig) {
    btnSavePresConfig.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const channel_id = document.getElementById('pres-channel')?.value || null;
      const reward_role_id = document.getElementById('pres-role')?.value || null;
      const xp_reward = parseInt(document.getElementById('pres-xp')?.value || '100', 10);
      const enabled = document.getElementById('pres-enabled')?.checked;

      const res = await fetch(`/api/guilds/${guildId}/presentations/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id, reward_role_id, xp_reward, enabled })
      });

      if (res.ok) {
        window.showToast('Configurazione Modulo Presentazioni salvata con successo!');
        await loadPresentationsData(guildId);
      } else {
        window.showToast('Errore durante il salvataggio.', 'error');
      }
    });
  }

  const btnSendPresPanel = document.getElementById('btn-send-pres-panel');
  if (btnSendPresPanel) {
    btnSendPresPanel.addEventListener('click', async () => {
      const guildId = window.AppState?.currentGuildId;
      if (!guildId) return window.showToast('Nessun server selezionato. Seleziona prima un server dal menu in alto.', 'error');

      const channelId = document.getElementById('pres-channel')?.value;
      if (!channelId) return window.showToast('Seleziona un canale per inviare il pannello presentazioni.', 'error');

      const title = document.getElementById('pres-panel-title')?.value || '📜 Benvenuto nella Sala delle Presentazioni';
      const description = document.getElementById('pres-panel-desc')?.value?.trim() || null;
      const image = document.getElementById('pres-panel-image')?.value?.trim() || null;

      try {
        btnSendPresPanel.disabled = true;
        btnSendPresPanel.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Invio in corso...';
        if (window.lucide) lucide.createIcons();

        const res = await fetch(`/api/guilds/${guildId}/presentations/panel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId, title, description, image, color: '#6366f1' })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          window.showToast('Pannello Presentazioni inviato su Discord con successo!');
        } else {
          window.showToast(`Errore invio: ${data.error || 'Fallito'}`, 'error');
        }
      } catch (err) {
        window.showToast(`Errore: ${err.message}`, 'error');
      } finally {
        btnSendPresPanel.disabled = false;
        btnSendPresPanel.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5 text-indigo-600"></i> Invia Pannello nel Canale';
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  // === Minigames & Medieval Community Handler ===
  async function loadMinigamesData(guildId) {
    try {
      const [cntRes, fishRes] = await Promise.allSettled([
        fetch(`/api/guilds/${guildId}/counting`),
        fetch(`/api/guilds/${guildId}/fishing`)
      ]);

      if (cntRes.status === 'fulfilled' && cntRes.value.ok) {
        const data = await cntRes.value.json();
        const cfg = data.config || {};
        const enabledEl = document.getElementById('cnt-enabled');
        const channelEl = document.getElementById('cnt-channel');
        const curEl = document.getElementById('cnt-current-val');
        const highEl = document.getElementById('cnt-highest-val');

        if (enabledEl) enabledEl.checked = Boolean(cfg.enabled);
        if (channelEl && cfg.channel_id) channelEl.value = cfg.channel_id;
        if (curEl) curEl.textContent = cfg.current_number || 0;
        if (highEl) highEl.textContent = cfg.highest_streak || 0;

        const lbList = document.getElementById('cnt-leaderboard-list');
        if (lbList) {
          lbList.innerHTML = '';
          const lb = data.leaderboard || [];
          if (lb.length === 0) {
            lbList.innerHTML = '<p class="text-slate-400 italic">Nessun punteggio conteggio registrato finora.</p>';
          } else {
            lb.forEach((item, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              const div = document.createElement('div');
              div.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs';
              div.innerHTML = `
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-700">${medal}</span>
                  <span class="font-mono text-slate-900">&lt;@${item.user_id}&gt;</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-bold text-emerald-600">${item.correct_counts} corretti</span>
                  <span class="text-slate-400 text-[10px]">(${item.ruined_counts} errori)</span>
                </div>
              `;
              lbList.appendChild(div);
            });
          }
        }
      }

      if (fishRes.status === 'fulfilled' && fishRes.value.ok) {
        const data = await fishRes.value.json();
        const lbList = document.getElementById('fish-leaderboard-list');
        if (lbList) {
          lbList.innerHTML = '';
          const lb = data.leaderboard || [];
          if (lb.length === 0) {
            lbList.innerHTML = '<p class="text-slate-400 italic">Nessun pescatore registrato.</p>';
          } else {
            lb.forEach((item, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              const div = document.createElement('div');
              div.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs';
              div.innerHTML = `
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-700">${medal}</span>
                  <span class="font-mono text-slate-900">&lt;@${item.user_id}&gt;</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-bold text-amber-600">🪙 ${item.coins} Monete</span>
                  <span class="text-slate-500 text-[10px]">🎣 ${item.total_fish_caught} pescati</span>
                </div>
              `;
              lbList.appendChild(div);
            });
          }
        }
      }
    } catch (e) {
      console.error('Error loading minigames:', e);
    }
  }

  const btnSaveCounting = document.getElementById('btn-save-counting');
  if (btnSaveCounting) {
    btnSaveCounting.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const channelId = document.getElementById('cnt-channel')?.value;
      const enabled = document.getElementById('cnt-enabled')?.checked;

      const res = await fetch(`/api/guilds/${guildId}/counting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId, enabled })
      });

      if (res.ok) {
        window.showToast('Configurazione Minigioco Counting salvata!');
        await loadMinigamesData(guildId);
      } else {
        window.showToast('Errore durante il salvataggio.', 'error');
      }
    });
  }

  const btnResetCounting = document.getElementById('btn-reset-counting');
  if (btnResetCounting) {
    btnResetCounting.addEventListener('click', async () => {
      if (!confirm('Sei sicuro di voler azzerare il conteggio attuale a 0?')) return;
      const guildId = window.AppState.currentGuildId;
      const channelId = document.getElementById('cnt-channel')?.value;
      const enabled = document.getElementById('cnt-enabled')?.checked;

      const res = await fetch(`/api/guilds/${guildId}/counting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId, enabled, current_number: 0, last_user_id: null })
      });

      if (res.ok) {
        window.showToast('Conteggio azzerato a 0!');
        await loadMinigamesData(guildId);
      }
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

  async function saveAllServerSettings(guildId) {
    if (!guildId) return;

    try {
      const btn = document.getElementById('btn-save-all');
      const btnMob = document.getElementById('btn-save-all-mobile');
      if (btn) btn.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Salvataggio...';
      if (btnMob) btnMob.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Salvataggio...';
      lucide.createIcons();

      // 1. General Settings
      const p1 = fetch(`/api/guilds/${guildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: document.getElementById('gen-prefix')?.value || '!',
          log_channel_id: document.getElementById('gen-log-channel')?.value || null
        })
      });

      // 2. AI Config
      const p2 = fetch(`/api/guilds/${guildId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: document.getElementById('ai-enabled')?.checked,
          model: document.getElementById('ai-model')?.value,
          web_search_enabled: document.getElementById('ai-web-search')?.checked,
          system_prompt: document.getElementById('ai-system-prompt')?.value
        })
      });

      // 3. Welcomer Config
      const p3 = fetch(`/api/guilds/${guildId}/welcomer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getWelcomerPayload())
      });

      // 4. Partnership Config
      const p4 = fetch(`/api/guilds/${guildId}/partnerships/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: document.getElementById('part-enabled')?.checked,
          channel_id: document.getElementById('part-channel')?.value || null,
          ping_role_id: document.getElementById('part-ping-role')?.value || null,
          min_members: parseInt(document.getElementById('part-min-members')?.value || '50', 10),
          cooldown_minutes: parseInt(document.getElementById('part-cooldown')?.value || '60', 10)
        })
      });

      // 5. AutoMod Config
      const p5 = fetch(`/api/guilds/${guildId}/automod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anti_invites: document.getElementById('am-anti-invites')?.checked,
          anti_links: document.getElementById('am-anti-links')?.checked,
          anti_spam: document.getElementById('am-anti-spam')?.checked,
          anti_caps: document.getElementById('am-anti-caps')?.checked,
          banned_words: document.getElementById('am-banned-words')?.value?.split(',').map(w => w.trim()).filter(Boolean) || [],
          action: document.getElementById('am-action')?.value || 'WARN',
          log_channel_id: document.getElementById('am-log-channel')?.value || null
        })
      });

      // 6. Leveling Config
      const p6 = fetch(`/api/guilds/${guildId}/leveling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: document.getElementById('lvl-enabled')?.checked,
          channel_id: document.getElementById('lvl-channel')?.value || null,
          xp_rate: parseFloat(document.getElementById('lvl-rate')?.value || '1.0')
        })
      });

      // 7. Counting Minigame Config
      const p7 = fetch(`/api/guilds/${guildId}/counting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: document.getElementById('cnt-enabled')?.checked,
          channel_id: document.getElementById('cnt-channel')?.value || null
        })
      });

      // 8. Presentations Module Config
      const p8 = fetch(`/api/guilds/${guildId}/presentations/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: document.getElementById('pres-enabled')?.checked,
          channel_id: document.getElementById('pres-channel')?.value || null,
          reward_role_id: document.getElementById('pres-role')?.value || null,
          xp_reward: parseInt(document.getElementById('pres-xp')?.value || '100', 10)
        })
      });

      await Promise.allSettled([p1, p2, p3, p4, p5, p6, p7, p8]);
      window.showToast('🛡️ Tutte le impostazioni del server sono state salvate permanentemente nel database!');
    } catch (err) {
      window.showToast('Errore durante il salvataggio.', 'error');
    } finally {
      const btn = document.getElementById('btn-save-all');
      const btnMob = document.getElementById('btn-save-all-mobile');
      if (btn) btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i> Salva Modifiche';
      if (btnMob) btnMob.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i> Salva';
      lucide.createIcons();
    }
  }

  // Initialize Markdown Toolbars & Searchable Selects for ALL Modules across the entire Dashboard
  function initModuleToolbars() {
    if (window.setupMarkdownToolbar) {
      // AI Module
      window.setupMarkdownToolbar('ai-prompt-toolbar-container', 'ai-system-prompt');
      
      // Partnerships Module
      window.setupMarkdownToolbar('part-notes-toolbar-container', 'part-quick-notes');

      // Welcomer Module
      window.setupMarkdownToolbar('wel-toolbar-container', 'wel-message');
      window.setupMarkdownToolbar('wel-dm-toolbar-container', 'wel-dm-message');
      window.setupMarkdownToolbar('wel-leave-toolbar-container', 'wel-leave-message');

      // Reaction Roles Module
      window.setupMarkdownToolbar('rr-title-toolbar-container', 'rr-title');

      // Auto-Responder Module
      window.setupMarkdownToolbar('ar-response-toolbar-container', 'ar-response');

      // Ticket System Module
      window.setupMarkdownToolbar('tk-desc-toolbar-container', 'tk-description');
      window.setupMarkdownToolbar('tk-welcome-toolbar-container', 'tk-welcome-msg');

      // Giveaways & Leveling Module
      window.setupMarkdownToolbar('ga-prize-toolbar-container', 'ga-prize');
      window.setupMarkdownToolbar('lvl-msg-toolbar-container', 'lvl-message');
    }

    if (window.setupSearchableSelect) {
      // Welcomer Channels
      window.setupSearchableSelect('wel-channel-search', 'wel-channel', 'text');
      window.setupSearchableSelect('wel-leave-channel-search', 'wel-leave-channel', 'text');

      // Ticket System Channels, Categories & Roles
      window.setupSearchableSelect('tk-channel-search', 'tk-channel', 'text');
      window.setupSearchableSelect('tk-category-search', 'tk-category', 'category');
      window.setupSearchableSelect('tk-support-role-search', 'tk-support-role', 'role');
      window.setupSearchableSelect('tk-log-channel-search', 'tk-log-channel', 'text');

      // Partnerships Channels & Roles
      window.setupSearchableSelect('part-channel-search', 'part-channel', 'text');
      window.setupSearchableSelect('part-ping-role-search', 'part-ping-role', 'role');
      window.setupSearchableSelect('part-manager-role-search', 'part-manager-role', 'role');

      // Community Presentations Channels & Roles
      window.setupSearchableSelect('pres-channel-search', 'pres-channel', 'text');
      window.setupSearchableSelect('pres-role-search', 'pres-role', 'role');

      // Reaction Roles Channels & Roles
      window.setupSearchableSelect('rr-channel-search', 'rr-channel', 'text');
      window.setupSearchableSelect('rr-role-search', 'rr-role', 'role');

      // Auto-Responder Channel
      window.setupSearchableSelect('ar-chan-search', 'ar-chan-select', 'text');

      // Giveaways & Leveling Channels
      window.setupSearchableSelect('ga-channel-search', 'ga-channel', 'text');
      window.setupSearchableSelect('lvl-channel-search', 'lvl-channel', 'text');

      // Minigames & Counting Channel
      window.setupSearchableSelect('cnt-channel-search', 'cnt-channel', 'text');
    }
  }

  window.initModuleToolbars = initModuleToolbars;

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModuleToolbars);
  } else {
    initModuleToolbars();
  }

  const btnSaveAll = document.getElementById('btn-save-all');
  if (btnSaveAll) {
    btnSaveAll.addEventListener('click', () => {
      const guildId = window.AppState.currentGuildId;
      if (guildId) saveAllServerSettings(guildId);
    });
  }

  const btnSaveAllMobile = document.getElementById('btn-save-all-mobile');
  if (btnSaveAllMobile) {
    btnSaveAllMobile.addEventListener('click', () => {
      const guildId = window.AppState.currentGuildId;
      if (guildId) saveAllServerSettings(guildId);
    });
  }
})();
