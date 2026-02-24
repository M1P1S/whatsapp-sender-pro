// ============================================
// WHATSAPP MANAGER - ENGINE COMPLETO
// Vídeos INLINE, áudio PTT, status, chat, bot
// ============================================

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

let client = null;
let qrCodeData = null;
let isConnected = false;
let isAuthenticated = false;
let isInitializing = false;

// Callback para mensagens recebidas (usado pelo bot)
let onMessageCallback = null;

async function connectToWhatsApp() {
  if (isInitializing) {
    console.log('⏳ Já está inicializando...');
    return;
  }

  try {
    isInitializing = true;
    console.log('🔄 Iniciando WhatsApp Web.js (Manager)...');

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: 'wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
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

    client.on('qr', async (qr) => {
      console.log('📱 QR Code gerado!');
      qrCodeData = await qrcode.toDataURL(qr);
      qrcode.toString(qr, { type: 'terminal', small: true }, (err, url) => {
        if (!err) console.log(url);
      });
    });

    client.on('ready', async () => {
      console.log('✅ WhatsApp conectado com sucesso! (ready event)');
      isConnected = true;
      isAuthenticated = true;
      qrCodeData = null;
      isInitializing = false;

      try {
        const info = await client.info;
        console.log(`👤 Conectado como: ${info.pushname || info.wid.user}`);
      } catch (error) {
        console.log('👤 WhatsApp conectado');
      }
    });

    client.on('authenticated', () => {
      console.log('🔐 Autenticado com sucesso!');
      isAuthenticated = true;
      qrCodeData = null; // QR já foi escaneado

      // Fallback: se 'ready' não disparar em 30s, verificar estado do client
      setTimeout(async () => {
        if (isAuthenticated && !isConnected && client) {
          console.log('⚠️  ready não disparou em 30s, verificando estado...');
          try {
            const state = await client.getState();
            console.log(`📊 Estado do client: ${state}`);
            if (state === 'CONNECTED') {
              console.log('✅ Client está conectado! Corrigindo flag...');
              isConnected = true;
              isInitializing = false;
            }
          } catch (err) {
            console.log('⏳ Client ainda não está pronto:', err.message);
          }
        }
      }, 30000);
    });

    client.on('auth_failure', (msg) => {
      console.log('❌ Falha na autenticação:', msg);
      isConnected = false;
      isAuthenticated = false;
      isInitializing = false;
      qrCodeData = null;
    });

    client.on('disconnected', (reason) => {
      console.log('⚠️  WhatsApp desconectado:', reason);
      isConnected = false;
      isAuthenticated = false;
      qrCodeData = null;
      isInitializing = false;
    });

    // Listener para mensagens recebidas (bot)
    client.on('message', async (msg) => {
      if (onMessageCallback) {
        try {
          await onMessageCallback(msg);
        } catch (err) {
          console.error('[BOT] Erro ao processar mensagem:', err);
        }
      }
    });

    await client.initialize();
    console.log('🎯 Cliente inicializado, aguardando autenticação...');

  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    isConnected = false;
    isInitializing = false;
  }
}

function formatPhoneNumber(number) {
  let cleaned = String(number).replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (!cleaned.startsWith('55') && cleaned.length >= 10) cleaned = '55' + cleaned;
  return cleaned + '@c.us';
}

async function checkNumberExists(number) {
  if (!client || !isConnected) {
    throw new Error('WhatsApp não está conectado');
  }
  try {
    const chatId = formatPhoneNumber(number);
    return await client.isRegisteredUser(chatId);
  } catch (error) {
    console.error(`⚠️  Erro ao verificar ${number}:`, error.message);
    return false;
  }
}

// ============================================
// ENVIO DE MENSAGENS (vídeo inline, áudio PTT)
// ============================================
async function sendMessage(number, text, mediaPath = null, mediaType = null) {
  if (!client || !isConnected) {
    throw new Error('WhatsApp não está conectado');
  }

  try {
    const chatId = formatPhoneNumber(number);

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📤 ENVIANDO: ${number}`);

    const state = await client.getState();
    if (state !== 'CONNECTED') {
      throw new Error(`WhatsApp não conectado: ${state}`);
    }

    const exists = await checkNumberExists(number);
    if (!exists) {
      throw new Error(`Número ${number} não existe no WhatsApp`);
    }

    // SEM MÍDIA
    if (!mediaPath || !fs.existsSync(mediaPath)) {
      if (!text) throw new Error('Sem texto nem mídia');
      await client.sendMessage(chatId, text);
      console.log(`✅ Texto enviado`);
      console.log(`${'='.repeat(50)}\n`);
      return true;
    }

    // COM MÍDIA
    const fileSize = fs.statSync(mediaPath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    console.log(`📎 Mídia: ${fileSizeMB}MB`);

    const ext = path.extname(mediaPath).toLowerCase();
    const media = MessageMedia.fromFilePath(mediaPath);

    // VÍDEOS - INLINE (sem sendMediaAsDocument)
    if (mediaType === 'video' || ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.3gp'].includes(ext)) {
      console.log(`🎬 Enviando VÍDEO inline...`);
      await client.sendMessage(chatId, media, {
        caption: text || undefined
      });
      console.log(`✅ Vídeo enviado inline`);
    }
    // IMAGENS
    else if (mediaType === 'image' || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      console.log(`🖼️  Enviando IMAGEM...`);
      await client.sendMessage(chatId, media, { caption: text || undefined });
      console.log(`✅ Imagem enviada`);
    }
    // ÁUDIO - como PTT (push-to-talk)
    else if (mediaType === 'audio' || ['.mp3', '.ogg', '.wav', '.m4a'].includes(ext)) {
      console.log(`🎵 Enviando ÁUDIO como PTT...`);
      await client.sendMessage(chatId, media, { sendAudioAsVoice: true });
      console.log(`✅ Áudio enviado como PTT`);
    }
    // DOCUMENTOS
    else {
      console.log(`📄 Enviando DOCUMENTO...`);
      await client.sendMessage(chatId, media, {
        caption: text || undefined,
        sendMediaAsDocument: true
      });
      console.log(`✅ Documento enviado`);
    }

    console.log(`${'='.repeat(50)}\n`);
    return true;

  } catch (error) {
    console.error(`❌ ERRO:`, error.message);
    console.log(`${'='.repeat(50)}\n`);
    throw error;
  }
}

// ============================================
// STATUS (stories)
// ============================================
async function postStatus(text, mediaPath = null, type = 'text', options = {}) {
  if (!client || !isConnected) {
    throw new Error('WhatsApp não está conectado');
  }

  try {
    const statusChatId = 'status@broadcast';

    if (type === 'text' || (!mediaPath && text)) {
      // Status de texto
      console.log('📝 Postando status de texto...');
      await client.sendMessage(statusChatId, text, {
        extra: {
          backgroundColor: options.backgroundColor || '#128C7E',
          fontStyle: parseInt(options.fontStyle) || 0
        }
      });
      console.log('✅ Status de texto postado');
    } else if (mediaPath && fs.existsSync(mediaPath)) {
      // Status com mídia
      console.log('📸 Postando status com mídia...');
      const media = MessageMedia.fromFilePath(mediaPath);
      await client.sendMessage(statusChatId, media, {
        caption: text || undefined
      });
      console.log('✅ Status com mídia postado');
    } else {
      throw new Error('Nenhum conteúdo para postar');
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao postar status:', error);
    throw error;
  }
}

// ============================================
// CHAT (listar, mensagens, enviar direto)
// ============================================
async function getChats() {
  if (!client || !isConnected) {
    throw new Error('WhatsApp não está conectado');
  }

  try {
    const chats = await client.getChats();
    return chats
      .filter(chat => !chat.isGroup || chat.name)
      .slice(0, 50)
      .map(chat => ({
        id: chat.id._serialized,
        name: chat.name || chat.id.user,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
        lastMessage: chat.lastMessage ? {
          body: chat.lastMessage.body ? chat.lastMessage.body.substring(0, 100) : '',
          timestamp: chat.lastMessage.timestamp
        } : null,
        timestamp: chat.timestamp
      }));
  } catch (error) {
    console.error('❌ Erro ao listar chats:', error);
    throw error;
  }
}

async function getChatMessages(chatId, limit = 30) {
  if (!client || !isConnected) {
    throw new Error('WhatsApp não está conectado');
  }

  try {
    const chat = await client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit });

    return messages.map(msg => ({
      id: msg.id._serialized,
      body: msg.body,
      fromMe: msg.fromMe,
      timestamp: msg.timestamp,
      type: msg.type,
      hasMedia: msg.hasMedia,
      author: msg.author || null
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar mensagens:', error);
    throw error;
  }
}

async function sendDirectMessage(chatId, message, mediaPath = null) {
  if (!client || !isConnected) {
    throw new Error('WhatsApp não está conectado');
  }

  try {
    if (mediaPath && fs.existsSync(mediaPath)) {
      const media = MessageMedia.fromFilePath(mediaPath);
      await client.sendMessage(chatId, media, { caption: message || undefined });
    } else {
      await client.sendMessage(chatId, message);
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem direta:', error);
    throw error;
  }
}

// ============================================
// UTILITÁRIOS
// ============================================
function getQRCode() {
  return qrCodeData;
}

function getConnectionStatus() {
  return isConnected;
}

function getDetailedStatus() {
  return {
    connected: isConnected,
    authenticated: isAuthenticated,
    initializing: isInitializing,
    qr: qrCodeData,
    hasClient: !!client
  };
}

function getClient() {
  return client;
}

function setOnMessageCallback(callback) {
  onMessageCallback = callback;
}

async function getUserInfo() {
  if (client && isConnected) {
    try {
      const info = await client.info;
      return { id: info.wid._serialized, name: info.pushname };
    } catch (error) {
      return null;
    }
  }
  return null;
}

async function forceLogout() {
  try {
    if (client) {
      await client.logout();
      await client.destroy();
    }

    const authPath = path.join(__dirname, '..', 'wwebjs_auth');
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('🗑️  Sessão limpa');
    }

    isConnected = false;
    qrCodeData = null;
    client = null;

    return true;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return false;
  }
}

module.exports = {
  connectToWhatsApp,
  sendMessage,
  getQRCode,
  getConnectionStatus,
  getDetailedStatus,
  getClient,
  getUserInfo,
  checkNumberExists,
  forceLogout,
  postStatus,
  getChats,
  getChatMessages,
  sendDirectMessage,
  setOnMessageCallback
};
