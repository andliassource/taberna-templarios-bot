# 🔐 Guia de Configuração de Secrets no GitHub

Este guia explica como cadastrar o **TOKEN do Bot** e o **CHAT_ID** com segurança máxima nos **Repository Secrets** do GitHub.

---

## 🔒 Passo a Passo (Leva menos de 1 minuto):

1. **Acesse o seu repositório no GitHub:**
   👉 [https://github.com/andliassource/taberna-templarios-bot](https://github.com/andliassource/taberna-templarios-bot)

2. **Entre nas Configurações:**
   * Clique na aba **`Settings`** (canto superior direito da página do repositório).

3. **Navegue até os Secrets:**
   * No menu lateral esquerdo, clique em **`Secrets and variables`** ➡️ **`Actions`**.

4. **Adicione as Credenciais:**
   * Clique no botão verde **`New repository secret`**:
     * **Nome:** `BOT_TOKEN`
     * **Valor:** *(Cole o token do seu bot fornecido pelo BotFather)*
   * Clique em **`Add secret`**.

   * Clique novamente em **`New repository secret`**:
     * **Nome:** `CHAT_ID`
     * **Valor:** `-1004492877879`
   * Clique em **`Add secret`**.

---

## ✅ Como o Bot consome essas chaves de forma segura:

No código `bot.js`, as credenciais são lidas automaticamente do ambiente seguro:
```javascript
let TOKEN = process.env.BOT_TOKEN;
let CHAT_ID = process.env.CHAT_ID;
```
Isso garante que o seu token **nunca fique visível publicamente no código**, mantendo o projeto 100% livre de alertas do GitHub!
