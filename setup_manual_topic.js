const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
let TOKEN = "";
let CHAT_ID = "-1004492877879";

if (fs.existsSync(configPath)) {
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  TOKEN = cfg.TOKEN;
  if (cfg.CHAT_ID) CHAT_ID = cfg.CHAT_ID;
}

const BOT_URL = `https://api.telegram.org/bot${TOKEN}`;

async function apiCall(method, body = {}) {
  const res = await fetch(`${BOT_URL}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return await res.json();
}

const MANUAL_TEXT = `⚔️ <b>MANUAL COMPLETO & COMANDOS DA TABERNA</b> 🍺 (v7.1)\n\n` +
  `📌 <b>Esta mensagem fica sempre fixada e atualizada com as novas funções!</b>\n\n` +
  `🤖 <b>INTELIGÊNCIA ARTIFICIAL & DÚVIDAS</b>\n` +
  `• <code>/ia [pergunta]</code> ou <code>/pergunta</code> - Pergunta ao Taverneiro Inteligente\n\n` +
  `🎵 <b>MÚSICA & DEEZER (PLAYER NATIVO HD)</b>\n` +
  `• <code>/música [Nome]</code> ou <code>/deezer</code> - Player flutuante HD com capa e botões Deezer/Spotify/YouTube\n\n` +
  `🎬 <b>FILMES & SÉRIES (CINE TEMPLÁRIO)</b>\n` +
  `• <code>/filme [Nome]</code> ou <code>/cinema</code> - Sinopse, capa HD e links grátis (Pluto TV/YouTube)\n\n` +
  `📚 <b>BIBLIOTECA TEMPLÁRIA</b>\n` +
  `• <code>/livro [Nome]</code> ou <code>/biblioteca</code> - Livros em PDF e EPUB grátis\n\n` +
  `🎮 <b>JOGATINA & PROMOÇÕES</b>\n` +
  `• <code>/jogar [Jogo]</code> ou <code>/jogatina</code> - Convocação interativa com botões de presença\n` +
  `• <code>/steam</code> ou <code>/promo</code> - Jogos pagos 100% gratuitos de hoje (PC/Steam/Epic)\n\n` +
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

async function main() {
  console.log("Criando novo tópico: 📜 Manual & Comandos...");
  const topicRes = await apiCall("createForumTopic", {
    chat_id: CHAT_ID,
    name: "📜 Manual & Comandos"
  });

  if (!topicRes.ok) {
    console.error("Erro ao criar tópico:", topicRes);
    return;
  }

  const threadId = topicRes.result.message_thread_id;
  console.log(`Tópico criado com Sucesso! Thread ID: ${threadId}`);

  console.log("Enviando mensagem do manual...");
  const msgRes = await apiCall("sendMessage", {
    chat_id: CHAT_ID,
    message_thread_id: threadId,
    text: MANUAL_TEXT,
    parse_mode: "HTML"
  });

  if (!msgRes.ok) {
    console.error("Erro ao enviar mensagem:", msgRes);
    return;
  }

  const msgId = msgRes.result.message_id;
  console.log(`Mensagem enviada! Message ID: ${msgId}`);

  console.log("Fixando mensagem no tópico...");
  const pinRes = await apiCall("pinChatMessage", {
    chat_id: CHAT_ID,
    message_id: msgId
  });

  console.log("Resultado da Fixação:", pinRes.ok ? "SUCESSO!" : pinRes);

  // Atualiza no arquivo de dados local games_data.json
  const GAMES_DB_FILE = path.join(__dirname, 'games_data.json');
  let data = {};
  if (fs.existsSync(GAMES_DB_FILE)) {
    data = JSON.parse(fs.readFileSync(GAMES_DB_FILE, 'utf8'));
  }
  data.manualThreadId = threadId;
  data.pinnedManualMsgId = msgId;
  fs.writeFileSync(GAMES_DB_FILE, JSON.stringify(data, null, 2), 'utf8');

  console.log("Configurações salvas em games_data.json!");
}

main();
