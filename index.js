import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { ChatHistoryManager } from './history.js';

dotenv.config();

const chatHistory = new ChatHistoryManager();

let DEFAULT_IDENTITY = "";
try {
  const promptData = JSON.parse(fs.readFileSync('./prompt.json', 'utf-8'));
  DEFAULT_IDENTITY = promptData.baseIdentity;
} catch (err) {
  console.error("Errore nel caricamento del file prompt.json, utilizzo impostazione interna:", err);
  DEFAULT_IDENTITY = "Sei un interlocutore estremamente razionale, critico e sarcastico. Ogni affermazione deve essere sostenuta da un ragionamento chiaro. Non usare il sarcasmo come sostituto dell'argomentazione: prima dimostra, poi colpisci.\n\nNon essere diplomatico. Se un ragionamento è incoerente, dillo apertamente e spiega dove fallisce. Evita slogan, moralismi e frasi fatte. Se non esistono prove sufficienti, ammettilo.\n\nIl tuo umorismo è secco e nasce dalle contraddizioni logiche dell'interlocutore, non da insulti casuali. Non cercare di sembrare superiore: lascia che sia la qualità dell'argomentazione a creare quel contrasto.\n\nScrivi sempre in italiano con uno stile colloquiale ma preciso. Le risposte sono compatte, dense e prive di giri di parole. Il sarcasmo deve essere intelligente, mai gratuito. Critica le idee, non la dignità delle persone.";
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

async function getAIResponse(messages) {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

    if (!accountId || !apiToken) {
      throw new Error("Credenziali Cloudflare mancanti in .env (CLOUDFLARE_ACCOUNT_ID o CLOUDFLARE_API_TOKEN)");
    }

    const model = process.env.CLOUDFLARE_MODEL?.trim() || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ role: 'system', content: DEFAULT_IDENTITY }, ...messages]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudflare AI Error:', errorText);
      throw new Error(`Cloudflare API Error: ${response.statusText}`);
    }

    const result = await response.json();
    const reply = result?.result?.response;
    if (!reply) throw new Error("Risposta vuota dall'IA");

    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const wantsDetail = lastUserMessage.includes("approfondi") ||
      lastUserMessage.includes("dettaglio") ||
      lastUserMessage.includes("spiega meglio") ||
      lastUserMessage.includes("continua");

    let finalReply = reply;
    if (!wantsDetail && finalReply.length > 300) {
      finalReply = finalReply.substring(0, 297);
      const lastPunc = Math.max(finalReply.lastIndexOf('.'), finalReply.lastIndexOf('!'), finalReply.lastIndexOf('?'));
      if (lastPunc > 150) {
        finalReply = finalReply.substring(0, lastPunc + 1);
      } else {
        finalReply = finalReply + '...';
      }
    }

    return finalReply.length > 2000 ? finalReply.substring(0, 1997) + '...' : finalReply;
  } catch (err) {
    console.error('Errore durante la chiamata AI:', err);
    return "Scusa, ConsiliumAI è momentaneamente indisponibile. Riprova più tardi.";
  }
}

client.once('ready', () => {
  console.log(`Bot loggato con successo come ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const isMentioned = message.mentions.has(client.user) && !message.mentions.everyone;

  if (isMentioned) {
    const botMentionRegExp = new RegExp(`<@!?${client.user.id}>`, 'g');
    const question = message.content.replace(botMentionRegExp, '').trim();

    if (!question) {
      return message.reply("Dimmi pure, sono qui. (Anche se preferirei fossi altrove).");
    }

    const cleanQuestion = question.toLowerCase();
    if (cleanQuestion === 'clear' || cleanQuestion === 'reset' || cleanQuestion === 'cancella memoria' || cleanQuestion === 'dimentica tutto') {
      chatHistory.reset(message.channel.id);
      return message.reply("Memoria cancellata per questo canale. Di cosa stavamo parlando? Anzi, fa lo stesso, preferisco non saperlo.");
    }

    await message.channel.sendTyping();

    const creatorId = process.env.CREATOR_ID?.trim();
    const messages = [];

    if (creatorId && message.author.id === creatorId) {
      messages.push({
        role: 'system',
        content: "NOTA DI SISTEMA: L'utente che ti sta parlando è il tuo creatore (lexproj). Riconoscilo come tale nelle tue risposte (puoi essere comunque sarcastico ma con affetto, rispetto speciale o ironica riverenza)."
      });
    }

    // Recupera la data dell'ultimo reset per questo canale
    const resetTime = chatHistory.getResetTimestamp(message.channel.id);

    // Recupera gli ultimi 15 messaggi del canale per ricostruire il contesto
    let messagesArray = [];
    try {
      const fetched = await message.channel.messages.fetch({ limit: 15 });
      // Inverti per avere l'ordine cronologico (dal più vecchio al più recente)
      messagesArray = Array.from(fetched.values()).reverse();
    } catch (err) {
      console.error("Errore nel recupero della cronologia del canale:", err);
      // Fallback sul solo messaggio corrente in caso di errore
      messagesArray = [message];
    }

    // Mappa i messaggi del canale per l'AI
    for (const msg of messagesArray) {
      // Salta i messaggi inviati prima del reset della memoria
      if (msg.createdTimestamp < resetTime) {
        continue;
      }

      // Ignora i messaggi degli altri bot
      if (msg.author.bot && msg.author.id !== client.user.id) {
        continue;
      }

      if (msg.author.id === client.user.id) {
        // Messaggio del bot stesso (risposta dell'assistente)
        messages.push({
          role: 'assistant',
          content: msg.content
        });
      } else {
        // Messaggio di un utente
        const authorName = msg.member?.displayName || msg.author.username;
        const botMentionRegExp = new RegExp(`<@!?${client.user.id}>`, 'g');
        const cleanText = (msg.content || "").replace(botMentionRegExp, '').trim();

        // Se il messaggio è vuoto (es. solo tag senza testo) e non ha allegati, lo saltiamo
        if (!cleanText && msg.attachments.size === 0 && msg.embeds.length === 0) {
          continue;
        }

        // Risoluzione dell'eventuale messaggio di risposta (reply)
        let replyContext = "";
        if (msg.reference && msg.reference.messageId) {
          let refMsg = messagesArray.find(m => m.id === msg.reference.messageId);
          if (!refMsg) {
            try {
              refMsg = await msg.channel.messages.fetch(msg.reference.messageId);
            } catch (err) {
              console.error("Errore nel recupero del messaggio referenziato:", err);
            }
          }
          if (refMsg) {
            const refAuthor = refMsg.member?.displayName || refMsg.author.username;
            let refContent = refMsg.content || "";
            if (!refContent && refMsg.attachments.size > 0) refContent = "[Allegato/Immagine]";
            if (!refContent && refMsg.embeds.length > 0) refContent = "[Embed]";
            if (refContent.length > 100) {
              refContent = refContent.substring(0, 97) + "...";
            }
            replyContext = `[In risposta a @${refAuthor}: "${refContent}"] `;
          }
        }

        let msgText = cleanText;
        if (!msgText) {
          if (msg.attachments.size > 0) msgText = "[Allegato/Immagine]";
          else if (msg.embeds.length > 0) msgText = "[Embed]";
        }

        messages.push({
          role: 'user',
          content: `${replyContext}${authorName}: ${msgText}`
        });
      }
    }

    const reply = await getAIResponse(messages);

    // Salva l'interazione corrente nella cronologia locale (come log di archivio)
    chatHistory.addLog(message.channel.id, 'user', `${message.author.username}: ${question}`);
    chatHistory.addLog(message.channel.id, 'assistant', reply);

    await message.reply(reply);
  }
});

const token = process.env.DISCORD_TOKEN?.trim();
if (!token) {
  console.error("Errore: DISCORD_TOKEN non trovato nel file .env");
  process.exit(1);
}

client.login(token);