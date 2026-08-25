<div align="center">
  <img src="src/dashboard/public/banner.svg" alt="Il Cavaliere" width="100%" />
</div>

<br>

# 🛡️ Il Cavaliere — Discord Bot & Dashboard Moderatori

> **Bot Discord multifunzione all-in-one** in JavaScript (Discord.js v14 + Express + Tailwind) con **Intelligenza Artificiale (Cloudflare Workers AI - Llama 3.3 70B)** e **Dashboard Web per moderatori**.

---

## ⚡ Caratteristiche Principali

- 🗡️ **Il Cavaliere AI**: Chat neurale potenziata da Llama 3.3 70B con ricerca web in tempo reale e identità cavalleresca.
- 🤝 **Sistema Partnership**: Gestione e verifica automatica inviti con requisiti minimi e statistiche manager.
- 📜 **Live Embed Builder**: Creazione di annunci ed Embed con anteprima Discord in tempo reale e pulsanti.
- 🛡️ **AutoMod & Moderazione**: Filtri anti-spam, anti-invite, anti-link, audit logs e comandi completi (`/ban`, `/kick`, `/timeout`, `/warn`, `/clear`, `/nuke`).
- 🎭 **Reaction Roles**: Assegnazione rapida dei ruoli con pulsanti interattivi e reazioni.
- 👋 **Welcomer & Auto-Role**: Messaggi di benvenuto nei canali e nei DM, con auto-role per nuovi membri e bot.
- 🎫 **Ticket System**: Apertura ticket privati con pulsanti, transcript e gestione staff.
- 🎉 **Giveaways & ⭐ Leveling**: Concorsi a premi automatici e sistema di livelli XP da chat.

---

## 📜 Comandi Slash

| Categoria | Comando | Descrizione |
| :--- | :--- | :--- |
| **🤖 AI** | `/ai ask` | Poni una domanda a Il Cavaliere |
| | `/ai search` | Esegue una ricerca web commentata dall'IA |
| | `/ai reset` | Azzera la memoria della conversazione nel canale |
| | `/ai prompt` | Visualizza o cambia il preset dell'IA |
| **⚔️ Generale** | `/help` | Menu comandi interattivo |
| | `/ping` | Latenza bot, WebSocket e memoria |
| | `/serverinfo` | Informazioni sul server Discord |
| | `/userinfo` | Informazioni sul profilo utente |
| **🤝 Partnership** | `/partner add` | Registra e pubblica un nuovo partner |
| | `/partner config` | Configura canale, ruolo ping e requisiti |
| | `/partner stats` | Statistiche e classifica dei partner |
| **🎨 Embeds** | `/embed send` | Invia un template embed |
| | `/embed create` | Crea un embed al volo |
| **🎭 Reaction Roles** | `/reactionrole button` | Crea pannello ruoli con pulsanti |
| | `/reactionrole list` | Elenco ruoli interattivi attivi |
| **👋 Welcomer** | `/welcomer config` | Configura benvenuto e canali |
| | `/welcomer autorole` | Imposta ruoli automatici d'ingresso |
| **🛡️ Moderazione** | `/ban`, `/kick` | Banna o espelli un membro |
| | `/timeout` | Mette in timeout temporaneo |
| | `/warn`, `/warnings` | Assegna o consulta gli avvertimenti |
| | `/clear` | Elimina fino a 100 messaggi |
| | `/lock`, `/unlock` | Blocca o sblocca la scrittura nel canale |
| | `/nuke` | Ricrea il canale cancellando la cronologia |
| **🎫 Tickets** | `/ticket panel` | Invia il pannello per aprire ticket |
| | `/ticket close` | Chiude il ticket e genera il transcript |
| **🎉 Giveaways** | `/giveaway start` | Avvia un giveaway |
| | `/giveaway reroll` | Estrae un nuovo vincitore |
| **⭐ Leveling** | `/rank` | Mostra scheda livello con XP |
| | `/leaderboard` | Classifica dei membri più attivi |

---

## 🛠️ Struttura del Progetto

```
Il Cavaliere/
├── index.js                   # Entry point root per Wispbyte / bot & dashboard
├── package.json               # Dipendenze e script di avvio
├── README.md                  # Documentazione e panoramica
├── src/
│   ├── config.js              # Configurazione globale e porte
│   ├── database/              # SQLite database adapter (node:sqlite / WAL)
│   ├── bot/                   # Bot Discord (comandi, eventi e moduli AI/Partnership/AutoMod)
│   └── dashboard/             # Server Express e frontend Dashboard
```

---

## 🛡️ Licenza
Distribuito sotto licenza **MIT**.
