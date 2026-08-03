const { fork } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'bot.js');

function startBot() {
  console.log(`[SUPERVISOR] 🛡️ Iniciando processo do Bot da Taverna (Auto-Restart 24/7)...`);
  
  const child = fork(scriptPath);

  child.on('exit', (code, signal) => {
    console.warn(`[SUPERVISOR] ⚠️ O bot foi encerrado (Código: ${code}, Sinal: ${signal}). Reiniciando em 3 segundos...`);
    setTimeout(startBot, 3000);
  });

  child.on('error', (err) => {
    console.error(`[SUPERVISOR] ❌ Erro no processo filho:`, err.message);
  });
}

startBot();
