import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { DatabaseHelper } from '../../../database/db.js';
import { CONFIG } from '../../../config.js';

// Rod Configurations
const RODS = {
  1: { name: 'Canna di Legno Grezzo', cost: 0, catchBonus: 0, desc: 'Una semplice canna di legno intagliata a mano.' },
  2: { name: 'Canna in Ferro Rinforzato', cost: 300, catchBonus: 10, desc: 'Filo in canapa resistente e amo d\'acciaio.' },
  3: { name: 'Canna d\'Argento Crociato', cost: 1000, catchBonus: 25, desc: 'Benedetta con amuleti, aumenta la probabilità di tesori.' },
  4: { name: 'Canna Sacra del Reale Cavaliere', cost: 3500, catchBonus: 50, desc: 'Forgiata nel fuoco crociato, cattura creature mitiche.' }
};

// Catch Loot Table
const FISH_TABLE = [
  // Common (50%)
  { name: '🐟 Trota di Fiume', rarity: 'Comune', value: 15, weight: 30, emoji: '🐟' },
  { name: '🐟 Carpa Medievale', rarity: 'Comune', value: 20, weight: 25, emoji: '🐟' },
  { name: '🐡 Pesce Gatto Melmoso', rarity: 'Comune', value: 18, weight: 20, emoji: '🐡' },
  // Junk (15%)
  { name: '👢 Vecchio Stivale di Cuoio', rarity: 'Spazzatura', value: 2, weight: 10, emoji: '👢' },
  { name: '🌿 Alga Fradicia', rarity: 'Spazzatura', value: 1, weight: 10, emoji: '🌿' },
  { name: '🥫 Scatoletta Arrugginita', rarity: 'Spazzatura', value: 3, weight: 8, emoji: '🥫' },
  // Rare (20%)
  { name: '🐠 Salmone Dorato', rarity: 'Raro', value: 65, weight: 15, emoji: '🐠' },
  { name: '⚡ Anguilla Elettrica', rarity: 'Raro', value: 85, weight: 12, emoji: '⚡' },
  { name: '🦞 Astice del Fossato Reale', rarity: 'Raro', value: 110, weight: 10, emoji: '🦞' },
  // Epic / Mythic (10%)
  { name: '🦈 Squalo dei Laghi Sacri', rarity: 'Epico', value: 300, weight: 5, emoji: '🦈' },
  { name: '🐉 Piccolo Leviatano dei Crociati', rarity: 'Mitico', value: 750, weight: 2, emoji: '🐉' },
  // Treasures (5%)
  { name: '💎 Rubino dei Cavalieri', rarity: 'Tesoro', value: 250, weight: 4, emoji: '💎' },
  { name: '👑 Corona Perduta nel Fiume', rarity: 'Tesoro', value: 500, weight: 2, emoji: '👑' },
  { name: '🗝️ Forziere Misterioso Antico', rarity: 'Tesoro', value: 1000, weight: 1, emoji: '🗝️' }
];

function getRandomCatch(rodLevel = 1) {
  const bonus = RODS[rodLevel]?.catchBonus || 0;
  
  // Adjust weight based on rod level
  const pool = FISH_TABLE.map(item => {
    let w = item.weight;
    if (item.rarity === 'Raro') w += bonus * 0.3;
    if (item.rarity === 'Epico' || item.rarity === 'Mitico' || item.rarity === 'Tesoro') w += bonus * 0.2;
    if (item.rarity === 'Spazzatura') w = Math.max(1, w - bonus * 0.2);
    return { ...item, calculatedWeight: w };
  });

  const totalWeight = pool.reduce((sum, item) => sum + item.calculatedWeight, 0);
  let random = Math.random() * totalWeight;

  for (const item of pool) {
    if (random < item.calculatedWeight) {
      return item;
    }
    random -= item.calculatedWeight;
  }
  return pool[0];
}

export default {
  data: new SlashCommandBuilder()
    .setName('pesca')
    .setDescription('Minigioco medievale di pesca: cattura pesci, trova tesori e potenzia la tua canna!')
    .addSubcommand(sub =>
      sub
        .setName('lancia')
        .setDescription('Lancia l\'amo nelle acque del regno e pesca!')
    )
    .addSubcommand(sub =>
      sub
        .setName('inventario')
        .setDescription('Mostra il tuo cestino di pesci, monete e canna da pesca')
    )
    .addSubcommand(sub =>
      sub
        .setName('vendi')
        .setDescription('Vendi tutti i pesci e tesori del tuo cestino al mercante del regno')
    )
    .addSubcommand(sub =>
      sub
        .setName('shop')
        .setDescription('Negozio reale delle canne da pesca ed equipaggiamento')
    )
    .addSubcommand(sub =>
      sub
        .setName('upgrade')
        .setDescription('Acquista il prossimo livello della canna da pesca')
    )
    .addSubcommand(sub =>
      sub
        .setName('classifica')
        .setDescription('Classifica dei pescatori più ricchi del server')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const profile = DatabaseHelper.getFishingProfile(interaction.guild.id, interaction.user.id);
    const now = Math.floor(Date.now() / 1000);

    if (subcommand === 'lancia') {
      const cooldown = 30; // 30 seconds cooldown
      const elapsed = now - (profile.last_fished || 0);

      if (elapsed < cooldown) {
        const remaining = cooldown - elapsed;
        return interaction.reply({
          content: `⏳ I pesci sono diffidenti! Attendi ancora **${remaining} secondi** prima di lanciare di nuovo l'amo.`,
          ephemeral: true
        });
      }

      const caught = getRandomCatch(profile.rod_level || 1);
      const inventory = profile.inventory || [];
      inventory.push({
        name: caught.name,
        rarity: caught.rarity,
        value: caught.value,
        emoji: caught.emoji,
        timestamp: now
      });

      profile.inventory = inventory;
      profile.total_fish_caught = (profile.total_fish_caught || 0) + 1;
      profile.last_fished = now;

      // Add leveling XP if leveling enabled
      try {
        DatabaseHelper.addXP(interaction.guild.id, interaction.user.id, 15);
      } catch (e) {}

      DatabaseHelper.saveFishingProfile(interaction.guild.id, interaction.user.id, profile);

      const rarityColors = {
        'Spazzatura': '#64748b',
        'Comune': '#38bdf8',
        'Raro': '#a855f7',
        'Epico': '#ec4899',
        'Mitico': '#eab308',
        'Tesoro': '#10b981'
      };

      const embed = new EmbedBuilder()
        .setColor(rarityColors[caught.rarity] || '#dc2626')
        .setTitle(`🎣 Splendida Cattura, ${interaction.user.username}!`)
        .setDescription(`Hai lanciato la tua **${RODS[profile.rod_level]?.name}** e tirato su:\n\n### ${caught.emoji} **${caught.name}**\n- **Rarità:** \`${caught.rarity}\`\n- **Valore di Mercato:** 🪙 **${caught.value} Monete**\n\n*Il pescato è stato aggiunto al tuo cestino. Usa \`/pesca vendi\` per incassare!*`)
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3076/3076126.png')
        .setFooter({ text: `Pescati Totali: ${profile.total_fish_caught} | Monete: ${profile.coins}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'inventario') {
      const inv = profile.inventory || [];
      const currentRod = RODS[profile.rod_level] || RODS[1];

      let totalValue = 0;
      let itemsSummary = {};

      inv.forEach(item => {
        totalValue += item.value;
        itemsSummary[item.name] = (itemsSummary[item.name] || 0) + 1;
      });

      let invList = Object.entries(itemsSummary).map(([name, count]) => `• **${name}** x${count}`).join('\n');
      if (!invList) invList = '*Il tuo cestino è vuoto. Vai a pescare con `/pesca lancia`!*';

      const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR || '#dc2626')
        .setTitle(`🧺 Cestino da Pesca di ${interaction.user.username}`)
        .addFields(
          { name: '🪙 Monete Reali', value: `\`${profile.coins} Monete\``, inline: true },
          { name: '🎣 Canna Attuale', value: `\`${currentRod.name}\` *(Livello ${profile.rod_level})*`, inline: true },
          { name: '🐟 Catture Totali', value: `\`${profile.total_fish_caught} Pescati\``, inline: true },
          { name: `📦 Contenuto Cestino (${inv.length} oggetti - Valore: 🪙 ${totalValue})`, value: invList }
        )
        .setFooter({ text: 'Il Cavaliere • Economia Medievale', iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'vendi') {
      const inv = profile.inventory || [];
      if (inv.length === 0) {
        return interaction.reply({ content: '❌ Il tuo cestino è vuoto! Non hai pesci o tesori da vendere al mercante.', ephemeral: true });
      }

      let totalGain = 0;
      inv.forEach(item => totalGain += item.value);

      profile.coins = (profile.coins || 0) + totalGain;
      profile.inventory = [];

      DatabaseHelper.saveFishingProfile(interaction.guild.id, interaction.user.id, profile);

      const embed = new EmbedBuilder()
        .setColor('#10b981')
        .setTitle('💰 Vendita al Mercato Reale')
        .setDescription(`Hai venduto **${inv.length}** oggetti del tuo pescato al mercante per un totale di **🪙 ${totalGain} Monete d'Oro**!\n\nIl tuo saldo attuale è di **🪙 ${profile.coins} Monete**.`)
        .setFooter({ text: 'Affare concluso!', iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'shop') {
      let shopDesc = 'Benvenuto al molo dei pescatori! Acquista o potenzia la tua canna da pesca per catturare pesci più rari e tesori leggendari:\n\n';

      Object.entries(RODS).forEach(([lvl, rod]) => {
        const isOwned = profile.rod_level >= parseInt(lvl, 10);
        const status = isOwned ? '✅ *(Posseduta)*' : `🪙 **${rod.cost} Monete**`;
        shopDesc += `### Livello ${lvl}: ${rod.name} ${status}\n${rod.desc}\n*Bonus Fortuna:* \`+${rod.catchBonus}%\`\n\n`;
      });

      const nextLevel = profile.rod_level + 1;
      if (RODS[nextLevel]) {
        shopDesc += `\n👉 *Per acquistare il livello successivo usa* \`/pesca upgrade\` *(Costo: 🪙 ${RODS[nextLevel].cost})*`;
      } else {
        shopDesc += '\n👑 *Hai già raggiunto il livello massimo dell\'equipaggiamento da pesca!*';
      }

      const embed = new EmbedBuilder()
        .setColor('#38bdf8')
        .setTitle('🎣 Bottega del Marinaio Crociato')
        .setDescription(shopDesc)
        .setFooter({ text: `Le tue monete: 🪙 ${profile.coins}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'upgrade') {
      const nextLevel = profile.rod_level + 1;
      const nextRod = RODS[nextLevel];

      if (!nextRod) {
        return interaction.reply({ content: '👑 Possiedi già la canna da pesca di massimo livello!', ephemeral: true });
      }

      if (profile.coins < nextRod.cost) {
        return interaction.reply({
          content: `❌ Monete insufficienti! Ti servono **🪙 ${nextRod.cost} Monete** per acquistare la **${nextRod.name}** (Attualmente possiedi: 🪙 ${profile.coins}).`,
          ephemeral: true
        });
      }

      profile.coins -= nextRod.cost;
      profile.rod_level = nextLevel;

      DatabaseHelper.saveFishingProfile(interaction.guild.id, interaction.user.id, profile);

      const embed = new EmbedBuilder()
        .setColor('#eab308')
        .setTitle('🎉 Upgrade Canna da Pesca Effettuato!')
        .setDescription(`Complimenti! Hai sbloccato la **${nextRod.name}** per **🪙 ${nextRod.cost} Monete**!\n\n*Nuovo Bonus Fortuna:* \`+${nextRod.catchBonus}%\`\nSaldo rimanente: 🪙 **${profile.coins} Monete**.`)
        .setFooter({ text: 'Buona pesca!', iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'classifica') {
      const leaderboard = DatabaseHelper.getFishingLeaderboard(interaction.guild.id, 10);

      if (!leaderboard || leaderboard.length === 0) {
        return interaction.reply({ content: 'Nessun pescatore registrato in questo server.', ephemeral: true });
      }

      let desc = '';
      leaderboard.forEach((entry, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `**#${idx + 1}**`;
        desc += `${medal} <@${entry.user_id}> — 🪙 **${entry.coins} Monete** *(🎣 ${entry.total_fish_caught} pescati)*\n`;
      });

      const embed = new EmbedBuilder()
        .setColor('#eab308')
        .setTitle('🏆 Classifica Pescatori del Reame')
        .setDescription(desc)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};

