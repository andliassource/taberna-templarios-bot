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

// Carrega o banco de dados de sessões de jogatina do disco
let gameSessions = {};

function loadGameSessions() {
  if (fs.existsSync(GAMES_DB_FILE)) {
    try {
      const raw = fs.readFileSync(GAMES_DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      for (const id in parsed) {
        gameSessions[id] = {
          game: parsed[id].game,
          organizer: parsed[id].organizer,
          going: new Set(parsed[id].going || []),
          maybe: new Set(parsed[id].maybe || []),
          cant: new Set(parsed[id].cant || [])
        };
      }
    } catch (e) {
      console.error("Erro ao carregar games_data.json:", e.message);
    }
  }
}

function saveGameSessions() {
  try {
    const toSave = {};
    for (const id in gameSessions) {
      toSave[id] = {
        game: gameSessions[id].game,
        organizer: gameSessions[id].organizer,
        going: Array.from(gameSessions[id].going),
        maybe: Array.from(gameSessions[id].maybe),
        cant: Array.from(gameSessions[id].cant)
      };
    }
    fs.writeFileSync(GAMES_DB_FILE, JSON.stringify(toSave, null, 2), 'utf8');
  } catch (e) {
    console.error("Erro ao salvar games_data.json:", e.message);
  }
}

loadGameSessions();

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

async function handleNewMembers(msg) {
  for (const member of msg.new_chat_members) {
    if (member.is_bot) continue;

    const name = escapeHTML(member.first_name || member.username || "Templário");
    const welcomeText = `🛡️ <b>Seja bem-vindo à Taberna dos Templários, ${name}!</b> 🍺\n\n` +
      `Sinta-se em casa para conversar e participar dos nossos tópicos:\n\n` +
      `💬 <b>Prosa da Taverna:</b> Bate-papo geral\n` +
      `🎮 <b>Jogatina Templária:</b> Use <code>/jogar [Jogo]</code> ou <code>/dado 1d20</code>\n` +
      `🎤 <b>Áudios Lendários:</b> Use <code>/áudio</code> para soltar memes de áudio!\n` +
      `🎬 <b>Cine Templário:</b> Use <code>/filme [Nome]</code> para ver onde assistir grátis!\n` +
      `🎵 <b>Música Templária:</b> Use <code>/música [Nome]</code> ou <code>/deezer</code> para Deezer/Spotify/YouTube!\n` +
      `📚 <b>Biblioteca Templária:</b> Use <code>/livro [Nome]</code> para livros em PDF/ePUB!\n` +
      `💵 <b>Financeiro:</b> Use <code>/dolar</code> para ver cotações em tempo real!\n` +
      `🎁 <b>Promoções:</b> Use <code>/steam</code> para jogos grátis.`;

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
    gameSessions[msgId] = {
      game: gameName,
      organizer: organizer,
      going: new Set([organizer]),
      maybe: new Set(),
      cant: new Set()
    };
    saveGameSessions();
  }
}

async function handleCallbackQuery(cb) {
  const msgId = cb.message.message_id;
  const user = escapeHTML(cb.from ? (cb.from.first_name || cb.from.username || "Templário") : "Templário");
  const action = cb.data;

  if (!gameSessions[msgId]) {
    const existingText = cb.message.text || "";
    gameSessions[msgId] = parseTextToSession(existingText);
  }

  const session = gameSessions[msgId];

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

  saveGameSessions();

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

async function handleFilme(msg, query) {
  const searchTerm = query.trim();
  if (!searchTerm) {
    return await apiCall("sendMessage", {
      chat_id: msg.chat.id,
      text: "🎬 Digite o nome do filme ou série.\nExemplo: <code>/filme Matrix</code> ou <code>/filme Gladiator</code>",
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

      const text = `🎵 <b>${escapeHTML(songTitle)}</b>\n` +
        `👤 <b>Artista:</b> ${escapeHTML(artist)}\n` +
        `💿 <b>Álbum:</b> ${escapeHTML(album)}\n\n` +
        `🎧 <b>ONDE OUVIR E DEEZER:</b>\n` +
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
      } else {
        await apiCall("sendMessage", {
          chat_id: msg.chat.id,
          text: text,
          message_thread_id: msg.message_thread_id || 13,
          parse_mode: "HTML"
        });
      }

      if (previewUrl) {
        await apiCall("sendAudio", {
          chat_id: msg.chat.id,
          audio: previewUrl,
          title: `${songTitle} (Deezer Preview)`,
          performer: artist,
          message_thread_id: msg.message_thread_id || 13
        });
      }
      return;
    }

    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=1`);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const song = data.results[0];
      const cover = song.artworkUrl100 ? song.artworkUrl100.replace('100x100bb', '600x600bb') : null;
      const queryEscaped = encodeURIComponent(`${song.artistName} - ${song.trackName}`);

      const text = `🎵 <b>${escapeHTML(song.trackName)}</b>\n` +
        `👤 <b>Artista:</b> ${escapeHTML(song.artistName)}\n\n` +
        `🎧 <a href="https://music.youtube.com/search?q=${queryEscaped}">Ouvir no YouTube Music</a>\n` +
        `💜 <a href="https://www.deezer.com/search/${queryEscaped}">Buscar no Deezer</a>`;

      if (cover) {
        await apiCall("sendPhoto", {
          chat_id: msg.chat.id,
          photo: cover,
          caption: text,
          message_thread_id: msg.message_thread_id || 13,
          parse_mode: "HTML"
        });
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

async function handleAjuda(msg) {
  const text = `⚔️ <b>MANUAL DA TABERNA DOS TEMPLÁRIOS</b> 🍺\n\n` +
    `Aqui estão todos os comandos funcionais do bot:\n\n` +
    `💜 <b>/deezer [Nome]</b> ou <b>/música [Nome]</b> - Busca músicas na API do Deezer + Player HD + Spotify/YouTube!\n` +
    `💵 <b>/dolar</b> ou <b>/btc</b> - Mostra cotação do Dólar, Euro e Bitcoin em tempo real!\n` +
    `🎬 <b>/filme [Nome]</b> - Busca onde assistir filmes/séries grátis!\n` +
    `📚 <b>/livro [Nome]</b> - Busca livros em PDF/EPUB grátis!\n` +
    `🎤 <b>/áudio</b> - Toca +25 memes de áudio virais reais da internet!\n` +
    `🎮 <b>/jogar [Nome]</b> - Cria votação interativa para marcar partidas de games!\n` +
    `🎲 <b>/dado 1d20</b> - Rola dados de RPG (ex: 1d20, 2d6) no chat!\n` +
    `🎁 <b>/steam</b> ou <b>/promo</b> - Mostra jogos 100% gratuitos para PC de hoje!\n` +
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

            if (command === "/jogar" || command === "/jogatina") {
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
          }
        }
      }
    } catch (err) {
      console.error("[POLLING ERROR]:", err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

console.log("🛡️ Bot da Taberna dos Templários v6.3 (Repositório Seguro Sem Tokens Expostos) iniciado!");
console.log("Aguardando novas mensagens e comandos no Telegram...");
pollUpdates();
