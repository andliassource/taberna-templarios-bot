const http = require('http');
const { fork } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 10000;
const scriptPath = path.join(__dirname, 'bot.js');

let restartCount = 0;

// Servidor HTTP leve para o Health Check do Render manter o bot 24/7 online sem falhar
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Taberna dos Templários Bot - Online</title>
        <style>
          body { font-family: sans-serif; background: #121212; color: #e0e0e0; text-align: center; padding: 50px; }
          .card { background: #1e1e1e; border: 2px solid #ffb703; padding: 30px; border-radius: 12px; display: inline-block; }
          h1 { color: #ffb703; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🛡️ Taberna dos Templários Bot v10.1</h1>
          <p>🟢 Status: <b>Online e Ativo 24/7 na Nuvem</b></p>
          <p>🔄 Reinícios automáticos: ${restartCount}</p>
          <p>⚔️ Servindo o grupo do Telegram com Honra & Lealdade!</p>
        </div>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`[SUPERVISOR HTTP] 🌐 Servidor Health Check ativo na porta ${PORT} para o Render!`);
});

function startBot() {
  console.log(`[SUPERVISOR] 🛡️ Iniciando processo filho do Bot da Taverna (Auto-Restart 24/7)...`);
  
  const child = fork(scriptPath);

  child.on('exit', (code, signal) => {
    restartCount++;
    console.warn(`[SUPERVISOR] ⚠️ O bot caiu (Código: ${code}, Sinal: ${signal}). Reinício #${restartCount} em 3 segundos...`);
    setTimeout(startBot, 3000);
  });

  child.on('error', (err) => {
    console.error(`[SUPERVISOR] ❌ Erro no processo filho:`, err.message);
  });
}

startBot();
