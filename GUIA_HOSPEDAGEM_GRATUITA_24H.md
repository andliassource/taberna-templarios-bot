# 🌐 Guia de Hospedagem 24/7 Gratuita no Render.com (Bot 100% Online)

Siga este passo a passo rápido para deixar o seu Bot rodando **24 horas por dia na nuvem gratuitamente**, sem depender do seu computador ficar ligado!

---

## 🚀 Passo a Passo (Leva menos de 2 minutos):

1. **Acesse o site gratuito do Render:**
   👉 [https://render.com](https://render.com) e crie uma conta gratuita (você pode entrar usando sua conta do **GitHub**).

2. **Crie um novo Background Worker / Web Service:**
   * Clique no botão **`New +`** no canto superior direito.
   * Selecione **`Background Worker`** (ou **`Web Service`**).

3. **Conecte seu Repositório do GitHub:**
   * Selecione o seu repositório: `andliassource/taberna-templarios-bot`.

4. **Configure a Variável de Ambiente (TOKEN do Bot):**
   * No campo **Environment Variables**, adicione:
     * **Key:** `BOT_TOKEN`
     * **Value:** `SEU_TOKEN_DO_TELEGRAM`
     * **Key:** `CHAT_ID`
     * **Value:** `-1004492877879`

5. **Clique em `Create Worker`!**
   * Pronto! O Render vai baixar o seu código direto do GitHub e manter o seu bot **online 24 horas por dia, 7 dias por semana**, 100% grátis!
