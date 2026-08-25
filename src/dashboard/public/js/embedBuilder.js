// Live Discord Embed Builder Engine
(function () {
  const fields = [];

  // DOM Elements
  const colorInput = document.getElementById('embed-color');
  const colorHexInput = document.getElementById('embed-color-hex');
  const authorNameInput = document.getElementById('embed-author-name');
  const authorIconInput = document.getElementById('embed-author-icon');
  const titleInput = document.getElementById('embed-title');
  const titleUrlInput = document.getElementById('embed-title-url');
  const descInput = document.getElementById('embed-description');
  const imageInput = document.getElementById('embed-image-url');
  const thumbInput = document.getElementById('embed-thumb-url');
  const footerTextInput = document.getElementById('embed-footer-text');
  const footerIconInput = document.getElementById('embed-footer-icon');

  // Preview DOM Elements
  const prevEmbedBox = document.getElementById('preview-embed-box');
  const prevAuthor = document.getElementById('prev-author');
  const prevAuthorName = document.getElementById('prev-author-name');
  const prevAuthorIcon = document.getElementById('prev-author-icon');
  const prevTitle = document.getElementById('prev-title');
  const prevDesc = document.getElementById('prev-desc');
  const prevFields = document.getElementById('prev-fields');
  const prevImage = document.getElementById('prev-image');
  const prevThumb = document.getElementById('prev-thumb');
  const prevFooter = document.getElementById('prev-footer');
  const prevFooterText = document.getElementById('prev-footer-text');
  const prevFooterIcon = document.getElementById('prev-footer-icon');

  // Helper: Simple Markdown to HTML parser for Discord preview
  function parseDiscordMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-1 py-0.5 rounded text-purple-300 font-mono text-xs">$1</code>')
      .replace(/\[(.*?)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank" class="text-sky-400 hover:underline">$1</a>')
      .replace(/\n/g, '<br>');
  }

  // Update Live Preview
  function updatePreview() {
    // 1. Color
    const color = colorHexInput?.value || colorInput?.value || '#8B5CF6';
    if (prevEmbedBox) prevEmbedBox.style.borderLeftColor = color;

    // 2. Author
    const authorName = authorNameInput?.value?.trim();
    const authorIcon = authorIconInput?.value?.trim();
    if (prevAuthor) {
      if (authorName) {
        prevAuthor.classList.remove('hidden');
        if (prevAuthorName) prevAuthorName.textContent = authorName;
        if (prevAuthorIcon) {
          if (authorIcon) {
            prevAuthorIcon.src = authorIcon;
            prevAuthorIcon.classList.remove('hidden');
          } else {
            prevAuthorIcon.classList.add('hidden');
          }
        }
      } else {
        prevAuthor.classList.add('hidden');
      }
    }

    // 3. Title
    const title = titleInput?.value?.trim() || '';
    if (prevTitle) {
      prevTitle.textContent = title;
      prevTitle.style.display = title ? 'block' : 'none';
    }

    // 4. Description
    const desc = descInput?.value || '';
    if (prevDesc) {
      prevDesc.innerHTML = parseDiscordMarkdown(desc);
      prevDesc.style.display = desc ? 'block' : 'none';
    }

    // 5. Fields
    if (prevFields) {
      prevFields.innerHTML = '';
      fields.forEach(f => {
        const fieldEl = document.createElement('div');
        fieldEl.className = `discord-embed-field ${f.inline ? 'inline' : ''}`;
        fieldEl.innerHTML = `
          <div class="discord-field-name">${f.name || 'Campo'}</div>
          <div class="discord-field-value">${parseDiscordMarkdown(f.value || 'Valore')}</div>
        `;
        prevFields.appendChild(fieldEl);
      });
      prevFields.style.display = fields.length > 0 ? 'grid' : 'none';
    }

    // 6. Images
    const imgUrl = imageInput?.value?.trim();
    if (prevImage) {
      if (imgUrl) {
        prevImage.src = imgUrl;
        prevImage.classList.remove('hidden');
      } else {
        prevImage.classList.add('hidden');
      }
    }

    const thumbUrl = thumbInput?.value?.trim();
    if (prevThumb) {
      if (thumbUrl) {
        prevThumb.src = thumbUrl;
        prevThumb.classList.remove('hidden');
      } else {
        prevThumb.classList.add('hidden');
      }
    }

    // 7. Footer
    const footerText = footerTextInput?.value?.trim();
    const footerIcon = footerIconInput?.value?.trim();
    if (prevFooter) {
      if (footerText) {
        prevFooter.classList.remove('hidden');
        if (prevFooterText) prevFooterText.textContent = footerText;
        if (prevFooterIcon) {
          if (footerIcon) {
            prevFooterIcon.src = footerIcon;
            prevFooterIcon.classList.remove('hidden');
          } else {
            prevFooterIcon.classList.add('hidden');
          }
        }
      } else {
        prevFooter.classList.add('hidden');
      }
    }
  }

  // Bind Listeners
  const allInputs = [
    colorInput, colorHexInput, authorNameInput, authorIconInput,
    titleInput, titleUrlInput, descInput, imageInput, thumbInput,
    footerTextInput, footerIconInput
  ];

  allInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        if (input === colorInput && colorHexInput) colorHexInput.value = colorInput.value.toUpperCase();
        if (input === colorHexInput && colorInput && colorHexInput.value.startsWith('#')) colorInput.value = colorHexInput.value;
        updatePreview();
      });
    }
  });

  // Dynamic Fields Management
  const btnAddField = document.getElementById('btn-add-field');
  const fieldsContainer = document.getElementById('embed-fields-container');

  function renderFieldsList() {
    if (!fieldsContainer) return;
    fieldsContainer.innerHTML = '';

    fields.forEach((field, index) => {
      const row = document.createElement('div');
      row.className = 'p-3 rounded-xl bg-slate-900/70 border border-white/5 space-y-2';
      row.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Campo #${index + 1}</span>
          <div class="flex items-center gap-3">
            <label class="text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" class="field-inline-toggle" data-index="${index}" ${field.inline ? 'checked' : ''}>
              <span>In Linea</span>
            </label>
            <button class="btn-remove-field text-rose-400 hover:text-rose-300 p-1" data-index="${index}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="text" class="form-input text-xs field-name-input" data-index="${index}" placeholder="Nome del campo" value="${field.name}">
          <input type="text" class="form-input text-xs field-val-input" data-index="${index}" placeholder="Valore del campo" value="${field.value}">
        </div>
      `;
      fieldsContainer.appendChild(row);
    });

    lucide.createIcons();

    // Attach row events
    document.querySelectorAll('.field-name-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        fields[idx].name = e.target.value;
        updatePreview();
      });
    });

    document.querySelectorAll('.field-val-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        fields[idx].value = e.target.value;
        updatePreview();
      });
    });

    document.querySelectorAll('.field-inline-toggle').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        fields[idx].inline = e.target.checked;
        updatePreview();
      });
    });

    document.querySelectorAll('.btn-remove-field').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        fields.splice(idx, 1);
        renderFieldsList();
        updatePreview();
      });
    });
  }

  if (btnAddField) {
    btnAddField.addEventListener('click', () => {
      if (fields.length >= 25) {
        return window.showToast('Limite massimo di 25 campi raggiunto.', 'error');
      }
      fields.push({ name: `Campo #${fields.length + 1}`, value: 'Valore', inline: true });
      renderFieldsList();
      updatePreview();
    });
  }

  // Generate Embed Payload Object
  function getEmbedPayload() {
    const payload = {};
    const color = colorHexInput?.value || '#8B5CF6';
    payload.color = parseInt(color.replace('#', ''), 16);

    const title = titleInput?.value?.trim();
    if (title) payload.title = title;

    const url = titleUrlInput?.value?.trim();
    if (url) payload.url = url;

    const desc = descInput?.value?.trim();
    if (desc) payload.description = desc;

    const authorName = authorNameInput?.value?.trim();
    if (authorName) {
      payload.author = { name: authorName };
      const icon = authorIconInput?.value?.trim();
      if (icon) payload.author.icon_url = icon;
    }

    const image = imageInput?.value?.trim();
    if (image) payload.image = { url: image };

    const thumb = thumbInput?.value?.trim();
    if (thumb) payload.thumbnail = { url: thumb };

    const footerText = footerTextInput?.value?.trim();
    if (footerText) {
      payload.footer = { text: footerText };
      const fIcon = footerIconInput?.value?.trim();
      if (fIcon) payload.footer.icon_url = fIcon;
    }

    if (fields.length > 0) {
      payload.fields = fields.map(f => ({
        name: f.name || 'Campo',
        value: f.value || 'Valore',
        inline: Boolean(f.inline)
      }));
    }

    payload.timestamp = new Date().toISOString();
    return payload;
  }

  // Action: Copy JSON
  const btnCopyJson = document.getElementById('btn-copy-json');
  if (btnCopyJson) {
    btnCopyJson.addEventListener('click', () => {
      const payload = getEmbedPayload();
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      window.showToast('JSON dell\'embed copiato negli appunti!');
    });
  }

  // Action: Send to Channel
  const btnSendEmbed = document.getElementById('btn-send-embed');
  if (btnSendEmbed) {
    btnSendEmbed.addEventListener('click', async () => {
      const guildId = window.AppState.currentGuildId;
      const channelSelect = document.getElementById('embed-channel');
      const channelId = channelSelect?.value;

      if (!guildId) return window.showToast('Nessun server selezionato.', 'error');
      if (!channelId) return window.showToast('Seleziona un canale di invio.', 'error');

      const payload = getEmbedPayload();

      try {
        btnSendEmbed.disabled = true;
        btnSendEmbed.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Invio in corso...';
        lucide.createIcons();

        const res = await fetch(`/api/guilds/${guildId}/embeds/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            embedData: payload,
            componentsData: []
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          window.showToast('Messaggio embed inviato con successo nel canale Discord!');
        } else {
          window.showToast(`Errore: ${data.error || 'Invio fallito'}`, 'error');
        }
      } catch (err) {
        window.showToast(`Errore di connessione: ${err.message}`, 'error');
      } finally {
        btnSendEmbed.disabled = false;
        btnSendEmbed.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i> Invia nel Canale Discord';
        lucide.createIcons();
      }
    });
  }

  // Initial Preview Render
  updatePreview();
})();

