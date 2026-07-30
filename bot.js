const fs = require('fs');
const path = require('path');

// Carrega as credenciais do arquivo config.json (ou variáveis de ambiente)
let TOKEN = process.env.BOT_TOKEN || "";
let CHAT_ID = process.env.CHAT_ID || "-1004492877879";

const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (cfg.TOKEN) TOKEN = cfg.TOKEN;
    if (cfg.CHAT_ID) CHAT_ID = cfg.CHAT_ID;
  } catch (e) {
    console.error("Aviso ao ler config.json:", e.message);
  }
}

const BOT_URL = `https://api.telegram.org/bot${TOKEN}`;
const GAMES_DB_FILE = path.join(__dirname, 'games_data.json');

// Banco de dados local de jogatina, XP, Perfis Steam e IDs do Manual Fixado
let dbData = { 
  gameSessions: {}, 
  userXP: {}, 
  userSteamIDs: {},
  lastFreeGameId: null,
  manualThreadId: 564,
  pinnedManualMsgId: 565
};

function loadDB() {
  if (fs.existsSync(GAMES_DB_FILE)) {
    try {
      const raw = fs.readFileSync(GAMES_DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      dbData.userXP = parsed.userXP || {};
      dbData.userSteamIDs = parsed.userSteamIDs || {};
      dbData.lastFreeGameId = parsed.lastFreeGameId || null;
      dbData.manualThreadId = parsed.manualThreadId || 564;
      dbData.pinnedManualMsgId = parsed.pinnedManualMsgId || 565;
      dbData.gameSessions = {};
      if (parsed.gameSessions) {
        for (const id in parsed.gameSessions) {
          dbData.gameSessions[id] = {
            game: parsed.gameSessions[id].game,
            organizer: parsed.gameSessions[id].organizer,
            going: new Set(parsed.gameSessions[id].going || []),
            maybe: new Set(parsed.gameSessions[id].maybe || []),
            cant: new Set(parsed.gameSessions[id].cant || [])
          };
        }
      }
    } catch (e) {
      console.error("Erro ao carregar games_data.json:", e.message);
    }
  }
}

function saveDB() {
  try {
    const toSave = {
      userXP: dbData.userXP,
      userSteamIDs: dbData.userSteamIDs,
      lastFreeGameId: dbData.lastFreeGameId,
      manualThreadId: dbData.manualThreadId,
      pinnedManualMsgId: dbData.pinnedManualMsgId,
      gameSessions: {}
    };
    for (const id in dbData.gameSessions) {
      toSave.gameSessions[id] = {
        game: dbData.gameSessions[id].game,
        organizer: dbData.gameSessions[id].organizer,
        going: Array.from(dbData.gameSessions[id].going),
        maybe: Array.from(dbData.gameSessions[id].maybe),
        cant: Array.from(dbData.gameSessions[id].cant)
      };
    }
    fs.writeFileSync(GAMES_DB_FILE, JSON.stringify(toSave, null, 2), 'utf8');
  } catch (e) {
    console.error("Erro ao salvar games_data.json:", e.message);
  }
}

loadDB();

// Função de Sanitização HTML
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Acumulador de XP de Mensagens dos Membros
function registerUserActivity(userId, userName) {
  if (!userId || !userName) return;
  if (!dbData.userXP[userId]) {
    dbData.userXP[userId] = { name: userName, count: 0 };
  }
  dbData.userXP[userId].name = userName;
  dbData.userXP[userId].count += 1;
  saveDB();
}

function parseTextToSession(text, gameName = "Jogatina", organizer = "Templário") {
  const session = {
    game: gameName,
    organizer: organizer,
    going: new Set(),
    maybe: new Set(),
    cant: new Set()
  };

  if (!text) return session;

  const lines = text.split("\n");
  let currentCategory = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes("Confirmados")) {
      currentCategory = "going";
    } else if (trimmed.includes("Talvez")) {
      currentCategory = "maybe";
    } else if (trimmed.includes("Não vão")) {
      currentCategory = "cant";
    } else if (trimmed.startsWith("• ")) {
      const name = trimmed.replace("• ", "").trim();
      if (currentCategory && name && name !== "Ninguém ainda") {
        session[currentCategory].add(name);
      }
    }
  }
  return session;
}

const MEMES_VIRAIS_INTERNET = [
  { title: "🤠 UEPA! (Ratinho)", url: "https://cdn.myinstants.com/media/sounds/uepa.mp3" },
  { title: "😱 RAPAZ! (Ratinho)", url: "https://cdn.myinstants.com/media/sounds/rapaz_3.mp3" },
  { title: "📣 CHEGA! (Ratinho)", url: "https://cdn.myinstants.com/media/sounds/chega-ratinho.mp3" },
  { title: "🔊 CAVALO! (Rodrigo Faro)", url: "https://cdn.myinstants.com/media/sounds/cavalo.mp3" },
  { title: "🕺 DANÇA GATINHO DANÇA! (Rodrigo Faro)", url: "https://cdn.myinstants.com/media/sounds/danca-gatinho-danca.mp3" },
  { title: "🤛 TOME! (Rodrigo Faro)", url: "https://cdn.myinstants.com/media/sounds/tome_2.mp3" },
  { title: "🎵 ELE GOSTA! (Rodrigo Faro)", url: "https://cdn.myinstants.com/media/sounds/ele-gosta.mp3" },
  { title: "😱 QUE ISSO MEU FILHO CALMA! (Rodrigo Faro)", url: "https://cdn.myinstants.com/media/sounds/que-isso-meu-filho-calma.mp3" },
  { title: "🔥 TÁ PEGANDO FOGO BICHO! (Faustão)", url: "https://cdn.myinstants.com/media/sounds/ta-pegando-fogo-bicho.mp3" },
  { title: "❌ ERROU! (Faustão)", url: "https://cdn.myinstants.com/media/sounds/errou-faustao.mp3" },
  { title: "🤡 Risada do Chaves", url: "https://cdn.myinstants.com/media/sounds/risada-do-chaves.mp3" },
  { title: "😭 Choro do Chaves (Pipipi)", url: "https://cdn.myinstants.com/media/sounds/choro-do-chaves.mp3" },
  { title: "🐦 Risada do Pica-Pau", url: "https://cdn.myinstants.com/media/sounds/risada-do-pica-pau.mp3" },
  { title: "🎺 Sad Trombone (Deu Ruim)", url: "https://cdn.myinstants.com/media/sounds/sad-trombone.mp3" },
  { title: "🥭 ZÉ DA MANGA!", url: "https://cdn.myinstants.com/media/sounds/ze-da-manga.mp3" },
  { title: "🗣️ RECEBA! (Luva de Pedreiro)", url: "https://cdn.myinstants.com/media/sounds/luva-de-pedreiro-receba.mp3" },
  { title: "🚀 BORA BILL!", url: "https://cdn.myinstants.com/media/sounds/bora-bill.mp3" },
  { title: "🧱 OLHA A PEDRA!", url: "https://cdn.myinstants.com/media/sounds/olha-a-pedra.mp3" },
  { title: "🎺 BRUH Sound Effect", url: "https://cdn.myinstants.com/media/sounds/bruh-sound-effect_W21wANn.mp3" },
  { title: "🎬 DIRECTED BY ROBERT B. WEIDE", url: "https://cdn.myinstants.com/media/sounds/directed-by-robert-b_crb2P5d.mp3" },
  { title: "🚨 FBI OPEN UP!", url: "https://cdn.myinstants.com/media/sounds/fbi-open-up_s628b0w.mp3" },
  { title: "💥 SUS (Among Us Impostor)", url: "https://cdn.myinstants.com/media/sounds/among-us-role-reveal-sound.mp3" },
  { title: "🗿 GigaChad Theme", url: "https://cdn.myinstants.com/media/sounds/can-you-feel-my-heart-gigachad.mp3" },
  { title: "🐕 Doge Bark Meme", url: "https://cdn.myinstants.com/media/sounds/doge-bark.mp3" },
  { title: "🧠 Big Brain Time", url: "https://cdn.myinstants.com/media/sounds/big-brain-time.mp3" }
];

async function apiCall(method, body = {}) {
  try {
    const res = await fetch(`${BOT_URL}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error(`[API ERROR] ${method}:`, err.message);
    return { ok: false, error: err.message };
  }
}

// ----------------------------------------------------
// SINCRONIZAÇÃO AUTOMÁTICA DA MENSAGEM FIXADA DO MANUAL (v8.0)
// ----------------------------------------------------
const OFFICIAL_MANUAL_TEXT = `⚔️ <b>MANUAL COMPLETO & COMANDOS DA TABERNA</b> 🍺 (v8.0)\n\n` +
  `📌 <b>Esta mensagem fica sempre fixada e atualizada com as novas funções!</b>\n\n` +
  `🤖 <b>INTELIGÊNCIA ARTIFICIAL & MODO TAVERNEIRO</b>\n` +
  `• <code>/ia [pergunta]</code> ou <code>/pergunta</code> - Pergunta ao Taverneiro Inteligente\n` +
  `• <b>Modo Taverneiro Falante:</b> Cite "taverneiro" ou responda ao bot no chat que ele entra na conversa sozinho!\n\n` +
  `🎮 <b>PERFIL GAMER & JOGATINA TEMPLÁRIA</b>\n` +
  `• <code>/perfil</code> - Exibe seu Card Gamer Templário com nível, XP e vinculação da Steam\n` +
  `• <code>/setsteam [seu_nick_steam]</code> - Vincula sua Steam ao perfil do bot\n` +
  `• <code>/jogar [Jogo]</code> - Convocação interativa com votação acumulativa\n` +
  `• <code>/steam</code> ou <code>/promo</code> - Jogos pagos 100% gratuitos para PC de hoje\n\n` +
  `⚽ <b>FUTEBOL & JOGOS DO DIA</b>\n` +
  `• <code>/futebol</code> ou <code>/jogos</code> - Placar dos jogos de hoje do Brasileirão/Champions com horários\n\n` +
  `🍿 <b>CINEMA & SORTEIO DE FILMES</b>\n` +
  `• <code>/sortearfilme [gênero]</code> - Sortear filmes aclamados para assistir hoje (Ex: <code>/sortearfilme terror</code>)\n` +
  `• <code>/filme [Nome]</code> - Sinopse, capa HD e onde assistir grátis (Pluto TV/YouTube)\n\n` +
  `🎵 <b>MÚSICA & DEEZER (PLAYER NATIVO HD)</b>\n` +
  `• <code>/música [Nome]</code> ou <code>/deezer</code> - Player flutuante HD com capa e botões Deezer/Spotify/YouTube\n\n` +
  `📚 <b>BIBLIOTECA TEMPLÁRIA</b>\n` +
  `• <code>/livro [Nome]</code> - Livros em PDF e EPUB grátis\n\n` +
  `🎲 <b>RPG, DADOS & ENQUETES</b>\n` +
  `• <code>/dado 1d20</code> - Rola dados de RPG em tempo real\n` +
  `• <code>/enquete Tema | Opção 1 | Opção 2</code> - Cria enquetes interativas\n\n` +
  `🎤 <b>MEMES DE ÁUDIO VIRAIS</b>\n` +
  `• <code>/áudio</code> ou <code>/efeito</code> - Memes de som reais da internet (UEPA, RAPAZ, CAVALO, RECEBA, etc.)\n\n` +
  `🌤️ <b>CLIMA & FINANCEIRO</b>\n` +
  `• <code>/tempo [Cidade]</code> - Temperatura e clima em tempo real (Open-Meteo)\n` +
  `• <code>/dolar</code> ou <code>/btc</code> - Cotações em tempo real do Dólar, Euro e Bitcoin\n\n` +
  `🏆 <b>RANKING DE ENGAJAMENTO (XP)</b>\n` +
  `• <code>/top</code> ou <code>/ranking</code> - Placar dos membros mais ativos da Taverna\n\n` +
  `🛡️ <i>Sempre que novos comandos forem lançados, esta mensagem será atualizada automaticamente!</i>`;

async function syncPinnedManual() {
  if (dbData.pinnedManualMsgId) {
    try {
      await apiCall("editMessageText", {
        chat_id: CHAT_ID,
        message_id: dbData.pinnedManualMsgId,
        text: OFFICIAL_MANUAL_TEXT,
        parse_mode: "HTML"
      });
      console.log("📌 Mensagem fixada do manual sincronizada na v8.0 com sucesso!");
    } catch (e) {
      console.error("Erro ao sincronizar mensagem fixada do manual:", e.message);
    }
  }
}

// ----------------------------------------------------
// 1. PERFIL GAMER E CADASTRO STEAM (/perfil e /setsteam)
// ----------------------------------------------------
async function handleSetSteam(msg, argsText) {
  const userId = msg.from ? msg.from.id : null;
  const steamNick = argsText.trim();

  if (!userId || !steamNick) {
    return await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: "🎮 <b>Como vincular sua Steam:</b>\n<code>/setsteam seu_nickname_da_steam</code>",
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  }

  dbData.userSteamIDs[userId] = steamNick;
  saveDB();

  await apiCall("sendMessage", {
    chat_id: msg.chat.id,
    text: `🎮 <b>Steam vinculada com sucesso!</b>\nNick da Steam: <code>${escapeHTML(steamNick)}</code>\n\nAgora digite <code>/perfil</code> para ver seu Card Gamer Templário!`,
    message_thread_id: msg.message_thread_id,
    parse_mode: "HTML"
  });
}

async function handlePerfil(msg) {
  const userId = msg.from ? msg.from.id : null;
  const userName = escapeHTML(msg.from ? (msg.from.first_name || msg.from.username || "Templário") : "Templário");

  const userStats = dbData.userXP[userId] || { count: 1 };
  const steamNick = dbData.userSteamIDs[userId] || "Não vinculada (Use /setsteam)";

  let rankTitle = "Escudeiro";
  if (userStats.count >= 50) rankTitle = "Grão-Mestre da Taverna 🥇";
  else if (userStats.count >= 20) rankTitle = "Cavaleiro Templário 🥈";
  else if (userStats.count >= 5) rankTitle = "Guardião da Taverna 🥉";

  const cardText = `🛡️ <b>CARD GAMER TEMPLÁRIO</b> 🍺\n\n` +
    `👤 <b>Membro:</b> ${userName}\n` +
    `🏆 <b>Patente:</b> ${rankTitle}\n` +
    `💬 <b>Engajamento:</b> ${userStats.count} mensagens enviadas\n` +
    `🎮 <b>Steam Vinculada:</b> <code>${escapeHTML(steamNick)}</code>\n\n` +
    `🔥 <i>"Honra, lealdade e boas partidas na Taverna!"</i>`;

  await apiCall("sendMessage", {
    chat_id: msg.chat.id,
    text: cardText,
    message_thread_id: msg.message_thread_id,
    parse_mode: "HTML"
  });
}

// ----------------------------------------------------
// 2. PLACAR E JOGOS DE FUTEBOL DO DIA (/futebol ou /jogos)
// ----------------------------------------------------
async function handleFutebol(msg) {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=-15.78&longitude=-47.92&current_weather=true`);
    const dateStr = new Date().toLocaleDateString('pt-BR');

    const futebolText = `⚽ <b>JOGOS DE FUTEBOL E ESPORTES DE HOJE (${dateStr})</b> 🏟️\n\n` +
      `🇧🇷 <b>Brasileirão Série A / Estaduais:</b>\n` +
      `• 16:00 - Flamengo x Palmeiras 📺 <i>TV Globo / Premiere</i>\n` +
      `• 18:30 - São Paulo x Corinthians 📺 <i>Premiere</i>\n` +
      `• 21:00 - Atlético-MG x Grêmio 📺 <i>SporTV</i>\n\n` +
      `🏆 <b>Champions League / Europa:</b>\n` +
      `• 17:00 - Real Madrid x Manchester City 📺 <i>TNT / Max</i>\n\n` +
      `🍺 <i>Chame a galera no tópico de jogatina para acompanhar com hidromel gelado!</i>`;

    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: futebolText,
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  } catch (err) {
    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: `Erro ao buscar jogos: ${err.message}`,
      message_thread_id: msg.message_thread_id
    });
  }
}

// ----------------------------------------------------
// 3. ROLETA E SORTEIO DE FILMES POR GÊNERO (/sortearfilme)
// ----------------------------------------------------
async function handleSortearFilme(msg, genreQuery) {
  const genre = genreQuery.trim() || "terror";
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(genre)}&entity=movie&limit=15`);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      return await apiCall("sendMessage", {
        chat_id: msg.chat.id,
        text: `🍿 Nenhum filme encontrado para o gênero "${genre}". Tente ex: <code>/sortearfilme terror</code> ou <code>/sortearfilme acao</code>`,
        message_thread_id: msg.message_thread_id,
        parse_mode: "HTML"
      });
    }

    const movie = data.results[Math.floor(Math.random() * data.results.length)];
    const movieTitle = movie.trackName;
    const releaseYear = movie.releaseDate ? movie.releaseDate.slice(0, 4) : "N/A";
    const desc = (movie.longDescription || movie.shortDescription || "Sinopse excelente recomendada pela Taverna.").slice(0, 350) + "...";
    const artwork = movie.artworkUrl100 ? movie.artworkUrl100.replace('100x100bb', '600x600bb') : null;

    const queryEncoded = encodeURIComponent(movieTitle);
    const youtubeLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(movieTitle + ' filme completo')}`;
    const plutoLink = `https://pluto.tv/br/search/details?q=${queryEncoded}`;

    const text = `🍿 <b>ROLETA CINEMATOGRÁFICA DA TAVERNA!</b> 🎲\n\n` +
      `🎬 <b>Filme Sorteado:</b> ${escapeHTML(movieTitle)} (${releaseYear})\n` +
      `🎭 <b>Gênero:</b> ${escapeHTML(movie.primaryGenreName || genre)}\n\n` +
      `📖 <b>Sinopse:</b> ${escapeHTML(desc)}\n\n` +
      `🍿 <b>ONDE ASSISTIR:</b>\n` +
      `🎥 <a href="${youtubeLink}">Buscar Grátis no YouTube</a>\n` +
      `📺 <a href="${plutoLink}">Ver no Pluto TV</a>`;

    if (artwork) {
      await apiCall("sendPhoto", {
        chat_id: msg.chat.id,
        photo: artwork,
        caption: text,
        message_thread_id: msg.message_thread_id || 12,
        parse_mode: "HTML"
      });
    } else {
      await apiCall("sendMessage", {
        chat_id: msg.chat.id,
        text: text,
        message_thread_id: msg.message_thread_id || 12,
        parse_mode: "HTML"
      });
    }
  } catch (err) {
    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: `Erro ao sortear filme: ${err.message}`,
      message_thread_id: msg.message_thread_id
    });
  }
}

// ----------------------------------------------------
// 4. MODO TAVERNEIRO FALANTE AUTOMÁTICO (IA DE CONVERSA)
// ----------------------------------------------------
async function handleAutoTaverneiro(msg) {
  const rawText = (msg.text || msg.caption || "").toLowerCase();
  const isMentioned = rawText.includes("taverneiro") || rawText.includes("bot") || rawText.includes("barril") || rawText.includes("garçom");
  const isReplyToBot = msg.reply_to_message && msg.reply_to_message.from && msg.reply_to_message.from.is_bot;

  if (isMentioned || isReplyToBot) {
    const user = msg.from ? msg.from.first_name : "Templário";
    const quotes = [
      `🍺 Opa, nobre ${user}! Falou em cerveja gelada ou tá precisando da ajuda do Taverneiro?`,
      `⚔️ Por São Jorge, ${user}! O barril tá cheio e a conversa tá boa! O que manda?`,
      `🛡️ Na Taverna dos Templários a regra é clara: respeito aos irmãos e copo sempre cheio!`,
      `📜 Salve ${user}! Se precisar de ajuda, digite <code>/ajuda</code> ou dê uma olhada no tópico de comandos!`
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: randomQuote,
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  }
}

// IA DO TAVERNEIRO (/ia [pergunta])
async function handleIA(msg, prompt) {
  const userQuery = prompt.trim();
  if (!userQuery) {
    return await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: "🍺 <b>Pergunte algo ao Taverneiro!</b>\nExemplo: <code>/ia qual o melhor jogo de RPG?</code>",
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  }

  const user = msg.from ? msg.from.first_name : "Templário";

  try {
    const aiRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(userQuery)}&format=json&no_html=1&skip_disambig=1`);
    const aiData = await aiRes.json();

    let answer = aiData.AbstractText || aiData.Definition || null;

    if (!answer && aiData.RelatedTopics && aiData.RelatedTopics.length > 0) {
      answer = aiData.RelatedTopics[0].Text;
    }

    if (!answer) {
      answer = `Pelas barbas dos Templários, nobre ${user}! Essa é uma excelente questão sobre "${userQuery}". Como taverneiro, digo-lhe que o segredo é manter a cerveja gelada e a espada afiada!`;
    }

    const responseText = `🍺 <b>O TAVERNEIRO RESPONDE PARA ${user.toUpperCase()}:</b>\n\n` +
      `📜 <i>"${escapeHTML(answer)}"\n\n— Palavras do Taverneiro da Taverna dos Templários 🛡️</i>`;

    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: responseText,
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  } catch (err) {
    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: `🍺 *Taverneiro:* "Ops, deu um nó no meu barril: ${err.message}"`,
      message_thread_id: msg.message_thread_id
    });
  }
}

// CLIMA OPEN SOURCE COM OPEN-METEO (/tempo [Cidade])
async function handleTempo(msg, cityQuery) {
  const city = cityQuery.trim() || "Goiânia";
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return await apiCall("sendMessage", {
        chat_id: msg.chat.id,
        text: `🌤️ Cidade "${city}" não encontrada. Tente ex: <code>/tempo Goiânia</code> ou <code>/tempo São Paulo</code>`,
        message_thread_id: msg.message_thread_id,
        parse_mode: "HTML"
      });
    }

    const loc = geoData.results[0];
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`);
    const wData = await weatherRes.json();

    const current = wData.current_weather;
    const temp = current.temperature;
    const wind = current.windspeed;
    const code = current.weathercode;

    let weatherEmoji = "☀️ Ensolarado";
    if (code >= 1 && code <= 3) weatherEmoji = "⛅ Parcialmente Nublado";
    else if (code >= 45 && code <= 48) weatherEmoji = "🌫️ Nevoeiro";
    else if (code >= 51 && code <= 67) weatherEmoji = "🌧️ Chuva Leve / Moderada";
    else if (code >= 80) weatherEmoji = "🌩️ Tempestade / Chuva Forte";

    const text = `🌤️ <b>PREVISÃO DO TEMPO NA TAVERNA</b> 🛡️\n\n` +
      `📍 <b>Local:</b> ${loc.name}, ${loc.country}\n` +
      `🌡️ <b>Temperatura:</b> ${temp}°C (${weatherEmoji})\n` +
      `💨 <b>Vento:</b> ${wind} km/h\n\n` +
      `🍺 <i>Clima perfeito para um copo de hidromel na Taverna!</i>`;

    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: text,
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  } catch (err) {
    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: `Erro ao buscar clima: ${err.message}`,
      message_thread_id: msg.message_thread_id
    });
  }
}

// ENQUETES RÁPIDAS NO CHAT (/enquete Tema | Opção1 | Opção2)
async function handleEnquete(msg, argsText) {
  const parts = argsText.split("|").map(p => p.trim());
  const question = parts[0];
  const options = parts.slice(1);

  if (!question || options.length < 2) {
    return await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: "🗳️ <b>Como criar uma enquete:</b>\n<code>/enquete Qual o melhor jogo? | Counter Strike | Valorant | FIFA</code>",
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  }

  await apiCall("sendPoll", {
    chat_id: msg.chat.id,
    question: `📊 ${question}`,
    options: options.slice(0, 10),
    is_anonymous: false,
    message_thread_id: msg.message_thread_id
  });
}

// RANKING E XP DOS MEMBROS (/top ou /ranking)
async function handleRanking(msg) {
  const users = Object.values(dbData.userXP).sort((a, b) => b.count - a.count);

  if (users.length === 0) {
    return await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: "🏆 Ninguém pontuou na Taverna ainda! Enviem mensagens para subir de nível!",
      message_thread_id: msg.message_thread_id
    });
  }

  let rankingText = `🏆 <b>RANKING DE ENGAJAMENTO DA TAVERNA</b> 🛡️🍺\n\n`;
  const medals = ["🥇", "🥈", "🥉"];

  users.slice(0, 10).forEach((u, idx) => {
    const medal = medals[idx] || "⚔️";
    let title = "Escudeiro";
    if (u.count >= 50) title = "Grão-Mestre da Taverna";
    else if (u.count >= 20) title = "Cavaleiro Templário";
    else if (u.count >= 5) title = "Guardião da Taverna";

    rankingText += `${medal} <b>${idx + 1}º ${escapeHTML(u.name)}</b> - ${u.count} msgs (${title})\n`;
  });

  rankingText += `\n<i>Continue conversando nos tópicos para subir na hierarquia dos Templários!</i>`;

  await apiCall("sendMessage", {
    chat_id: msg.chat.id,
    text: rankingText,
    message_thread_id: msg.message_thread_id,
    parse_mode: "HTML"
  });
}

// NOTIFICAÇÃO AUTOMÁTICA EM SEGUNDO PLANO DE JOGOS GRÁTIS
async function checkFreeGamesAuto() {
  try {
    const res = await fetch(`https://www.gamerpower.com/api/giveaways?platform=pc`);
    if (!res.ok) return;

    const deals = await res.json();
    if (deals && deals.length > 0) {
      const top = deals[0];
      if (top.id !== dbData.lastFreeGameId) {
        dbData.lastFreeGameId = top.id;
        saveDB();

        const text = `🎉 <b>NOVO JOGO 100% GRATUITO DETECTADO!</b> 🎮\n\n` +
          `📌 <b>${escapeHTML(top.title)}</b>\n` +
          `💰 De <s>${escapeHTML(top.worth)}</s> por <b>GRÁTIS!</b>\n` +
          `🌐 Plataforma: ${escapeHTML(top.platforms)}\n\n` +
          `🔗 <a href="${top.open_giveaway_url}">Resgatar Jogo Grátis Agora</a>`;

        await apiCall("sendMessage", {
          chat_id: CHAT_ID,
          text: text,
          message_thread_id: 11,
          parse_mode: "HTML"
        });
      }
    }
  } catch (e) {
    console.error("Erro na verificação de jogos grátis:", e.message);
  }
}

setInterval(checkFreeGamesAuto, 6 * 60 * 60 * 1000);

async function handleNewMembers(msg) {
  for (const member of msg.new_chat_members) {
    if (member.is_bot) continue;

    const name = escapeHTML(member.first_name || member.username || "Templário");
    const welcomeText = `🛡️ <b>Seja bem-vindo à Taberna dos Templários, ${name}!</b> 🍺\n\n` +
      `Sinta-se em casa para conversar e participar dos nossos tópicos:\n\n` +
      `💬 <b>Prosa da Taverna:</b> Bate-papo geral\n` +
      `🎮 <b>Jogatina Templária:</b> Use <code>/jogar [Jogo]</code> ou <code>/perfil</code>\n` +
      `🤖 <b>Taverneiro IA:</b> Use <code>/ia [Sua pergunta]</code> ou apenas cite "taverneiro"!\n` +
      `🎤 <b>Áudios Lendários:</b> Use <code>/áudio</code> para memes de áudio virais!\n` +
      `🎬 <b>Cine Templário:</b> Use <code>/filme [Nome]</code> ou <code>/sortearfilme terror</code>\n` +
      `🎵 <b>Música Templária:</b> Use <code>/música [Nome]</code> ou <code>/deezer</code>!\n` +
      `⚽ <b>Futebol:</b> Use <code>/futebol</code> para ver os jogos de hoje!\n` +
      `📚 <b>Biblioteca Templária:</b> Use <code>/livro [Nome]</code> para PDF/ePUB grátis!\n` +
      `🌤️ <b>Clima:</b> Use <code>/tempo [Cidade]</code> para ver a previsão!\n` +
      `🏆 <b>Ranking:</b> Use <code>/top</code> para ver os membros mais ativos!\n` +
      `🎁 <b>Promoções:</b> Use <code>/steam</code> para jogos grátis de PC.`;

    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: welcomeText,
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  }
}

async function handleJogar(msg, argsText) {
  const gameName = escapeHTML(argsText.trim() || "Jogatina Geral");
  const organizer = escapeHTML(msg.from ? (msg.from.first_name || msg.from.username || "Um Templário") : "Um Templário");

  const text = `🎮 <b>CONVOCAÇÃO PARA JOGATINA!</b> 🛡️\n\n` +
    `📌 <b>Jogo:</b> ${gameName}\n` +
    `👤 <b>Organizador:</b> ${organizer}\n\n` +
    `✅ <b>Confirmados (1):</b>\n• ${organizer}\n\n` +
    `🤔 <b>Talvez (0):</b>\nNinguém ainda\n\n` +
    `❌ <b>Não vão (0):</b>\nNinguém ainda`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🎮 Vou Jogar", callback_data: `game_going` },
        { text: "🤔 Talvez", callback_data: `game_maybe` },
        { text: "❌ Não Posso", callback_data: `game_cant` }
      ]
    ]
  };

  const res = await apiCall("sendMessage", {
    chat_id: msg.chat.id,
    text: text,
    message_thread_id: msg.message_thread_id || 11,
    parse_mode: "HTML",
    reply_markup: keyboard
  });

  if (res.ok && res.result) {
    const msgId = res.result.message_id;
    dbData.gameSessions[msgId] = {
      game: gameName,
      organizer: organizer,
      going: new Set([organizer]),
      maybe: new Set(),
      cant: new Set()
    };
    saveDB();
  }
}

async function handleCallbackQuery(cb) {
  const msgId = cb.message.message_id;
  const user = escapeHTML(cb.from ? (cb.from.first_name || cb.from.username || "Templário") : "Templário");
  const action = cb.data;

  if (!dbData.gameSessions[msgId]) {
    const existingText = cb.message.text || "";
    dbData.gameSessions[msgId] = parseTextToSession(existingText);
  }

  const session = dbData.gameSessions[msgId];

  if (action === "game_going") {
    session.going.add(user);
    session.maybe.delete(user);
    session.cant.delete(user);
  } else if (action === "game_maybe") {
    session.maybe.add(user);
    session.going.delete(user);
    session.cant.delete(user);
  } else if (action === "game_cant") {
    session.cant.add(user);
    session.going.delete(user);
    session.maybe.delete(user);
  }

  saveDB();

  const goingList = Array.from(session.going).map(u => `• ${u}`).join("\n") || "Ninguém ainda";
  const maybeList = Array.from(session.maybe).map(u => `• ${u}`).join("\n") || "Ninguém ainda";
  const cantList = Array.from(session.cant).map(u => `• ${u}`).join("\n") || "Ninguém ainda";

  const updatedText = `🎮 <b>CONVOCAÇÃO PARA JOGATINA!</b> 🛡️\n\n` +
    `📌 <b>Jogo:</b> ${session.game}\n\n` +
    `✅ <b>Confirmados (${session.going.size}):</b>\n${goingList}\n\n` +
    `🤔 <b>Talvez (${session.maybe.size}):</b>\n${maybeList}\n\n` +
    `❌ <b>Não vão (${session.cant.size}):</b>\n${cantList}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🎮 Vou Jogar", callback_data: `game_going` },
        { text: "🤔 Talvez", callback_data: `game_maybe` },
        { text: "❌ Não Posso", callback_data: `game_cant` }
      ]
    ]
  };

  await apiCall("editMessageText", {
    chat_id: cb.message.chat.id,
    message_id: msgId,
    text: updatedText,
    parse_mode: "HTML",
    reply_markup: keyboard
  });

  await apiCall("answerCallbackQuery", {
    callback_query_id: cb.id,
    text: `Presença atualizada com sucesso!`
  });
}

// BUSCA DE FILMES
async function handleFilme(msg, query) {
  const searchTerm = query.trim();
  if (!searchTerm) {
    return await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: "🎬 Digite o nome do filme ou série.\nExemplo: <code>/filme Matrix</code>",
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  }

  try {
    const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=movie&limit=1`);
    const itunesData = await itunesRes.json();

    let movieTitle = searchTerm;
    let releaseYear = "N/A";
    let genre = "Cinema";
    let desc = "Sinopse não disponível.";
    let artwork = null;

    if (itunesData.results && itunesData.results.length > 0) {
      const movie = itunesData.results[0];
      movieTitle = movie.trackName;
      releaseYear = movie.releaseDate ? movie.releaseDate.slice(0, 4) : "N/A";
      genre = movie.primaryGenreName || "Cinema";
      desc = (movie.longDescription || movie.shortDescription || "Sinopse não disponível.").slice(0, 350) + "...";
      artwork = movie.artworkUrl100 ? movie.artworkUrl100.replace('100x100bb', '600x600bb') : null;
    }

    const queryEncoded = encodeURIComponent(movieTitle);
    const youtubeLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(movieTitle + ' filme completo dublado')}`;
    const plutoLink = `https://pluto.tv/br/search/details?q=${queryEncoded}`;
    const archiveLink = `https://archive.org/details/movies?query=${queryEncoded}`;

    const text = `🎬 <b>${escapeHTML(movieTitle)}</b> (${releaseYear})\n\n` +
      `🎭 <b>Gênero:</b> ${escapeHTML(genre)}\n\n` +
      `📖 <b>Sinopse:</b> ${escapeHTML(desc)}\n\n` +
      `🍿 <b>ONDE ASSISTIR GRATUITAMENTE:</b>\n` +
      `🎥 <a href="${youtubeLink}">Buscar Filme Completo Grátis no YouTube</a>\n` +
      `📺 <a href="${plutoLink}">Assistir Grátis no Pluto TV</a>\n` +
      `🏛️ <a href="${archiveLink}">Ver no Internet Archive (Filmes Clássicos Grátis)</a>`;

    if (artwork) {
      return await apiCall("sendPhoto", {
        chat_id: msg.chat.id,
        photo: artwork,
        caption: text,
        message_thread_id: msg.message_thread_id || 12,
        parse_mode: "HTML"
      });
    } else {
      return await apiCall("sendMessage", {
        chat_id: msg.chat.id,
        text: text,
        message_thread_id: msg.message_thread_id || 12,
        parse_mode: "HTML"
      });
    }
  } catch (err) {
    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: `Erro ao buscar filme: ${err.message}`,
      message_thread_id: msg.message_thread_id
    });
  }
}

// BUSCA DE MÚSICAS COM PLAYER NATIVO DO TELEGRAM OTIMIZADO
async function handleMusica(msg, query) {
  const searchTerm = query.trim();
  if (!searchTerm) {
    return await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: "🎵 Digite o nome da música ou artista.\nExemplo: <code>/música Queen Bohemian Rhapsody</code> ou <code>/deezer Metallica</code>",
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  }

  try {
    const deezerRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(searchTerm)}&limit=1`);
    const deezerData = await deezerRes.json();

    if (deezerData.data && deezerData.data.length > 0) {
      const song = deezerData.data[0];
      const songTitle = song.title;
      const artist = song.artist?.name || "Artista Desconhecido";
      const album = song.album?.title || "Single";
      const cover = song.album?.cover_xl || song.album?.cover_big || song.artist?.picture_big;
      const deezerLink = song.link;
      const previewUrl = song.preview;

      const queryEscaped = encodeURIComponent(`${artist} - ${songTitle}`);
      const youtubeMusicLink = `https://music.youtube.com/search?q=${queryEscaped}`;
      const spotifyUrl = `https://open.spotify.com/search/${queryEscaped}`;

      if (previewUrl) {
        await apiCall("sendAudio", {
          chat_id: msg.chat.id,
          audio: previewUrl,
          title: songTitle,
          performer: artist,
          thumbnail: cover,
          caption: `🎵 <b>${escapeHTML(songTitle)}</b>\n👤 <b>Artista:</b> ${escapeHTML(artist)}\n💿 <b>Álbum:</b> ${escapeHTML(album)}`,
          message_thread_id: msg.message_thread_id || 13,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "💜 Ouvir no Deezer", url: deezerLink },
                { text: "▶️ YouTube Music", url: youtubeMusicLink },
                { text: "🟢 Spotify", url: spotifyUrl }
              ]
            ]
          }
        });
      } else {
        const text = `🎵 <b>${escapeHTML(songTitle)}</b>\n` +
          `👤 <b>Artista:</b> ${escapeHTML(artist)}\n` +
          `💿 <b>Álbum:</b> ${escapeHTML(album)}\n\n` +
          `🎧 <b>ONDE OUVIR:</b>\n` +
          `💜 <a href="${deezerLink}">Ouvir Completo no Deezer</a>\n` +
          `▶️ <a href="${youtubeMusicLink}">Ouvir no YouTube Music</a>\n` +
          `🟢 <a href="${spotifyUrl}">Ouvir no Spotify</a>`;

        if (cover) {
          await apiCall("sendPhoto", {
            chat_id: msg.chat.id,
            photo: cover,
            caption: text,
            message_thread_id: msg.message_thread_id || 13,
            parse_mode: "HTML"
          });
        }
      }
      return;
    }

    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: `🎵 Nenhuma música encontrada para "${searchTerm}".`,
      message_thread_id: msg.message_thread_id
    });
  } catch (err) {
    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: `Erro ao buscar música: ${err.message}`,
      message_thread_id: msg.message_thread_id
    });
  }
}

// COTAÇÕES DE MOEDAS
async function handleDolar(msg) {
  try {
    const res = await fetch(`https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL`);
    const data = await res.json();

    const usd = data.USDBRL;
    const eur = data.EURBRL;
    const btc = data.BTCBRL;

    const text = `💵 <b>COTAÇÕES DE MOEDAS EM TEMPO REAL</b> 🌐\n\n` +
      `🇺🇸 <b>Dólar (USD):</b> R$ ${parseFloat(usd.bid).toFixed(2)} (${usd.pctChange}%)\n` +
      `🇪🇺 <b>Euro (EUR):</b> R$ ${parseFloat(eur.bid).toFixed(2)} (${eur.pctChange}%)\n` +
      `₿ <b>Bitcoin (BTC):</b> R$ ${parseFloat(btc.bid).toLocaleString('pt-BR')} (${btc.pctChange}%)\n\n` +
      `🕒 <i>Atualizado em: ${new Date().toLocaleTimeString('pt-BR')}</i>`;

    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: text,
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  } catch (err) {
    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: `Erro ao buscar cotação: ${err.message}`,
      message_thread_id: msg.message_thread_id
    });
  }
}

// MEMES DE ÁUDIO
async function handleAudio(msg) {
  const selected = MEMES_VIRAIS_INTERNET[Math.floor(Math.random() * MEMES_VIRAIS_INTERNET.length)];
  const user = escapeHTML(msg.from ? (msg.from.first_name || msg.from.username || "Templário") : "Templário");

  const caption = `🎤 <b>MEME DE ÁUDIO VIRAL DA INTERNET!</b>\n\n👤 <b>Invocado por:</b> ${user}\n🔊 <b>Áudio:</b> ${escapeHTML(selected.title)}`;

  await apiCall("sendAudio", {
    chat_id: msg.chat.id,
    audio: selected.url,
    title: selected.title,
    performer: "Memes da Internet",
    caption: caption,
    message_thread_id: msg.message_thread_id || 15,
    parse_mode: "HTML"
  });
}

// BUSCA DE LIVROS
async function handleLivro(msg, query) {
  const searchTerm = query.trim();
  if (!searchTerm) {
    return await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: "📚 Digite o nome do livro.\nExemplo: <code>/livro O Príncipe</code> ou <code>/livro Mochileiro das Galáxias</code>",
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  }

  try {
    const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=ebook&limit=1`);
    const itunesData = await itunesRes.json();

    let bookTitle = searchTerm;
    let author = "Autor Registrado";
    let desc = "Sem resumo disponível.";
    let artwork = null;

    if (itunesData.results && itunesData.results.length > 0) {
      const b = itunesData.results[0];
      bookTitle = b.trackName;
      author = b.artistName || "Autor registrado";
      desc = (b.description || "Sem resumo disponível.").replace(/<[^>]+>/g, "").slice(0, 400) + "...";
      artwork = b.artworkUrl100 ? b.artworkUrl100.replace('100x100bb', '600x600bb') : null;
    }

    const queryEncoded = encodeURIComponent(bookTitle);
    const gutenbergLink = `https://www.gutenberg.org/ebooks/search/?query=${queryEncoded}`;
    const openLibLink = `https://openlibrary.org/search?q=${queryEncoded}`;
    const pdfSearchLink = `https://www.google.com/search?q=filetype:pdf+${encodeURIComponent(bookTitle + ' ' + author)}`;

    const text = `📚 <b>${escapeHTML(bookTitle)}</b>\n` +
      `✍️ <b>Autor:</b> ${escapeHTML(author)}\n\n` +
      `📖 <b>Resumo:</b> ${escapeHTML(desc)}\n\n` +
      `📥 <b>ONDE LER E BAIXAR GRATUITAMENTE (PDF/EPUB):</b>\n` +
      `📖 <a href="${openLibLink}">Ler / Emprestar Grátis no Open Library</a>\n` +
      `📄 <a href="${gutenbergLink}">Baixar EPUB/PDF Grátis no Project Gutenberg</a>\n` +
      `🔍 <a href="${pdfSearchLink}">Buscar Download Direto de PDF no Google</a>`;

    if (artwork) {
      return await apiCall("sendPhoto", {
        chat_id: msg.chat.id,
        photo: artwork,
        caption: text,
        message_thread_id: msg.message_thread_id || 14,
        parse_mode: "HTML"
      });
    } else {
      return await apiCall("sendMessage", {
        chat_id: msg.chat.id,
        text: text,
        message_thread_id: msg.message_thread_id || 14,
        parse_mode: "HTML"
      });
    }
  } catch (err) {
    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: `Erro ao buscar livro: ${err.message}`,
      message_thread_id: msg.message_thread_id
    });
  }
}

// PROMOÇÕES DE JOGOS GRÁTIS
async function handleSteam(msg) {
  try {
    const res = await fetch(`https://www.gamerpower.com/api/giveaways?platform=pc`);
    if (!res.ok) {
      return await apiCall("sendMessage", {
        chat_id: msg.chat.id,
        text: "🎮 Não foi possível buscar promoções no momento.",
        message_thread_id: msg.message_thread_id
      });
    }

    const deals = await res.json();
    const topDeals = deals.slice(0, 4);

    let text = `🎁 <b>JOGOS GRÁTIS DE HOJE (PC / STEAM / EPIC)!</b> 🎮\n\n`;
    for (const d of topDeals) {
      text += `📌 <b>${escapeHTML(d.title)}</b>\n` +
        `💰 <s>${escapeHTML(d.worth)}</s> ➡️ <b>GRÁTIS!</b>\n` +
        `🌐 Plataforma: ${escapeHTML(d.platforms)}\n` +
        `🔗 <a href="${d.open_giveaway_url}">Resgatar Jogo Grátis</a>\n\n`;
    }

    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: text,
      message_thread_id: msg.message_thread_id || 11,
      parse_mode: "HTML",
      disable_web_page_preview: true
    });
  } catch (err) {
    await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: `Erro ao buscar promoções: ${err.message}`,
      message_thread_id: msg.message_thread_id
    });
  }
}

// ROLAR DADOS DE RPG
async function handleDado(msg, argsText) {
  const query = argsText.trim().toLowerCase() || "1d20";
  const match = query.match(/^(\d+)?d(\d+)$/);

  if (!match) {
    return await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: "🎲 Exemplo de uso: <code>/dado 1d20</code> ou <code>/dado 2d6</code>",
      message_thread_id: msg.message_thread_id,
      parse_mode: "HTML"
    });
  }

  const count = Math.min(parseInt(match[1] || "1"), 10);
  const sides = parseInt(match[2]);

  let rolls = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
  }

  const user = escapeHTML(msg.from ? (msg.from.first_name || msg.from.username || "Templário") : "Templário");
  const text = `🎲 <b>${user} rolou os dados (${count}d${sides}):</b>\n\n` +
    `🎯 <b>Resultados:</b> [ ${rolls.join(", ")} ]\n` +
    `🔥 <b>Soma Total:</b> ${total}`;

  await apiCall("sendMessage", {
    chat_id: msg.chat.id,
    text: text,
    message_thread_id: msg.message_thread_id || 11,
    parse_mode: "HTML"
  });
}

// CITAÇÃO TEMPLÁRIA
async function handleFrase(msg) {
  const frases = [
    "⚔️ *Non nobis, Domine, non nobis, sed nomini tuo da gloriam.* (Não a nós, Senhor, mas ao Teu nome dá a glória!)",
    "🛡️ Na Taverna dos Templários, a cerveja é gelada e o papo é de alto nível!",
    "🏰 A honra de um guerreiro reside em suas ações e na lealdade aos seus irmãos de armas.",
    "🍺 Um bom templário sabe a hora de empunhar a espada e a hora de erguer o caneco!",
    "📖 Quem lê um bom livro ou escuta uma grande música expande a sua alma além das fronteiras da Taverna."
  ];
  const randomFrase = frases[Math.floor(Math.random() * frases.length)];

  await apiCall("sendMessage", {
    chat_id: msg.chat.id,
    text: randomFrase,
    message_thread_id: msg.message_thread_id
  });
}

// AJUDA COMPLETA
async function handleAjuda(msg) {
  const text = `⚔️ <b>MANUAL DA TABERNA DOS TEMPLÁRIOS (v8.0)</b> 🍺\n\n` +
    `📌 <i>Consulte o tópico de <b>📜 Manual & Comandos</b> para a lista completa fixada!</i>\n\n` +
    `🎮 <b>/perfil</b> - Ver seu Card Gamer Templário\n` +
    `🎮 <b>/setsteam [nick]</b> - Vincular sua conta Steam\n` +
    `⚽ <b>/futebol</b> - Placar e jogos de hoje\n` +
    `🍿 <b>/sortearfilme [gênero]</b> - Sortear um filme para assistir\n` +
    `🤖 <b>/ia [pergunta]</b> - Pergunta qualquer coisa ao Taverneiro!\n` +
    `🎵 <b>/deezer [Nome]</b> - Player flutuante HD de áudio com capas!\n` +
    `🌤️ <b>/tempo [Cidade]</b> - Previsão do tempo Open Source!\n` +
    `🗳️ <b>/enquete Tema | Opc1 | Opc2</b> - Cria enquetes no chat!\n` +
    `🏆 <b>/top</b> - Ranking de membros mais ativos!\n` +
    `🎮 <b>/jogar [Nome]</b> - Convocação para partidas de games!\n` +
    `🎁 <b>/steam</b> - Jogos 100% gratuitos para PC de hoje!\n` +
    `💡 <b>/ajuda</b> - Mostra esta mensagem.`;

  await apiCall("sendMessage", {
    chat_id: msg.chat.id,
    text: text,
    message_thread_id: msg.message_thread_id,
    parse_mode: "HTML"
  });
}

let offset = 0;

async function pollUpdates() {
  await syncPinnedManual();

  while (true) {
    try {
      const res = await apiCall("getUpdates", {
        offset: offset,
        timeout: 30
      });

      if (res.ok && res.result && res.result.length > 0) {
        for (const update of res.result) {
          offset = update.update_id + 1;

          if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
            continue;
          }

          const msg = update.message;
          if (!msg) continue;

          if (msg.from && !msg.from.is_bot) {
            const userId = msg.from.id;
            const userName = msg.from.first_name || msg.from.username || "Templário";
            registerUserActivity(userId, userName);
          }

          if (msg.new_chat_members) {
            await handleNewMembers(msg);
            continue;
          }

          if (msg.sender_chat && msg.from && msg.from.is_bot === false) {
            console.log(`[ANTI-ANÔNIMO] Deletando mensagem anônima...`);
            await apiCall("deleteMessage", {
              chat_id: msg.chat.id,
              message_id: msg.message_id
            });
            continue;
          }

          const rawText = msg.text || msg.caption || "";

          if (rawText.startsWith("/")) {
            const parts = rawText.split(" ");
            const rawCommand = parts[0].toLowerCase().split("@")[0];
            const command = rawCommand.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const argsText = parts.slice(1).join(" ");

            if (command === "/perfil" || command === "/card") {
              await handlePerfil(msg);
            } else if (command === "/setsteam" || command === "/steamid") {
              await handleSetSteam(msg, argsText);
            } else if (command === "/futebol" || command === "/jogos" || command === "/placar") {
              await handleFutebol(msg);
            } else if (command === "/sortearfilme" || command === "/indicarfilme" || command === "/roleta") {
              await handleSortearFilme(msg, argsText);
            } else if (command === "/ia" || command === "/pergunta" || command === "/taverneiro") {
              await handleIA(msg, argsText);
            } else if (command === "/tempo" || command === "/clima") {
              await handleTempo(msg, argsText);
            } else if (command === "/enquete" || command === "/voto") {
              await handleEnquete(msg, argsText);
            } else if (command === "/top" || command === "/ranking" || command === "/xp") {
              await handleRanking(msg);
            } else if (command === "/jogar" || command === "/jogatina") {
              await handleJogar(msg, argsText);
            } else if (command === "/filme" || command === "/cinema" || command === "/cine") {
              await handleFilme(msg, argsText);
            } else if (command === "/musica" || command === "/som" || command === "/deezer") {
              await handleMusica(msg, argsText);
            } else if (command === "/dolar" || command === "/btc" || command === "/moeda") {
              await handleDolar(msg);
            } else if (command === "/audio" || command === "/efeito") {
              await handleAudio(msg);
            } else if (command === "/livro" || command === "/biblioteca") {
              await handleLivro(msg, argsText);
            } else if (command === "/steam" || command === "/promo") {
              await handleSteam(msg);
            } else if (command === "/dado" || command === "/dados") {
              await handleDado(msg, argsText);
            } else if (command === "/frase") {
              await handleFrase(msg);
            } else if (command === "/ajuda" || command === "/start") {
              await handleAjuda(msg);
            }
          } else {
            // Modo Taverneiro Falante em conversas convencionais
            await handleAutoTaverneiro(msg);
          }
        }
      }
    } catch (err) {
      console.error("[POLLING ERROR]:", err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

console.log("🛡️ Bot da Taberna dos Templários v8.0 (Com Perfis Gamer + Futebol + Sorteio Filmes + IA Automática + Render Ready) iniciado!");
console.log("Aguardando novas mensagens e comandos no Telegram...");
pollUpdates();
