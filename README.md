# 🛡️ Bot da Taberna dos Templários 🍺

Bot oficial do grupo **Taberna dos Templários** no Telegram. Possui central de memes de áudio virais da internet, busca de livros gratuitos com downloads em PDF/EPUB, busca de filmes/séries em streaming grátis, Deezer API, cotação de dólar e votação de partidas de games em tempo real.

---

## 🚀 Como Rodar o Bot

### 1. Requisitos
* Ter o **Node.js** (v18 ou superior) instalado: [https://nodejs.org](https://nodejs.org)

### 2. Configuração
1. Clone este repositório:
   ```bash
   git clone https://github.com/andliassource/taberna-templarios-bot.git
   cd taberna-templarios-bot
   ```
2. Crie um arquivo `config.json` baseado no `config.example.json`:
   ```json
   {
     "TOKEN": "SEU_TOKEN_DO_TELEGRAM_AQUI",
     "CHAT_ID": "-1004492877879"
   }
   ```

### 3. Execução
Execute o comando no terminal:
```bash
node bot.js
```

---

## ⚡ Principais Comandos

| Comando | Descrição |
| :--- | :--- |
| 🎤 `/áudio` ou `/audio` | Toca +25 memes de áudio virais reais da internet (UEPA, Faustão, Faro, Chaves, etc.) |
| 💜 `/deezer [Nome]` ou `/música` | Busca na **Deezer API** com preview de áudio MP3 + capas HD |
| 🎬 `/filme [Nome]` | Busca filmes/séries com links para assistir grátis (Pluto TV, YouTube, etc.) |
| 📚 `/livro [Nome]` | Busca livros com links de leitura e download grátis em PDF/EPUB |
| 💵 `/dolar` ou `/btc` | Cotação em tempo real do Dólar, Euro e Bitcoin |
| 🎮 `/jogar [Nome]` | Cria convocação interativa para marcar partidas de games |
| 🎲 `/dado 1d20` | Rola dados de RPG em tempo real |
| 🎁 `/steam` ou `/promo` | Lista os jogos 100% gratuitos para PC do dia |
