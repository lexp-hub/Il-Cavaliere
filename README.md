# 🛡️ Il Cavaliere — Discord Bot & Dashboard Noctaly-Style

> **Bot Discord multifunzione all-in-one di nuova generazione** sviluppato in **JavaScript / Node.js (Discord.js v14 + Express + Tailwind Glassmorphism)** con **Dashboard Web avanzata in stile Noctaly** (tema scuro cyberpunk, vetro smerigliato, anteprima live dei messaggi in tempo reale e gestione completa dei server).

---

## ✨ Funzionalità Principali

### 🤝 1. Sistema Partnership Completo
- **Rilevamento e Verifica Invito**: Estrae automaticamente informazioni sul server partner (nome, icona, membri).
- **Requisiti Minimi**: Imposta una soglia minima di membri per stringere la partnership.
- **Sistema Cooldown**: Previene spam e partnership duplicate dallo stesso server.
- **Template Embed & Ping**: Pubblica annunci formattati con menzione automatica del ruolo `@Partner`.
- **Classifica Partner Manager**: Tiene traccia delle statistiche e dei membri dello staff più attivi.

### 🎨 2. Live Embed Builder (Stile Noctaly)
- **Simulatore Discord in Tempo Reale**: Visualizza fedelmente come apparirà il messaggio prima di inviarlo.
- **Personalizzazione Totale**: Titolo, URL, Descrizione (con supporto Markdown completo), Colore HEX, Autore con icona, Campi dinamici (inline o blocco), Immagini grandi, Miniature (Thumbnail), Footer e Timestamp.
- **Pulsanti e Link**: Aggiungi pulsanti interattivi e link web al messaggio.
- **Invio ed Esportazione**: Invia direttamente a qualsiasi canale Discord con 1 click o esporta/importa in formato JSON.

### 🎭 3. Reaction & Button Roles
- **Ruoli su Pulsanti**: Pulsanti colorati (Viola, Grigio, Verde, Rosso) con etichetta ed emoji per assegnare ruoli istantaneamente.
- **Menu a Tendina (Select Menus)**: Permette la scelta dei ruoli tramite menu interattivo.
- **Reazioni Emoji Classiche**: Supporto per reaction roles basati su emoji standard e personalizzate.

### 👋 4. Welcomer & Auto-Role
- **Benvenuto & Addio**: Messaggi ed embed personalizzati con variabili (`{user.mention}`, `{server.name}`, `{memberCount}`).
- **Messaggio Privato (DM)**: Notifica privata ai nuovi membri all'ingresso nel server.
- **Auto-Role**: Assegnazione automatica istantanea dei ruoli per utenti e bot.

### ⚡ 5. Auto-Responder & Reaction Messages
- **Trigger Intelligenti**: Modalità di confronto *Contiene*, *Corrispondenza Esatta*, *Inizia con* o *Regex*.
- **Auto-Reactions**: Aggiunge automaticamente reazioni emoji ai messaggi trigger o a specifici canali (es. canale suggerimenti con 👍 👎).

### ✨ 6. Emoji Stealer & Statistiche
- **Comando `/steal`**: Ruba emoji e sticker esterni e aggiungili al tuo server con un click.
- **Emoji Tracker**: Classifica dettagliata delle emoji più e meno utilizzate nel server.
- **Starboard ⭐**: Bacheca automatica per i messaggi preferiti della community.

### 🛡️ 7. AutoMod & Moderazione
- **Filtri Automatici**: Anti-Invite (con whitelist), Anti-Link, Anti-Spam (rate limit rapido), Anti-Caps e Filtro Parole Vietate.
- **Comandi Slash Moderazione**: `/ban`, `/kick`, `/timeout`, `/warn`, `/warnings`, `/clear` (con filtri), `/lock`, `/unlock`, `/slowmode`, `/nuke`.
- **Audit Logs**: Canale di log dedicato per tracciare tutte le azioni di moderazione, messaggi eliminati e modificati.

### 🎫 8. Ticket System
- **Pannelli Interattivi**: Apertura ticket privati tramite pulsante.
- **Gestione Staff**: Assegnazione permessi automatici per lo staff, presa in carico (`Claim Ticket`) e chiusura con generazione transcript.

### 🎉 9. Giveaways & ⭐ Leveling
- **Giveaway**: Timer automatici, estrazioni casuali e comando `/giveaway reroll`.
- **Leveling XP**: Guadagno XP da chat, ruoli premio al raggiungimento di specifici livelli, comando `/rank` con barra grafica e `/leaderboard`.

---

## 🚀 Installazione e Avvio Rapido

### 1. Prerequisiti
- **Node.js** (v18 o superiore)
- **npm** (v9 o superiore)

### 2. Configurazione Credenziali
Copia il file `.env.example` in `.env`:
```bash
cp .env.example .env
```
Inserisci le tue credenziali Discord (ottenibili su [Discord Developer Portal](https://discord.com/developers/applications)):
```env
DISCORD_BOT_TOKEN=il_tuo_bot_token
DISCORD_CLIENT_ID=il_tuo_client_id
DISCORD_CLIENT_SECRET=il_tuo_client_secret
PORT=3000
DASHBOARD_URL=http://localhost:3000
```

> **Nota (Modalità Demo / Preview):** Se non hai ancora configurato il token Discord, l'applicazione si avvierà automaticamente in **Modalità Demo**, permettendoti di esplorare l'intera Dashboard e testare l'Embed Builder e le impostazioni.

### 3. Avvio dell'Applicazione
```bash
# Avvio unificato (Bot Discord + Dashboard Web)
npm start
```

La Dashboard sarà accessibile all'indirizzo: **`http://localhost:3000`**

### 4. Esecuzione dei Test
```bash
npm test
```

---

## 📜 Elenco dei Comandi Slash

| Categoria | Comando | Descrizione |
| :--- | :--- | :--- |
| **Generale** | `/help` | Menu interattivo con categorie a tendina |
| | `/ping` | Latenza bot, WebSocket e memoria RAM |
| | `/botinfo` | Specifiche tecniche, uptime e statistiche |
| | `/serverinfo` | Informazioni server, ruoli, membri e canali |
| | `/userinfo` | Dettagli profilo utente, ruoli e data di ingresso |
| **Partnership** | `/partner add` | Registra e pubblica una nuova partnership |
| | `/partner config` | Imposta canale, ruolo ping, min membri e cooldown |
| | `/partner stats` | Statistiche partnership e classifica manager |
| **Embeds** | `/embed send` | Invia un template embed a un canale |
| | `/embed create` | Crea un embed al volo |
| | `/embed list` | Elenca i template salvati |
| **Reaction Roles** | `/reactionrole button` | Crea un pannello ruoli con pulsanti |
| | `/reactionrole list` | Mostra i reaction role attivi |
| **Welcomer** | `/welcomer config` | Configura benvenuto, addio e canali |
| | `/welcomer autorole` | Imposta ruoli automatici per utenti e bot |
| | `/welcomer test` | Invia un messaggio di benvenuto di simulazione |
| **Auto-Responder** | `/autoresponder add` | Aggiunge una risposta automatica o reazioni |
| | `/autoresponder autoreact`| Imposta reazioni continue su un canale (es. suggerimenti) |
| **Emoji** | `/steal emoji` | Ruba e aggiungi un'emoji da link o messaggio |
| | `/emoji-stats` | Statistiche d'uso delle emoji nel server |
| | `/starboard config` | Configura la bacheca messaggi stellati |
| **Moderazione** | `/ban`, `/kick` | Banna o espelli un utente |
| | `/timeout` | Metti in timeout temporaneo (es. `10m`, `1h`, `1d`) |
| | `/warn`, `/warnings` | Assegna o consulta gli avvertimenti |
| | `/clear` | Elimina fino a 100 messaggi con filtri |
| | `/lock`, `/unlock` | Blocca o sblocca la scrittura nel canale |
| | `/slowmode` | Imposta il ritardo tra i messaggi |
| | `/nuke` | Ricrea il canale cancellando la cronologia |
| **Tickets** | `/ticket panel` | Invia il pannello per aprire ticket di supporto |
| | `/ticket claim` | Prendi in carico il ticket corrente |
| | `/ticket close` | Chiudi il ticket e genera il transcript |
| **Giveaways** | `/giveaway start` | Avvia un concorso a premi |
| | `/giveaway reroll` | Estrai un nuovo vincitore casuale |
| **Leveling** | `/rank` | Mostra scheda livello con barra avanzamento |
| | `/leaderboard` | Top 10 utenti per esperienza (XP) |
| | `/setxp` | Imposta manualmente i punti XP di un membro |

---

## 🛠️ Struttura del Progetto

```
Il Cavaliere/
├── package.json               # Dipendenze e script di avvio
├── .env.example               # Configurazione d'esempio
├── README.md                  # Documentazione completa
├── test/
│   └── runTests.js            # Suite di test automatici
├── src/
│   ├── index.js               # Entry point unificato (Bot + Web Server)
│   ├── config.js              # Parametri globali e temi grafici
│   ├── database/
│   │   ├── db.js              # Helper SQLite Better-SQLite3 con WAL mode
│   │   └── schema.js          # Schema database con tutte le tabelle
│   ├── bot/
│   │   ├── client.js          # Inizializzazione Discord.js v14
│   │   ├── deployCommands.js  # Registrazione Slash Commands
│   │   ├── commands/          # 27 comandi slash divisi in 8 categorie
│   │   ├── events/            # 9 event listener Discord
│   │   └── modules/           # Logiche (Partnership, AutoMod, Welcomer, Tickets, XP)
│   └── dashboard/
│       ├── server.js          # Server Express e WebSockets
│       ├── routes/            # Endpoints Auth OAuth2, Guilds e Moduli
│       └── public/            # Frontend Noctaly Style (HTML, CSS, JS)
```

---

## 🛡️ Licenza
Distribuito sotto licenza **MIT**.

