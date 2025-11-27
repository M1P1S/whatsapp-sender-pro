# 📱 WhatsApp Sender PRO - Sistema Completo

Sistema profissional de envio em massa para WhatsApp com planos FREE e PRO.

---

## 🚀 Instalação Completa

### 1️⃣ Instalar Dependências

```bash
npm install @whiskeysockets/baileys express cors multer papaparse xlsx qrcode-terminal dotenv sqlite3 bcryptjs jsonwebtoken express-session cookie-parser uuid
npm install --save-dev nodemon
```

### 2️⃣ Estrutura de Arquivos

Certifique-se de ter esta estrutura:

```
whatsapp-sender/
├── server/
│   ├── index.js          # Servidor principal (COM autenticação)
│   ├── whatsapp.js       # Lógica do WhatsApp
│   ├── database.js       # Sistema de usuários e planos
│   └── uploads/          # Arquivos temporários
├── public/
│   ├── auth.html         # Tela de login/cadastro
│   ├── dashboard.html    # Dashboard principal
│   ├── upgrade.html      # Página de upgrade PRO
│   ├── index.html        # Sistema de envio
│   ├── app-auth.js       # Frontend JavaScript
│   └── style.css         # Estilos
├── package.json
└── README.md
```

### 3️⃣ Criar Arquivos

1. **Substitua** `server/index.js` com o código fornecido (Sistema Completo com Auth)
2. **Crie** `server/database.js` com o código fornecido
3. **Substitua** `server/whatsapp.js` com a versão corrigida
4. **Crie** `public/auth.html`
5. **Crie** `public/dashboard.html`
6. **Crie** `public/upgrade.html`
7. **Substitua** `public/index.html`
8. **Crie** `public/app-auth.js`

### 4️⃣ Iniciar o Servidor

```bash
npm run dev
```

Você deve ver:

```
============================================================
🚀 Servidor rodando em http://localhost:3000
📱 Acesse no navegador: http://localhost:3000
============================================================
```

---

## 📋 Como Usar

### 1️⃣ Primeiro Acesso

1. Abra: `http://localhost:3000`
2. Você será redirecionado para `http://localhost:3000/auth.html`
3. Clique em **"Cadastro"**
4. Preencha: Nome, Email e Senha
5. Clique em **"Criar Conta Grátis"**

### 2️⃣ Conectar WhatsApp

1. Após login, você verá o **Dashboard**
2. Clique em **"Ir para Sistema de Envio"**
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde mensagem: **"Conectado ✓"**

### 3️⃣ Enviar Mensagens (Plano FREE)

1. Carregue arquivo CSV/XLSX com contatos
2. Digite a mensagem
3. Clique em **"Enviar Mensagens"**
4. Limite: **50 mensagens/dia** (apenas texto)

### 4️⃣ Fazer Upgrade para PRO

1. Clique em **"💎 Fazer Upgrade"**
2. Escolha: **PRO Mensal (R$ 49,90)** ou **PRO Anual (R$ 399,00)**
3. Clique em **"Assinar Agora"**
4. Confirme o upgrade (DEMO - sem pagamento real)

### 5️⃣ Recursos PRO

Após upgrade:
- ✅ **500 mensagens/dia**
- ✅ Envio de **imagens**
- ✅ Envio de **vídeos**
- ✅ **Histórico detalhado**
- ✅ **Relatórios**

---

## 💎 Planos Disponíveis

### FREE (Gratuito)
- 50 mensagens/dia
- Apenas texto
- Sem imagens/vídeos

### PRO Mensal (R$ 49,90)
- 500 mensagens/dia
- Texto + Imagens + Vídeos
- Relatórios detalhados

### PRO Anual (R$ 399,00)
- 500 mensagens/dia
- Todos recursos PRO
- Economize R$ 200/ano

---

## 📊 Formato da Planilha

### CSV/Excel correto:

```csv
phone
5561991234567
5511987654321
5521998765432
```

**Formato:** `55` + `DDD` + `9` + `número`

---

## 🔐 Sistema de Autenticação

### Tecnologias:
- **SQLite** (banco de dados local)
- **bcryptjs** (senhas criptografadas)
- **JWT** (tokens seguros)
- **express-session** (sessões)

### Segurança:
- ✅ Senhas com hash bcrypt
- ✅ Tokens JWT com expiração
- ✅ Validação de sessão
- ✅ Proteção contra SQL injection

---

## 🛠️ Troubleshooting

### Erro: "Não foi possível conectar ao servidor"
```bash
# Verifique se o servidor está rodando:
npm run dev
```

### Erro: "Token inválido"
```bash
# Limpe o cache do navegador:
localStorage.clear()
# Depois faça login novamente
```

### Erro: "Porta 3000 em uso"
```powershell
# Windows (PowerShell como Admin):
netstat -ano | findstr :3000
taskkill /PID [NUMERO] /F
```

### Banco de dados corrompido
```bash
# Delete o arquivo do banco:
rm server/whatsapp.db
# Reinicie o servidor (será criado novo banco):
npm run dev
```

---

## 🎯 Próximas Funcionalidades

- [ ] Integração com Mercado Pago / Stripe
- [ ] Agendamento de envios
- [ ] Templates salvos
- [ ] API REST para integrações
- [ ] Webhook de status
- [ ] Relatórios em PDF
- [ ] Exportar histórico
- [ ] Múltiplas contas WhatsApp

---

## ⚠️ Avisos Importantes

### Uso Ético:
- ✅ Use apenas para mensagens autorizadas
- ✅ Respeite a LGPD
- ❌ Nunca envie spam

### Limites de Segurança:
- Máximo: 50 FREE / 500 PRO por dia
- Delay automático: 2-4 segundos entre envios
- WhatsApp pode banir contas que abusam

### Produção:
- **Mude o JWT_SECRET** em `server/index.js`
- **Configure HTTPS** em produção
- **Use banco PostgreSQL/MySQL** ao invés de SQLite
- **Implemente pagamento real** (Mercado Pago/Stripe)

---

## 💳 Integração de Pagamento (Próximo Passo)

Para ativar pagamentos reais:

### Mercado Pago:
```bash
npm install mercadopago
```

### Stripe:
```bash
npm install stripe
```

### Implementação:
1. Crie conta no Mercado Pago / Stripe
2. Obtenha credenciais API
3. Adicione checkout na página de upgrade
4. Configure webhook de confirmação
5. Ative plano após pagamento confirmado

---

## 📞 Suporte

- 📧 Email: seu@email.com
- 📱 WhatsApp: (61) 9999-9999
- 🌐 Site: seusite.com.br

---

## 📄 Licença

Este projeto é apenas para uso pessoal e educacional.

---

## 🎉 Conclusão

Sistema 100% funcional com:
- ✅ Autenticação completa
- ✅ Sistema de planos (FREE/PRO)
- ✅ Controle de limites diários
- ✅ Dashboard profissional
- ✅ Histórico de envios
- ✅ Interface moderna

**Pronto para uso e monetização!** 🚀