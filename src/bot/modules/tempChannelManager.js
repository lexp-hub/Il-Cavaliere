import {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder
} from 'discord.js';
import { DatabaseHelper } from '../../database/db.js';
import { CONFIG } from '../../config.js';

export const TempChannelManager = {
  // === 1. Create Temporary Voice Channel ===
  async createVoiceRoom(guild, member, options = {}) {
    const config = DatabaseHelper.getTempChannelConfig(guild.id);
    if (!config.enabled) {
      return { success: false, message: 'Il modulo Canali Privati è disattivato su questo server.' };
    }

    const namingScheme = options.name || config.naming_scheme_voice || '🔊 Stanza di {user}';
    const cleanUsername = member.displayName || member.user.username;
    const channelName = namingScheme.replace(/{user}/g, cleanUsername);
    const userLimit = options.userLimit !== undefined ? options.userLimit : (config.default_user_limit || 0);
    const categoryId = options.categoryId || config.category_id || undefined;

    const overwrites = [
      {
        id: guild.id,
        allow: [PermissionsBitField.Flags.ViewChannel],
        deny: options.isLocked ? [PermissionsBitField.Flags.Connect] : []
      },
      {
        id: member.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
          PermissionsBitField.Flags.MuteMembers,
          PermissionsBitField.Flags.DeafenMembers,
          PermissionsBitField.Flags.MoveMembers,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.PrioritySpeaker,
          PermissionsBitField.Flags.Stream
        ]
      },
      {
        id: guild.client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.MoveMembers
        ]
      }
    ];

    try {
      const voiceChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: categoryId,
        userLimit: userLimit,
        bitrate: Math.min(config.default_bitrate || 64000, guild.maximumBitrate || 96000),
        permissionOverwrites: overwrites,
        reason: `Canale vocale temporaneo creato per ${member.user.tag}`
      });

      let textChannel = null;
      if (options.withText) {
        const textNaming = config.naming_scheme_text || '💬 chat-{user}';
        const textName = textNaming.replace(/{user}/g, cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, ''));
        textChannel = await guild.channels.create({
          name: textName,
          type: ChannelType.GuildText,
          parent: categoryId,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
              id: member.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.EmbedLinks,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.ManageMessages
              ]
            },
            {
              id: guild.client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageChannels
              ]
            }
          ],
          topic: `Chat privata per la stanza vocale di ${member.user.tag} | ID: ${member.id}`
        });

        await this.sendControlPanel(textChannel, member, voiceChannel.id, textChannel.id);
      }

      const record = DatabaseHelper.createTempChannelRecord(
        guild.id,
        member.id,
        voiceChannel.id,
        textChannel ? textChannel.id : null,
        userLimit
      );

      // Move member if currently in a voice channel
      if (member.voice?.channelId) {
        await member.voice.setChannel(voiceChannel).catch(() => {});
      }

      return { success: true, voiceChannel, textChannel, record };
    } catch (error) {
      console.error('[TempChannels] Errore creazione canale vocale:', error);
      return { success: false, message: error.message };
    }
  },

  // === 2. Create Temporary Private Text Channel ===
  async createTextRoom(guild, member, options = {}) {
    const config = DatabaseHelper.getTempChannelConfig(guild.id);
    if (!config.enabled) {
      return { success: false, message: 'Il modulo Canali Privati è disattivato su questo server.' };
    }

    const cleanUsername = member.displayName || member.user.username;
    const textNaming = options.name || config.naming_scheme_text || '💬 chat-{user}';
    const textName = textNaming.replace(/{user}/g, cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const categoryId = options.categoryId || config.category_id || undefined;

    try {
      const textChannel = await guild.channels.create({
        name: textName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages
            ]
          },
          {
            id: guild.client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ManageChannels
            ]
          }
        ],
        topic: `Canale testuale privato di ${member.user.tag} | Creatore: ${member.id}`
      });

      await this.sendControlPanel(textChannel, member, null, textChannel.id);

      const record = DatabaseHelper.createTempChannelRecord(
        guild.id,
        member.id,
        null,
        textChannel.id,
        0
      );

      return { success: true, textChannel, record };
    } catch (error) {
      console.error('[TempChannels] Errore creazione canale testo:', error);
      return { success: false, message: error.message };
    }
  },

  // === 3. Send Control Dashboard Embed in Channel ===
  async sendControlPanel(channel, member, voiceId = null, textId = null) {
    const embed = new EmbedBuilder()
      .setColor('#6366f1')
      .setAuthor({
        name: `Pannello di Controllo Stanza Privata • ${member.displayName || member.user.username}`,
        iconURL: member.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle('🛡️ Gestione Stanza & Permessi')
      .setDescription(
        `Benvenuto nella tua **Stanza Privata**!\n\n` +
        `Usa i pulsanti sottostanti per gestire chi può accedere, parlare o visualizzare la stanza:\n\n` +
        `• 🔒 **Blocca / Sblocca**: Blocca l'ingresso a nuovi utenti\n` +
        `• 👁️ **Nascondi / Mostra**: Rendi il canale invisibile agli altri membri\n` +
        `• 👥 **Limite Utenti**: Imposta il numero massimo di partecipanti\n` +
        `• ➕ **Aggiungi Utente**: Dai accesso a un amico specifico\n` +
        `• 🚫 **Revoca Accesso**: Rimuovi o espelli un utente dalla stanza\n` +
        `• ✏️ **Rinomina**: Modifica il nome del canale\n` +
        `• 🗑️ **Elimina Stanza**: Chiudi e cancella immediatamente la stanza`
      )
      .setFooter({ text: 'Solo il proprietario della stanza o gli admin possono usare questi comandi' })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_tc_lock').setLabel('Blocca/Sblocca').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('btn_tc_hide').setLabel('Nascondi/Mostra').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('btn_tc_limit').setLabel('Limite Utenti').setEmoji('👥').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('btn_tc_permit').setLabel('Aggiungi Amico').setEmoji('➕').setStyle(ButtonStyle.Success)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_tc_kick').setLabel('Revoca/Espelli').setEmoji('🚫').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('btn_tc_rename').setLabel('Rinomina').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('btn_tc_transfer').setLabel('Passa Proprietà').setEmoji('👑').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('btn_tc_delete').setLabel('Elimina Stanza').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    );

    return await channel.send({ embeds: [embed], components: [row1, row2] });
  },

  // === 4. Send Interactive Hub Panel (Admin / Dashboard) ===
  async sendHubPanel(guild, channelId, options = {}) {
    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) throw new Error('Canale per l\'invio del pannello non trovato.');

    const title = options.title || '🔊 Hub Creazione Canali Privati & Vocali';
    const description = options.description ||
      `Crea all'istante la tua **Stanza Privata** (vocale, testuale o entrambe) personalizzata!\n\n` +
      `Tutte le stanze create ti daranno i **permessi da proprietario** per invitare amici, bloccare l'accesso, impostare limiti e gestire il canale liberamente.\n\n` +
      `👇 **Scegli il tipo di stanza che desideri creare:**`;

    const embed = new EmbedBuilder()
      .setColor('#6366f1')
      .setTitle(title)
      .setDescription(description)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .setImage(options.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80')
      .setFooter({ text: `${guild.name} • Sentry Private Rooms`, iconURL: guild.iconURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_tc_create_voice')
        .setLabel('Crea Vocale Privato')
        .setEmoji('🔊')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn_tc_create_text')
        .setLabel('Crea Canale Testuale')
        .setEmoji('💬')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_tc_create_linked')
        .setLabel('Vocale + Chat Privata')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Success)
    );

    return await channel.send({ embeds: [embed], components: [row] });
  },

  // === 5. Handle Buttons Interaction ===
  async handleButtonInteraction(interaction) {
    const { customId, guild, user, member, channel } = interaction;

    // A. Creation Buttons
    if (customId === 'btn_tc_create_voice') {
      const result = await this.createVoiceRoom(guild, member, { withText: false });
      if (!result.success) return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
      return interaction.reply({
        content: `✅ Stanza vocale creata con successo: <#${result.voiceChannel.id}>! Entra per iniziare a parlare.`,
        ephemeral: true
      });
    }

    if (customId === 'btn_tc_create_text') {
      const result = await this.createTextRoom(guild, member);
      if (!result.success) return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
      return interaction.reply({
        content: `✅ Canale testuale privato creato con successo: <#${result.textChannel.id}>!`,
        ephemeral: true
      });
    }

    if (customId === 'btn_tc_create_linked') {
      const result = await this.createVoiceRoom(guild, member, { withText: true });
      if (!result.success) return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
      return interaction.reply({
        content: `✅ Stanza completa creata con successo: <#${result.voiceChannel.id}> e chat <#${result.textChannel.id}>!`,
        ephemeral: true
      });
    }

    // B. Control Panel Buttons (inside temp channel)
    const tempRecord = DatabaseHelper.getTempChannelByChannelId(channel.id);
    if (!tempRecord) {
      if (customId.startsWith('btn_tc_')) {
        return interaction.reply({ content: '❌ Questo non è un canale temporaneo gestibile.', ephemeral: true });
      }
      return false;
    }

    const isOwner = tempRecord.owner_id === user.id;
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                    member.permissions.has(PermissionsBitField.Flags.ManageChannels);

    if (!isOwner && !isAdmin) {
      return interaction.reply({
        content: `❌ Solo il proprietario della stanza (<@${tempRecord.owner_id}>) o un amministratore possono modificare questo canale.`,
        ephemeral: true
      });
    }

    // Target channels
    const voiceChan = tempRecord.voice_channel_id ? guild.channels.cache.get(tempRecord.voice_channel_id) : null;
    const textChan = tempRecord.text_channel_id ? guild.channels.cache.get(tempRecord.text_channel_id) : null;

    // 1. Lock / Unlock
    if (customId === 'btn_tc_lock') {
      const isLocked = !tempRecord.is_locked;
      if (voiceChan) {
        await voiceChan.permissionOverwrites.edit(guild.id, {
          Connect: isLocked ? false : null
        }).catch(() => {});
      }
      if (textChan) {
        await textChan.permissionOverwrites.edit(guild.id, {
          SendMessages: isLocked ? false : null
        }).catch(() => {});
      }
      DatabaseHelper.updateTempChannelState(tempRecord.id, { is_locked: isLocked ? 1 : 0 });
      return interaction.reply({
        content: isLocked ? '🔒 **Stanza Bloccata**: I nuovi utenti non possono più entrare o inviare messaggi.' : '🔓 **Stanza Sbloccata**: Accesso riaperto.',
        ephemeral: true
      });
    }

    // 2. Hide / Unhide
    if (customId === 'btn_tc_hide') {
      const isHidden = !tempRecord.is_hidden;
      if (voiceChan) {
        await voiceChan.permissionOverwrites.edit(guild.id, {
          ViewChannel: isHidden ? false : true
        }).catch(() => {});
      }
      if (textChan) {
        await textChan.permissionOverwrites.edit(guild.id, {
          ViewChannel: isHidden ? false : null
        }).catch(() => {});
      }
      DatabaseHelper.updateTempChannelState(tempRecord.id, { is_hidden: isHidden ? 1 : 0 });
      return interaction.reply({
        content: isHidden ? '👁️ **Stanza Nascosta**: Il canale è ora invisibile a tutti gli altri membri del server.' : '👁️ **Stanza Visibile**: Il canale è di nuovo visibile nell\'elenco.',
        ephemeral: true
      });
    }

    // 3. User Limit Modal
    if (customId === 'btn_tc_limit') {
      if (!voiceChan) {
        return interaction.reply({ content: '❌ Il limite utenti è applicabile solo ai canali vocali.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`modal_tc_limit_${tempRecord.id}`)
        .setTitle('Imposta Limite Utenti');

      const input = new TextInputBuilder()
        .setCustomId('limit_value')
        .setLabel('Numero Massimo Partecipanti (0 = Illimitato)')
        .setStyle(TextInputStyle.Short)
        .setValue((voiceChan.userLimit || 0).toString())
        .setMaxLength(2)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    // 4. Permit / Add Friend (User Select Menu)
    if (customId === 'btn_tc_permit') {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`select_tc_permit_${tempRecord.id}`)
        .setPlaceholder('Seleziona un utente a cui dare accesso')
        .setMaxValues(1);

      const row = new ActionRowBuilder().addComponents(userSelect);
      return interaction.reply({
        content: '➕ Seleziona il membro a cui concedere l\'accesso alla stanza:',
        components: [row],
        ephemeral: true
      });
    }

    // 5. Kick / Revoke Access (User Select Menu)
    if (customId === 'btn_tc_kick') {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`select_tc_kick_${tempRecord.id}`)
        .setPlaceholder('Seleziona l\'utente da espellere o revocare')
        .setMaxValues(1);

      const row = new ActionRowBuilder().addComponents(userSelect);
      return interaction.reply({
        content: '🚫 Seleziona l\'utente da espellere o a cui revocare l\'accesso:',
        components: [row],
        ephemeral: true
      });
    }

    // 6. Rename Modal
    if (customId === 'btn_tc_rename') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_tc_rename_${tempRecord.id}`)
        .setTitle('Rinomina Stanza Privata');

      const currentName = (voiceChan || textChan)?.name || '';
      const input = new TextInputBuilder()
        .setCustomId('new_name')
        .setLabel('Nuovo Nome del Canale')
        .setStyle(TextInputStyle.Short)
        .setValue(currentName)
        .setMaxLength(50)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    // 7. Transfer Ownership (User Select Menu)
    if (customId === 'btn_tc_transfer') {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`select_tc_transfer_${tempRecord.id}`)
        .setPlaceholder('Seleziona il nuovo proprietario della stanza')
        .setMaxValues(1);

      const row = new ActionRowBuilder().addComponents(userSelect);
      return interaction.reply({
        content: '👑 Seleziona il nuovo proprietario a cui trasferire il controllo totale della stanza:',
        components: [row],
        ephemeral: true
      });
    }

    // 8. Delete Room
    if (customId === 'btn_tc_delete') {
      await interaction.reply({ content: '🗑️ Chiusura ed eliminazione della stanza in corso...', ephemeral: true });
      if (voiceChan) await voiceChan.delete('Eliminazione stanza temporanea').catch(() => {});
      if (textChan) await textChan.delete('Eliminazione stanza temporanea').catch(() => {});
      DatabaseHelper.deleteTempChannelRecord(tempRecord.id);
      return;
    }

    return false;
  },

  // === 6. Handle Select Menus ===
  async handleSelectMenu(interaction) {
    const { customId, guild, values } = interaction;
    const targetUserId = values[0];

    if (customId.startsWith('select_tc_permit_')) {
      const id = parseInt(customId.replace('select_tc_permit_', ''), 10);
      const tempRecord = DatabaseHelper.getActiveTempChannels(guild.id).find(r => r.id === id);
      if (!tempRecord) return interaction.reply({ content: '❌ Stanza non trovata.', ephemeral: true });

      const voiceChan = tempRecord.voice_channel_id ? guild.channels.cache.get(tempRecord.voice_channel_id) : null;
      const textChan = tempRecord.text_channel_id ? guild.channels.cache.get(tempRecord.text_channel_id) : null;

      if (voiceChan) {
        await voiceChan.permissionOverwrites.edit(targetUserId, {
          ViewChannel: true,
          Connect: true,
          Speak: true
        }).catch(() => {});
      }

      if (textChan) {
        await textChan.permissionOverwrites.edit(targetUserId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        }).catch(() => {});
      }

      return interaction.update({
        content: `✅ Accesso concesso con successo a <@${targetUserId}>!`,
        components: []
      });
    }

    if (customId.startsWith('select_tc_kick_')) {
      const id = parseInt(customId.replace('select_tc_kick_', ''), 10);
      const tempRecord = DatabaseHelper.getActiveTempChannels(guild.id).find(r => r.id === id);
      if (!tempRecord) return interaction.reply({ content: '❌ Stanza non trovata.', ephemeral: true });

      const voiceChan = tempRecord.voice_channel_id ? guild.channels.cache.get(tempRecord.voice_channel_id) : null;
      const textChan = tempRecord.text_channel_id ? guild.channels.cache.get(tempRecord.text_channel_id) : null;

      if (voiceChan) {
        await voiceChan.permissionOverwrites.delete(targetUserId).catch(() => {});
        const targetMember = guild.members.cache.get(targetUserId);
        if (targetMember && targetMember.voice?.channelId === voiceChan.id) {
          await targetMember.voice.disconnect('Espulso dalla stanza privata').catch(() => {});
        }
      }

      if (textChan) {
        await textChan.permissionOverwrites.delete(targetUserId).catch(() => {});
      }

      return interaction.update({
        content: `🚫 Accesso revocato per <@${targetUserId}> ed eventuale disconnessione completata.`,
        components: []
      });
    }

    if (customId.startsWith('select_tc_transfer_')) {
      const id = parseInt(customId.replace('select_tc_transfer_', ''), 10);
      const tempRecord = DatabaseHelper.getActiveTempChannels(guild.id).find(r => r.id === id);
      if (!tempRecord) return interaction.reply({ content: '❌ Stanza non trovata.', ephemeral: true });

      DatabaseHelper.updateTempChannelState(tempRecord.id, { owner_id: targetUserId });

      const voiceChan = tempRecord.voice_channel_id ? guild.channels.cache.get(tempRecord.voice_channel_id) : null;
      const textChan = tempRecord.text_channel_id ? guild.channels.cache.get(tempRecord.text_channel_id) : null;

      if (voiceChan) {
        await voiceChan.permissionOverwrites.edit(targetUserId, {
          ViewChannel: true,
          Connect: true,
          Speak: true,
          MuteMembers: true,
          DeafenMembers: true,
          MoveMembers: true,
          ManageChannels: true
        }).catch(() => {});
      }

      if (textChan) {
        await textChan.permissionOverwrites.edit(targetUserId, {
          ViewChannel: true,
          SendMessages: true,
          ManageMessages: true,
          AttachFiles: true,
          EmbedLinks: true
        }).catch(() => {});
      }

      return interaction.update({
        content: `👑 Proprietà della stanza trasferita a <@${targetUserId}>!`,
        components: []
      });
    }

    return false;
  },

  // === 7. Handle Modals ===
  async handleModalSubmit(interaction) {
    const { customId, guild } = interaction;

    if (customId.startsWith('modal_tc_limit_')) {
      const id = parseInt(customId.replace('modal_tc_limit_', ''), 10);
      const tempRecord = DatabaseHelper.getActiveTempChannels(guild.id).find(r => r.id === id);
      if (!tempRecord) return interaction.reply({ content: '❌ Stanza non trovata.', ephemeral: true });

      const limitVal = parseInt(interaction.fields.getTextInputValue('limit_value'), 10);
      if (isNaN(limitVal) || limitVal < 0 || limitVal > 99) {
        return interaction.reply({ content: '❌ Inserisci un numero valido tra 0 e 99.', ephemeral: true });
      }

      const voiceChan = tempRecord.voice_channel_id ? guild.channels.cache.get(tempRecord.voice_channel_id) : null;
      if (voiceChan) {
        await voiceChan.setUserLimit(limitVal).catch(() => {});
      }
      DatabaseHelper.updateTempChannelState(tempRecord.id, { user_limit: limitVal });

      return interaction.reply({
        content: limitVal === 0 ? '👥 Limite partecipanti rimosso (illimitato).' : `👥 Limite partecipanti impostato a **${limitVal} utenti**.`,
        ephemeral: true
      });
    }

    if (customId.startsWith('modal_tc_rename_')) {
      const id = parseInt(customId.replace('modal_tc_rename_', ''), 10);
      const tempRecord = DatabaseHelper.getActiveTempChannels(guild.id).find(r => r.id === id);
      if (!tempRecord) return interaction.reply({ content: '❌ Stanza non trovata.', ephemeral: true });

      const newName = interaction.fields.getTextInputValue('new_name').trim();
      if (!newName) {
        return interaction.reply({ content: '❌ Inserisci un nome valido.', ephemeral: true });
      }

      const voiceChan = tempRecord.voice_channel_id ? guild.channels.cache.get(tempRecord.voice_channel_id) : null;
      const textChan = tempRecord.text_channel_id ? guild.channels.cache.get(tempRecord.text_channel_id) : null;

      if (voiceChan) await voiceChan.setName(newName).catch(() => {});
      if (textChan && !voiceChan) await textChan.setName(newName).catch(() => {});

      return interaction.reply({
        content: `✏️ Canale rinominato in **${newName}**!`,
        ephemeral: true
      });
    }

    return false;
  },

  // === 8. Voice State Update Event Handler (Join to Create & Auto-delete) ===
  async handleVoiceStateUpdate(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    const config = DatabaseHelper.getTempChannelConfig(guild.id);
    if (!config.enabled) return;

    // A. User joined the Master Generator Voice Channel
    if (newState.channelId && newState.channelId === config.voice_generator_id) {
      const member = newState.member;
      if (!member || member.user.bot) return;

      await this.createVoiceRoom(guild, member, { withText: true });
      return;
    }

    // B. User left a Temporary Voice Channel (Check if empty -> Auto Delete)
    if (oldState.channelId && oldState.channelId !== config.voice_generator_id) {
      const tempRecord = DatabaseHelper.getTempChannelByVoiceId(oldState.channelId);
      if (tempRecord) {
        const voiceChannel = guild.channels.cache.get(tempRecord.voice_channel_id);
        if (voiceChannel && voiceChannel.members.size === 0) {
          // If auto_delete_delay is set
          const delay = (config.auto_delete_delay || 0) * 1000;
          setTimeout(async () => {
            const recheckChannel = guild.channels.cache.get(tempRecord.voice_channel_id);
            if (!recheckChannel || recheckChannel.members.size === 0) {
              if (recheckChannel) await recheckChannel.delete('Stanza vocale temporanea vuota').catch(() => {});
              if (tempRecord.text_channel_id) {
                const textChannel = guild.channels.cache.get(tempRecord.text_channel_id);
                if (textChannel) await textChannel.delete('Stanza testuale collegata vuota').catch(() => {});
              }
              DatabaseHelper.deleteTempChannelRecord(tempRecord.id);
            }
          }, delay);
        }
      }
    }
  }
};

export default TempChannelManager;
