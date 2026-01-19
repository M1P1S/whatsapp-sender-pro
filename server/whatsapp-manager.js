// ============================================
// WHATSAPP MULTI-SESSION MANAGER
// Gerencia múltiplas sessões isoladas do WhatsApp
// Cada usuário tem sua própria conexão
// ============================================

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

// ============================================
// ARMAZENAMENTO DE SESSÕES
// ============================================
const sessions = new Map(); // userId -> { client, qrCode, status, lastActivity }

// Status possíveis: 'initializing', 'qr_ready', 'authenticated', 'connected', 'disconnected', 'error'

// ============================================
// CONFIGURAÇÃO
// ============================================
const CONFIG = {
  maxSessions: 1000,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
  qrTimeout: 60 * 1000, // 1 minuto
  authPath: path.join(__dirname, '..', 'wwebjs_auth')
};

// ============================================
// FUNÇÕES DE GERENCIAMENTO
// ============================================

/**
 * Retorna informações de todas as sessões ativas
 */
function getAllSessionsInfo() {
  const info = [];
  sessions.forEach((session, userId) => {
    info.push({
      userId,
      status: session.status,
      connected: session.status === 'connected',
      lastActivity: session.lastActivity,
      hasQR: !!session.qrCode
    });
  });
  return info;
}

/**
 * Retorna informações de uma sessão específica
 */
function getSessionInfo(userId) {
  const session = sessions.get(userId);
  if (!session) {
    return { exists: false, status: 'not_initialized' };
  }

  return {
    exists: true,
    status: session.status,
    connected: session.status === 'connected',
    lastActivity: session.lastActivity,
    hasQR: !!session.qrCode
  };
}

/**
 * Limpa sessões inativas (> 24h sem atividade)
 */
async function cleanInactiveSessions() {
  const now = Date.now();
  let cleaned = 0;

  for (const [userId, session] of sessions.entries()) {
    const inactiveTime = now - session.lastActivity;

    if (inactiveTime > CONFIG.sessionTimeout) {
      console.log(`[MULTI-SESSION] Limpando sessão inativa | User: ${userId} | Inativa há: ${Math.floor(inactiveTime / 1000 / 60)} min`);

      try {
        await destroySession(userId);
        cleaned++;
      } catch (error) {
        console.error(`[MULTI-SESSION] Erro ao limpar sessão ${userId}:`, error);
      }
    }
  }

  if (cleaned > 0) {
    console.log(`[MULTI-SESSION] ${cleaned} sessão(ões) inativa(s) removida(s)`);
  }

  return cleaned;
}

/**
 * Atualiza última atividade da sessão
 */
function updateSessionActivity(userId) {
  const session = sessions.get(userId);
  if (session) {
    session.lastActivity = Date.now();
  }
}

// ============================================
// CRIAÇÃO E CONEXÃO
// ============================================

/**
 * Cria e inicializa uma sessão do WhatsApp para um usuário
 */
async function createSession(userId) {
  // Verificar se já existe
  if (sessions.has(userId)) {
    const existing = sessions.get(userId);
    if (existing.status === 'connected') {
      console.log(`[MULTI-SESSION] Sessão já existe e está conectada | User: ${userId}`);
      return { success: true, message: 'Sessão já conectada' };
    }
  }

  // Verificar limite
  if (sessions.size >= CONFIG.maxSessions) {
    throw new Error('Limite de sessões atingido');
  }

  console.log(`[MULTI-SESSION] Criando nova sessão | User: ${userId}`);

  try {
    // Criar cliente WhatsApp
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: `user-${userId}`,
        dataPath: CONFIG.authPath
      }),
      puppeteer: {
        headless: true,
        executablePath: "/usr/bin/google-chrome-stable",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions'
        ]
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
      }
    });

    // Armazenar sessão
    const session = {
      client,
      qrCode: null,
      status: 'initializing',
      lastActivity: Date.now(),
      userId
    };

    sessions.set(userId, session);

    // ============================================
    // EVENTOS DO CLIENTE
    // ============================================

    client.on('qr', async (qr) => {
      console.log(`[MULTI-SESSION] QR Code gerado | User: ${userId}`);

      try {
        const qrDataURL = await qrcode.toDataURL(qr);
        session.qrCode = qrDataURL;
        session.status = 'qr_ready';
        session.lastActivity = Date.now();

        // Log no terminal (opcional)
        qrcode.toString(qr, { type: 'terminal', small: true }, (err, url) => {
          if (!err) console.log(`[User ${userId}] QR Code:\n${url}`);
        });
      } catch (error) {
        console.error(`[MULTI-SESSION] Erro ao gerar QR Code | User: ${userId}:`, error);
      }
    });

    client.on('authenticated', () => {
      console.log(`[MULTI-SESSION] Autenticado | User: ${userId}`);
      session.status = 'authenticated';
      session.qrCode = null;
      session.lastActivity = Date.now();
    });

    client.on('ready', async () => {
      console.log(`[MULTI-SESSION] Conectado | User: ${userId}`);
      session.status = 'connected';
      session.qrCode = null;
      session.lastActivity = Date.now();

      try {
        const info = await client.info;
        console.log(`[MULTI-SESSION] User ${userId} conectado como: ${info.pushname || info.wid.user}`);
      } catch (error) {
        console.log(`[MULTI-SESSION] User ${userId} conectado (info não disponível)`);
      }
    });

    client.on('auth_failure', (msg) => {
      console.error(`[MULTI-SESSION] Falha na autenticação | User: ${userId}:`, msg);
      session.status = 'error';
      session.qrCode = null;
    });

    client.on('disconnected', (reason) => {
      console.log(`[MULTI-SESSION] Desconectado | User: ${userId} | Razão: ${reason}`);
      session.status = 'disconnected';
      session.qrCode = null;
    });

    // Inicializar cliente
    await client.initialize();
    console.log(`[MULTI-SESSION] Cliente inicializado, aguardando autenticação | User: ${userId}`);

    return { success: true, message: 'Sessão criada, aguardando QR Code' };

  } catch (error) {
    console.error(`[MULTI-SESSION] Erro ao criar sessão | User: ${userId}:`, error);
    sessions.delete(userId);
    throw error;
  }
}

/**
 * Destrói uma sessão do WhatsApp
 */
async function destroySession(userId) {
  const session = sessions.get(userId);

  if (!session) {
    console.log(`[MULTI-SESSION] Sessão não encontrada | User: ${userId}`);
    return { success: false, message: 'Sessão não existe' };
  }

  console.log(`[MULTI-SESSION] Destruindo sessão | User: ${userId}`);

  try {
    // Destruir cliente
    if (session.client) {
      await session.client.destroy();
    }

    // Remover da memória
    sessions.delete(userId);

    console.log(`[MULTI-SESSION] Sessão destruída | User: ${userId}`);
    return { success: true, message: 'Sessão destruída' };

  } catch (error) {
    console.error(`[MULTI-SESSION] Erro ao destruir sessão | User: ${userId}:`, error);
    sessions.delete(userId);
    throw error;
  }
}

/**
 * Faz logout e remove autenticação
 */
async function logoutSession(userId) {
  const session = sessions.get(userId);

  if (!session) {
    return { success: false, message: 'Sessão não existe' };
  }

  console.log(`[MULTI-SESSION] Fazendo logout | User: ${userId}`);

  try {
    // Logout do WhatsApp
    if (session.client) {
      await session.client.logout();
      await session.client.destroy();
    }

    // Remover arquivos de autenticação
    const userAuthPath = path.join(CONFIG.authPath, `session-user-${userId}`);
    if (fs.existsSync(userAuthPath)) {
      fs.rmSync(userAuthPath, { recursive: true, force: true });
      console.log(`[MULTI-SESSION] Arquivos de auth removidos | User: ${userId}`);
    }

    // Remover da memória
    sessions.delete(userId);

    console.log(`[MULTI-SESSION] Logout completo | User: ${userId}`);
    return { success: true, message: 'Logout realizado' };

  } catch (error) {
    console.error(`[MULTI-SESSION] Erro ao fazer logout | User: ${userId}:`, error);
    sessions.delete(userId);
    throw error;
  }
}

// ============================================
// FUNÇÕES DE MENSAGEM
// ============================================

/**
 * Formata número de telefone
 */
function formatPhoneNumber(number) {
  let cleaned = String(number).replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  if (cleaned.startsWith("55")) cleaned = cleaned.substring(2);
  if (cleaned.length === 11) {
    const ddd = cleaned.substring(0, 2);
    const numero = cleaned.substring(3);
    cleaned = ddd + numero;
  }
  if (cleaned.length >= 10) cleaned = "55" + cleaned;
  return cleaned + "@c.us";
}

/**
 * Verifica se número existe no WhatsApp
 */
async function checkNumberExists(userId, number) {
  const session = sessions.get(userId);

  if (!session || session.status !== 'connected') {
    throw new Error('WhatsApp não está conectado');
  }

  try {
    const chatId = formatPhoneNumber(number);
    const exists = await session.client.isRegisteredUser(chatId);
    updateSessionActivity(userId);
    return exists;
  } catch (error) {
    console.error(`[MULTI-SESSION] Erro ao verificar número | User: ${userId}:`, error);
    return false;
  }
}

/**
 * Envia mensagem
 */
async function sendMessage(userId, number, text, mediaPath = null, mediaType = null) {
  const session = sessions.get(userId);

  if (!session) {
    throw new Error('Sessão não existe. Conecte-se ao WhatsApp primeiro.');
  }

  if (session.status !== 'connected') {
    throw new Error(`WhatsApp não está conectado. Status: ${session.status}`);
  }

  const client = session.client;

  try {
    const chatId = formatPhoneNumber(number);

    console.log(`[MULTI-SESSION] User ${userId} enviando para ${number}`);

    // Verificar estado da conexão
    const state = await client.getState();
    if (state !== 'CONNECTED') {
      throw new Error(`WhatsApp não conectado: ${state}`);
    }

    // Verificar se número existe
    const exists = await checkNumberExists(userId, number);
    if (!exists) {
      throw new Error(`Número ${number} não existe no WhatsApp`);
    }

    // SEM MÍDIA
   // SEM MÍDIA
	if (!mediaPath || !fs.existsSync(mediaPath)) {
	  if (!text) throw new Error('Sem texto nem mídia');
          await client.sendMessage(chatId, text, { sendSeen: false });
          console.log(`[MULTI-SESSION] ✅ User ${userId} enviou texto para ${number}`);
	  return true;
	}

    // COM MÍDIA
    const fileSize = fs.statSync(mediaPath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    console.log(`[MULTI-SESSION] User ${userId} enviando mídia (${fileSizeMB}MB) para ${number}`);

    const ext = path.extname(mediaPath).toLowerCase();
    const media = MessageMedia.fromFilePath(mediaPath);

    // VÍDEOS - SEMPRE COMO DOCUMENTO
    if (mediaType === 'video' || ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.3gp'].includes(ext)) {
      try {
        await client.sendMessage(chatId, media, { sendSeen: false, caption: text || undefined });
      } catch (error) {
        if (error.message && error.message.includes('markedUnread')) {
          console.log(`[MULTI-SESSION] Ignorando erro markedUnread - vídeo enviado`);
        } else {
          throw error;
        }
      }
      console.log(`[MULTI-SESSION] User ${userId} enviou vídeo para ${number}`);
    }
    // IMAGENS
    else if (mediaType === 'image' || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      try {
        await client.sendMessage(chatId, media, { sendSeen: false, caption: text || undefined });
      } catch (error) {
        if (error.message && error.message.includes('markedUnread')) {
          console.log(`[MULTI-SESSION] Ignorando erro markedUnread - imagem enviada`);
        } else {
          throw error;
        }
      }
      console.log(`[MULTI-SESSION] User ${userId} enviou imagem para ${number}`);
    }
    // ÁUDIO
    else if (mediaType === 'audio' || ['.mp3', '.ogg', '.wav'].includes(ext)) {
      try {
        await client.sendMessage(chatId, media, { sendSeen: false, sendAudioAsVoice: true });
      } catch (error) {
        if (error.message && error.message.includes('markedUnread')) {
          console.log(`[MULTI-SESSION] Ignorando erro markedUnread - áudio enviado`);
        } else {
          throw error;
        }
      }
      console.log(`[MULTI-SESSION] User ${userId} enviou áudio para ${number}`);
    }
    // DOCUMENTOS
    else {
      try {
        await client.sendMessage(chatId, media, { sendSeen: false, caption: text || undefined, sendMediaAsDocument: true });
      } catch (error) {
        if (error.message && error.message.includes('markedUnread')) {
          console.log(`[MULTI-SESSION] Ignorando erro markedUnread - documento enviado`);
        } else {
          throw error;
        }
      }
      console.log(`[MULTI-SESSION] User ${userId} enviou documento para ${number}`);
    }

    updateSessionActivity(userId);
    return true;

  } catch (error) {
    console.error(`[MULTI-SESSION] Erro ao enviar mensagem | User: ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Obtém QR Code de uma sessão
 */
function getQRCode(userId) {
  const session = sessions.get(userId);

  if (!session) {
    return null;
  }

  return session.qrCode;
}

/**
 * Obtém status de conexão
 */
function getConnectionStatus(userId) {
  const session = sessions.get(userId);

  if (!session) {
    return { connected: false, status: 'not_initialized' };
  }

  return {
    connected: session.status === 'connected',
    status: session.status
  };
}

/**
 * Obtém informações do usuário WhatsApp
 */
async function getUserInfo(userId) {
  const session = sessions.get(userId);

  if (!session || session.status !== 'connected') {
    return null;
  }

  try {
    const info = await session.client.info;
    return {
      id: info.wid._serialized,
      name: info.pushname
    };
  } catch (error) {
    return null;
  }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Criar diretório de autenticação se não existir
if (!fs.existsSync(CONFIG.authPath)) {
  fs.mkdirSync(CONFIG.authPath, { recursive: true });
  console.log('[MULTI-SESSION] Diretório de autenticação criado');
}

// Limpeza automática de sessões inativas (a cada 1 hora)
setInterval(() => {
  cleanInactiveSessions().catch(err => {
    console.error('[MULTI-SESSION] Erro na limpeza automática:', err);
  });
}, 60 * 60 * 1000);

console.log('[MULTI-SESSION] Sistema de multi-sessões inicializado');
console.log(`[MULTI-SESSION] Limite de sessões: ${CONFIG.maxSessions}`);
console.log(`[MULTI-SESSION] Timeout de sessão: ${CONFIG.sessionTimeout / 1000 / 60} minutos`);

// ============================================
// EXPORTS
// ============================================

module.exports = {
  createSession,
  destroySession,
  logoutSession,
  sendMessage,
  checkNumberExists,
  getQRCode,
  getConnectionStatus,
  getUserInfo,
  getSessionInfo,
  getAllSessionsInfo,
  cleanInactiveSessions,
  updateSessionActivity
};
