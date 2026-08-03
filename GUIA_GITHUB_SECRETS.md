# 🔒 GUIA DE CONFIGURAÇÃO DE SECRETS DO PROJETO

Para garantir a **máxima segurança** e manter o Bot da Taberna dos Templários rodando 24h na nuvem (Render) sem expor senhas no código público, utilize as variáveis de ambiente abaixo:

---

### 🔑 1. Credenciais Principais

| Variável | Descrição | Exemplo de Valor |
| :--- | :--- | :--- |
| **`BOT_TOKEN`** | Token do Bot no Telegram | `8854972901:AAFgUeVi...` |
| **`CHAT_ID`** | ID do Supergrupo do Telegram | `-1004492877879` |
| **`DISCORD_INVITE_LINK`** | Link Oficial do Canal do Discord | `https://discord.com/channels/...` |
| **`RENDER_API_KEY`** | Token da API do Render para Deploys | `rnd_4D19AEf5oNG9kdpNzCdkqbudDXjK` |

---

### 🛡️ 2. Como Configurar no GitHub (Secrets & Variables)

1. No seu repositório no GitHub: `https://github.com/andliassource/taberna-templarios-bot`
2. Vá em **Settings** ➔ **Secrets and variables** ➔ **Actions**.
3. Clique em **New repository secret**.
4. Adicione as chaves acima.

---

### 🌐 3. Como Configurar no Render.com

1. No painel do Render: `https://dashboard.render.com/web/srv-d9ogn8tbedkc73crr8ug`
2. Vá em **Environment** ➔ **Add Environment Variable**.
3. Adicione `BOT_TOKEN`, `CHAT_ID` e `DISCORD_INVITE_LINK`.
4. Salve e o Render fará o deploy automático!
