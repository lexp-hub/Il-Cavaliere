<div align="center">
  <img src="src/dashboard/public/banner.svg" alt="Sentry" width="100%" />
</div>

<br>

# Sentry

Bot Discord e Sentinella di Sicurezza con AI (Llama 70B), gestione partnership, embed builder, automod e dashboard web per moderatori.

---

## Funzionalità

- **AI**: Risposte alle menzioni con stile medievale e ricerca web.
- **Partnership**: Verifica automatica dei link di invito, requisiti minimi e statistiche.
- **Embed Builder**: Creazione e invio di messaggi embed con pulsanti dalla dashboard.
- **AutoMod**: Filtri anti-spam, anti-invite, anti-link e comandi di moderazione (`/ban`, `/kick`, `/timeout`, `/warn`, `/clear`, `/nuke`).
- **Reaction Roles**: Assegnazione ruoli con pulsanti ed emoji.
- **Welcomer**: Messaggi di benvenuto nei canali e nei DM con auto-role.
- **Tickets**: Apertura ticket privati e transcript.
- **Giveaways & XP**: Concorsi a premi e livelli in chat.

---

## Comandi Slash

| Categoria | Comando | Descrizione |
| :--- | :--- | :--- |
| **AI** | `/ai ask` | Pone una domanda al bot |
| | `/ai search` | Ricerca informazioni sul web |
| | `/ai reset` | Azzera la cronologia del canale |
| | `/ai prompt` | Mostra o modifica il prompt del bot |
| **Generale** | `/help` | Elenco dei comandi |
| | `/ping` | Latenza del bot |
| | `/serverinfo` | Informazioni sul server |
| | `/userinfo` | Informazioni sull'utente |
| **Partnership** | `/partner add` | Registra e invia una partnership |
| | `/partner config` | Imposta canale, ruolo e requisiti |
| | `/partner stats` | Statistiche delle partnership |
| **Embeds** | `/embed send` | Invia un template embed |
| | `/embed create` | Crea un messaggio embed |
| **Reaction Roles** | `/reactionrole button` | Crea pannello ruoli con pulsanti |
| | `/reactionrole list` | Mostra i ruoli interattivi |
| **Welcomer** | `/welcomer config` | Imposta messaggi e canali di benvenuto |
| | `/welcomer autorole` | Imposta i ruoli assegnati all'ingresso |
| **Moderazione** | `/ban`, `/kick` | Banna o espelli un utente |
| | `/timeout` | Mette in timeout temporaneo |
| | `/warn`, `/warnings` | Assegna o visualizza gli avvertimenti |
| | `/clear` | Elimina messaggi |
| | `/lock`, `/unlock` | Blocca o sblocca il canale |
| | `/nuke` | Ricrea il canale |
| **Tickets** | `/ticket panel` | Invia il pannello ticket |
| | `/ticket close` | Chiude il ticket |
| **Giveaways** | `/giveaway start` | Avvia un giveaway |
| | `/giveaway reroll` | Estrae un nuovo vincitore |
| **Leveling** | `/rank` | Mostra il livello e i punti XP |
| | `/leaderboard` | Classifica dei punti XP |

---

## Struttura del Progetto

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

## Licenza
MIT
