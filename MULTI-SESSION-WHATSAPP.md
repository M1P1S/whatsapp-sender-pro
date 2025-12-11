# 🔐 Sistema de Multi-Sessões do WhatsApp

## 📋 Visão Geral

Este sistema implementa **isolamento total** de sessões do WhatsApp, permitindo que cada usuário tenha sua própria conexão independente.

### ✅ Benefícios

- ✅ **Isolamento Total**: Cada cliente usa seu próprio número de WhatsApp
- ✅ **Escalabilidade**: Suporta até 1000 sessões simultâneas
- ✅ **Segurança**: Nenhuma mensagem ou dados são compartilhados entre usuários
- ✅ **Privacidade**: QR Code individual para cada usuário
- ✅ **Rastreabilidade**: Histórico completo por usuário
- ✅ **Confiabilidade**: Sistema de limpeza automática de sessões inativas

---

## 🏗️ Arquitetura

### Componentes Principais

1. **whatsapp-manager.js** - Gerenciador central de sessões
2. **database.js** - Persistência de dados das sessões
3. **server/index.js** - Endpoints da API

### Estrutura de Dados

```javascript
// Memória (Map)
sessions = {
  userId: {
    client: WhatsAppClient,
    qrCode: String | null,
    status: 'initializing' | 'qr_ready' | 'connected' | 'disconnected',
    lastActivity: timestamp,
    userId: number
  }
}

// Banco de Dados (SQLite)
whatsapp_sessions {
  id: INTEGER PRIMARY KEY,
  user_id: INTEGER UNIQUE,
  whatsapp_number: TEXT,
  whatsapp_name: TEXT,
  status: TEXT,
  last_connection: DATETIME,
  created_at: DATETIME,
  updated_at: DATETIME
}
```

---

## 🔄 Fluxo de Funcionamento

### 1. **Primeira Conexão**

```
Usuário faz login
    ↓
Frontend chama /api/qrcode
    ↓
Sistema cria sessão isolada (userId)
    ↓
Gera QR Code individual
    ↓
Usuário escaneia com seu WhatsApp
    ↓
Sessão conectada e autenticada
```

### 2. **Envio de Mensagens**

```
Usuário envia mensagens via /api/send
    ↓
Sistema verifica:
  - Sessão conectada?
  - Limite de envios OK?
    ↓
Usa o cliente WhatsApp do usuário (isolado)
    ↓
Mensagens enviadas do WhatsApp do usuário
```

### 3. **Gerenciamento de Sessões**

- **Limpeza Automática**: Sessões inativas > 24h são removidas
- **Reconexão**: Usuário pode forçar reconexão via `/api/whatsapp/reconnect`
- **Logout**: Limpa sessão e arquivos de autenticação

---

## 📡 API Endpoints

### Autenticação e Conexão

#### `GET /api/qrcode`
Retorna QR Code para conectar WhatsApp

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "qrCode": "data:image/png;base64,...",
  "connected": false,
  "status": "qr_ready"
}
```

#### `GET /api/status`
Verifica status da conexão do usuário

**Response:**
```json
{
  "connected": true,
  "status": "connected"
}
```

#### `POST /api/disconnect`
Desconecta e remove sessão do WhatsApp

**Response:**
```json
{
  "success": true,
  "message": "Logout realizado"
}
```

### Envio de Mensagens

#### `POST /api/send`
Envia mensagens usando a sessão do usuário

**Body:**
```json
{
  "contacts": "[\"5511999999999\", \"5511988888888\"]",
  "message": "Olá!",
  "minInterval": 2,
  "maxInterval": 4
}
```

**Validações:**
- ✅ Verifica se WhatsApp está conectado
- ✅ Verifica limite de envios
- ✅ Valida números

**Response:**
```json
{
  "success": true,
  "results": [
    { "contact": "5511999999999", "success": true },
    { "contact": "5511988888888", "success": true }
  ]
}
```

### Administração

#### `GET /api/admin/sessions`
Lista todas as sessões ativas (apenas PRO)

**Response:**
```json
{
  "sessions": [
    {
      "userId": 1,
      "status": "connected",
      "connected": true,
      "lastActivity": 1234567890,
      "hasQR": false
    }
  ],
  "total": 1
}
```

#### `GET /api/whatsapp/my-session`
Informações detalhadas da própria sessão

**Response:**
```json
{
  "memory": {
    "exists": true,
    "status": "connected",
    "connected": true,
    "lastActivity": 1234567890
  },
  "database": {
    "user_id": 1,
    "whatsapp_number": "5511999999999",
    "whatsapp_name": "João Silva",
    "status": "connected"
  }
}
```

#### `POST /api/whatsapp/reconnect`
Força reconexão do WhatsApp

**Response:**
```json
{
  "success": true,
  "message": "Reconectando..."
}
```

---

## 🔧 Configuração

### Limites e Timeouts

```javascript
// whatsapp-manager.js
const CONFIG = {
  maxSessions: 1000,              // Limite de sessões simultâneas
  sessionTimeout: 24 * 60 * 60 * 1000,  // 24 horas
  qrTimeout: 60 * 1000,           // 1 minuto
  authPath: 'wwebjs_auth'         // Diretório de autenticação
};
```

### Estrutura de Arquivos

```
whatsapp-sender-pro/
├── server/
│   ├── whatsapp-manager.js     ← Gerenciador multi-sessões
│   ├── database.js              ← Persistência
│   └── index.js                 ← API
├── wwebjs_auth/                 ← Sessões do WhatsApp
│   ├── session-user-1/          ← Usuário 1
│   ├── session-user-2/          ← Usuário 2
│   └── ...
└── MULTI-SESSION-WHATSAPP.md   ← Esta documentação
```

---

## 🚀 Como Usar

### Para Desenvolvedores

1. **Instalar dependências:**
```bash
npm install whatsapp-web.js qrcode
```

2. **Iniciar servidor:**
```bash
node server/index.js
```

3. **Testar conexão:**
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"senha123"}'

# Obter QR Code
curl http://localhost:3000/api/qrcode \
  -H "Authorization: Bearer <token>"
```

### Para Usuários

1. Faça login no sistema
2. Acesse o dashboard
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde conexão
5. Comece a enviar mensagens!

---

## 🛡️ Segurança

### Isolamento

- ✅ Cada sessão tem seu próprio processo do Puppeteer
- ✅ Autenticação armazenada em diretórios separados
- ✅ Tokens JWT únicos por usuário
- ✅ Validação de permissões em cada requisição

### Privacidade

- ✅ Nenhum usuário vê dados de outros
- ✅ QR Codes não são compartilhados
- ✅ Mensagens rastreadas por usuário
- ✅ Histórico individual

---

## 📊 Monitoramento

### Logs

O sistema registra todas as operações importantes:

```
[MULTI-SESSION] Criando nova sessão | User: 1
[MULTI-SESSION] QR Code gerado | User: 1
[MULTI-SESSION] Autenticado | User: 1
[MULTI-SESSION] Conectado | User: 1
[MULTI-SESSION] User 1 conectado como: João Silva
[MULTI-SESSION] User 1 enviando para 5511999999999
[MULTI-SESSION] User 1 enviou texto para 5511999999999
```

### Métricas

- Total de sessões ativas
- Tempo de atividade por sessão
- Taxa de sucesso/falha de envios
- Uso de recursos por sessão

---

## 🔄 Manutenção

### Limpeza Automática

O sistema limpa automaticamente sessões inativas:

```javascript
// Executado a cada 1 hora
setInterval(() => {
  cleanInactiveSessions(); // Remove sessões > 24h sem atividade
}, 60 * 60 * 1000);
```

### Backup

Recomendações:
- Backup do banco `whatsapp.db` diariamente
- Backup opcional de `wwebjs_auth/` (contém autenticação)
- Logs rotacionados semanalmente

---

## 🐛 Troubleshooting

### Sessão não conecta

1. Verificar se QR Code foi gerado
2. Verificar logs do servidor
3. Tentar reconectar: `POST /api/whatsapp/reconnect`
4. Em último caso, fazer logout e nova conexão

### Múltiplas sessões do mesmo usuário

- Sistema permite apenas 1 sessão por usuário
- Sessões antigas são automaticamente substituídas

### Erro "Limite de sessões atingido"

- Limite padrão: 1000 sessões
- Aumentar em `CONFIG.maxSessions` se necessário
- Verificar sessões inativas com `/api/admin/sessions`

---

## 📈 Escalabilidade

### Limites Atuais

- **Sessões simultâneas**: 1000
- **Mensagens por sessão**: Conforme plano do usuário
- **Armazenamento**: ~50MB por sessão ativa

### Otimizações Futuras

- [ ] Cluster de servidores
- [ ] Redis para cache de sessões
- [ ] Balanceamento de carga
- [ ] Monitoramento com Prometheus

---

## 📝 Notas Importantes

1. **WhatsApp Web.js**: Baseado em Puppeteer + WhatsApp Web
2. **Versão do WhatsApp**: Usa versão fixa para estabilidade
3. **Limite do WhatsApp**: Respeitar limites anti-spam do WhatsApp
4. **Conformidade**: Seguir termos de uso do WhatsApp

---

## 🤝 Contribuindo

Para adicionar funcionalidades:

1. Editar `server/whatsapp-manager.js` para novas funções
2. Adicionar rotas em `server/index.js`
3. Atualizar banco de dados em `server/database.js`
4. Documentar neste arquivo

---

## 📞 Suporte

Para problemas ou dúvidas:

1. Verificar logs do servidor
2. Consultar esta documentação
3. Testar com `/api/whatsapp/my-session`
4. Criar issue no repositório

---

**Última atualização:** 2024-12-11
**Versão:** 1.0.0
**Status:** ✅ Produção
