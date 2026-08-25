<div align="center">
  <img src="src/dashboard/public/banner.svg" alt="Il Cavaliere" width="100%" />
</div>

<br>

# 🛡️ Il Cavaliere — Discord Bot & Dashboard

> Bot Discord a tema medievale con **AI (Llama 70B)**, gestione **Partnership**, **Embed Builder**, **AutoMod** e **Dashboard Web per moderatori**.

---

## ⚡ Funzionalità

- 🗡️ **AI Integrata**: Risponde alle menzioni con stile medievale e ricerca web in tempo reale.
- 🤝 **Partnership**: Verifica automatica dei link di invito, requisiti minimi e cooldown.
- 📜 **Embed Builder**: Crea e invia messaggi embed con anteprima live e pulsanti.
- 🛡️ **AutoMod & Moderazione**: Filtri anti-spam, anti-invite, anti-link e comandi completi (`/ban`, `/kick`, `/timeout`, `/warn`, `/clear`, `/nuke`).
- 🎭 **Reaction Roles**: Assegnazione ruoli con pulsanti ed emoji interattive.
- 👋 **Welcomer**: Messaggi di benvenuto nei canali e nei DM con auto-role.
- 🎫 **Tickets & Giveaways**: Apertura ticket privati e concorsi a premi.

---

## 📜 Comandi Slash

| Categoria | Comando | Descrizione |
| :--- | :--- | :--- |
| **🤖 AI** | `/ai ask` | Poni una domanda a Il Cavaliere |
| | `/ai search` | Esegue una ricerca web con analisi dell'IA |
| | `/ai reset` | Azzera la memoria della conversazione nel canale |
| | `/ai prompt` | Visualizza o cambia il preset dell'IA |
| **⚔️ Generale** | `/help` | Menu comandi interattivo |
| | `/ping` | Latenza bot e stato memoria |
| | `/serverinfo` | Informazioni sul server Discord |
| | `/userinfo` | Informazioni sul profilo utente |
| **🤝 Partnership** | `/partner add` | Registra e pubblica un nuovo partner |
| | `/partner config` | Configura canale, ruolo ping e requisiti |
| | `/partner stats` | Statistiche e classifica partner manager |
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
├── README.md                  # Documentazione e comandi
├── src/
│   ├── config.js              # Configurazione globale e porte
│   ├── database/              # SQLite database adapter (node:sqlite / WAL)
│   ├── bot/                   # Bot Discord (comandi, eventi e moduli)
│   └── dashboard/             # Server Express e frontend Dashboard
```

---

## 🛡️ Licenza
Distribuito sotto licenza **MIT**.
