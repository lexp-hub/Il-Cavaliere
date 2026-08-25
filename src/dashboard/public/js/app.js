// Global Dashboard State
window.AppState = {
  currentGuildId: null,
  currentGuildData: null,
  user: null,
  guilds: [],
  channels: [],
  roles: []
};

// Toast notification helper
window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'check-circle' : 'alert-circle';
  toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 ${type === 'success' ? 'text-emerald-400' : 'text-rose-400'}"></i><span>${message}</span>`;
  
  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

document.addEventListener('DOMContentLoaded', async () => {
  initTabNavigation();
  initWebSocket();
  await loadUserData();
  await loadGuilds();
  
  // URL query parameter check (e.g. ?guild=123)
  const urlParams = new URLSearchParams(window.location.search);
  const requestedGuild = urlParams.get('guild');
  if (requestedGuild) {
    const select = document.getElementById('server-selector');
    if (select) select.value = requestedGuild;
    await switchGuild(requestedGuild);
  }
});

// Tab Navigation Logic
function initTabNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active', 'bg-white/10', 'text-white'));
      tab.classList.add('active', 'bg-white/10', 'text-white');

      const targetId = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('block');
      });

      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.remove('hidden');
        targetContent.classList.add('block');
      }

      lucide.createIcons();
    });
  });
}

// WebSocket Status Connection
function initWebSocket() {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'INIT') {
          const statusEl = document.getElementById('bot-ws-status');
          if (statusEl) {
            statusEl.textContent = data.botOnline ? 'Bot Online • Connesso' : 'Modalità Demo Attiva';
          }
        }
      } catch (e) {}
    };
  } catch (e) {}
}

// User Profile Loader
async function loadUserData() {
  try {
    const res = await fetch('/auth/me');
    if (res.ok) {
      const user = await res.json();
      window.AppState.user = user;

      const avatarEl = document.getElementById('user-avatar');
      const nameEl = document.getElementById('user-name');
      if (avatarEl && user.avatar) avatarEl.src = user.avatar;
      if (nameEl && user.username) nameEl.textContent = user.username;
    }
  } catch (e) {
    console.error('Error fetching user info:', e);
  }
}

// Guilds Loader
async function loadGuilds() {
  try {
    const res = await fetch('/api/guilds');
    if (!res.ok) return;

    const guilds = await res.json();
    window.AppState.guilds = guilds;

    const selector = document.getElementById('server-selector');
    if (!selector) return;

    selector.innerHTML = '';
    guilds.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = `${g.name} (${g.memberCount} membri)`;
      selector.appendChild(opt);
    });

    selector.addEventListener('change', (e) => switchGuild(e.target.value));

    if (guilds.length > 0) {
      await switchGuild(guilds[0].id);
    }
  } catch (e) {
    console.error('Error loading guilds:', e);
  }
}

// Switch Active Guild
window.switchGuild = async function(guildId) {
  window.AppState.currentGuildId = guildId;

  try {
    const res = await fetch(`/api/guilds/${guildId}`);
    if (!res.ok) return;

    const guildData = await res.json();
    window.AppState.currentGuildData = guildData;
    window.AppState.channels = guildData.channels || [];
    window.AppState.roles = guildData.roles || [];

    const nameEl = document.getElementById('current-guild-name');
    if (nameEl) nameEl.innerHTML = `🏰 ${guildData.name}`;

    const membersEl = document.getElementById('ov-members');
    if (membersEl) membersEl.textContent = guildData.memberCount.toLocaleString();

    // Populate all channel and role dropdowns in the UI
    populateDropdowns(guildData.channels, guildData.roles);

    // Trigger modules data load for this guild
    if (window.loadModuleData) {
      window.loadModuleData(guildId);
    }

    lucide.createIcons();
  } catch (e) {
    console.error('Error switching guild:', e);
  }
};

// Helper: Populate select options across all tabs
function populateDropdowns(channels = [], roles = []) {
  const textChannels = channels.filter(c => c.type === 'text');
  const categories = channels.filter(c => c.type === 'category');

  // Channel Selectors IDs
  const channelSelectIds = [
    'gen-log-channel', 'part-channel', 'embed-channel', 'rr-channel',
    'wel-channel', 'wel-leave-channel', 'ar-chan-select', 'tk-channel',
    'ga-channel', 'lvl-channel'
  ];

  channelSelectIds.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Seleziona un Canale --</option>';

    textChannels.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `# ${c.name}`;
      select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
  });

  // Category Selector for Tickets
  const catSelect = document.getElementById('tk-category');
  if (catSelect) {
    catSelect.innerHTML = '<option value="">-- Nessuna Categoria --</option>';
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `📁 ${c.name}`;
      catSelect.appendChild(opt);
    });
  }

  // Role Selectors IDs
  const roleSelectIds = ['part-ping-role', 'rr-role', 'wel-autorole-user', 'tk-support-role'];
  roleSelectIds.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Nessun Ruolo --</option>';

    roles.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `@ ${r.name}`;
      select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
  });
}

