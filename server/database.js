const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Cria/abre banco de dados
const db = new sqlite3.Database(path.join(__dirname, 'whatsapp.db'), (err) => {
  if (err) {
    console.error('❌ Erro ao abrir banco de dados:', err);
  } else {
    console.log('✅ Banco de dados conectado');
    initDatabase();
  }
});

// Inicializa as tabelas
function initDatabase() {
  // Tabela de usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      plan TEXT DEFAULT 'FREE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      plan_expires_at DATETIME
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela users:', err);
    } else {
      console.log('✅ Tabela users criada/verificada');
    }
  });

  // Tabela de envios (para controle de limite)
  db.run(`
    CREATE TABLE IF NOT EXISTS sends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela sends:', err);
    } else {
      console.log('✅ Tabela sends criada/verificada');
    }
  });

  // Tabela de histórico
  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      contacts_count INTEGER NOT NULL,
      success_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      has_media BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela history:', err);
    } else {
      console.log('✅ Tabela history criada/verificada');
    }
  });

  // Tabela de agendamentos
  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      contacts TEXT NOT NULL,
      message TEXT NOT NULL,
      media_path TEXT,
      media_type TEXT,
      scheduled_date DATETIME NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      executed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela schedules:', err);
    } else {
      console.log('✅ Tabela schedules criada/verificada');
    }
  });

  // ============================================
  // [MULTI-SESSION:WHATSAPP] Tabela de sessões do WhatsApp
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      whatsapp_number TEXT,
      whatsapp_name TEXT,
      status TEXT DEFAULT 'disconnected',
      last_connection DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela whatsapp_sessions:', err);
    } else {
      console.log('✅ Tabela whatsapp_sessions criada/verificada');
    }
  });

  // 🔧 EXECUTAR MIGRAÇÃO após criar tabelas
  setTimeout(() => {
    migrateDatabase();
  }, 1000);
}

// ===== 🔧 MIGRAÇÃO: ADICIONAR COLUNA CONTACTS =====
function migrateDatabase() {
  db.all("PRAGMA table_info(history)", (err, columns) => {
    if (err) {
      console.error('❌ Erro ao verificar colunas:', err);
      return;
    }
    
    const hasContactsColumn = columns.some(col => col.name === 'contacts');
    
    if (!hasContactsColumn) {
      console.log('🔄 Migrando banco: adicionando coluna contacts...');
      
      db.run('ALTER TABLE history ADD COLUMN contacts TEXT', (err) => {
        if (err) {
          console.error('❌ Erro na migração:', err);
        } else {
          console.log('✅ Coluna contacts adicionada com sucesso!');
        }
      });
    } else {
      console.log('✅ Banco já está atualizado');
    }
  });
}

// ===== FUNÇÕES DE USUÁRIO =====

// Criar usuário
async function createUser(email, password, name, cpf) {
  return new Promise((resolve, reject) => {
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run(
      'INSERT INTO users (email, password, name, plan, cpf) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, name, 'FREE', cpf],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, email, name, plan: 'FREE' });
        }
      }
    );
  });
}

// Buscar usuário por email
async function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Buscar usuário por ID
async function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, email, name, plan, plan_expires_at, cpf FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Verificar senha
function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

// Atualizar plano do usuário
async function upgradeToPro(userId, months = 1) {
  return new Promise((resolve, reject) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);
    
    db.run(
      'UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?',
      ['PRO', expiresAt.toISOString(), userId],
      (err) => {
        if (err) reject(err);
        else resolve({ plan: 'PRO', expiresAt });
      }
    );
  });
}

// ===== FUNÇÕES DE CONTROLE DE LIMITE =====

// 🔧 CORREÇÃO 3: Obter contador de envios do dia (com timezone BRT)
async function getTodaySends(userId) {
  return new Promise((resolve, reject) => {
    // 🔧 CORREÇÃO: Usar horário de Brasília (UTC-3)
    const today = new Date(Date.now() - 3 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    
    db.get(
      'SELECT count FROM sends WHERE user_id = ? AND date = ?',
      [userId, today],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      }
    );
  });
}

// 🔧 CORREÇÃO 3: Incrementar contador de envios (com timezone BRT)
async function incrementSends(userId, count) {
  return new Promise((resolve, reject) => {
    // 🔧 CORREÇÃO: Usar horário de Brasília (UTC-3)
    const today = new Date(Date.now() - 3 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    
    db.run(
      `INSERT INTO sends (user_id, date, count) 
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, date) 
       DO UPDATE SET count = count + ?`,
      [userId, today, count, count],
      (err) => {
        if (err) {
          // Fallback se ON CONFLICT não funcionar
          db.get(
            'SELECT id, count FROM sends WHERE user_id = ? AND date = ?',
            [userId, today],
            (err2, row) => {
              if (row) {
                db.run(
                  'UPDATE sends SET count = ? WHERE id = ?',
                  [row.count + count, row.id],
                  (err3) => {
                    if (err3) reject(err3);
                    else resolve();
                  }
                );
              } else {
                db.run(
                  'INSERT INTO sends (user_id, date, count) VALUES (?, ?, ?)',
                  [userId, today, count],
                  (err4) => {
                    if (err4) reject(err4);
                    else resolve();
                  }
                );
              }
            }
          );
        } else {
          resolve();
        }
      }
    );
  });
}

// 🔧 CORREÇÃO 2: Verificar se usuário pode enviar (retorna todaySends)
async function canSend(userId, count, hasMedia = false) {
  const user = await getUserById(userId);
  
  // Verifica se plano PRO está ativo
  if (user.plan === 'PRO' || user.plan === 'PREMIUM') {
    if (user.plan_expires_at) {
      const expiresAt = new Date(user.plan_expires_at);
      if (expiresAt < new Date()) {
        // Plano expirou, volta para FREE
        await db.run('UPDATE users SET plan = ? WHERE id = ?', ['FREE', userId]);
        user.plan = 'FREE';
      } else {
        // PRO ativo - limite alto (500) ou ilimitado
        const todaySends = await getTodaySends(userId);
        return {
          allowed: todaySends + count <= 500,
          remaining: 500 - todaySends,
          todaySends: todaySends,
          limit: 500,
          unlimited: true,
          plan: user.plan,
          canSendMedia: true
        };
      }
    } else {
      // PRO/PREMIUM SEM vencimento (ILIMITADO)
      const todaySends = await getTodaySends(userId);
      return {
        allowed: true,
        remaining: 999999,
        todaySends: todaySends,
        limit: 999999,
        unlimited: true,
        plan: user.plan,
        canSendMedia: true
      };
    }
  }
  
  // Plano FREE
  if (hasMedia) {
    return {
      allowed: false,
      remaining: 0,
      todaySends: 0,
      limit: 50,
      unlimited: false,
      plan: 'FREE',
      canSendMedia: false,
      message: 'Upgrade para PRO para enviar imagens e vídeos'
    };
  }
  
  const todaySends = await getTodaySends(userId);
  const limit = 50;
  
  return {
    allowed: todaySends + count <= limit,
    remaining: limit - todaySends,
    todaySends: todaySends,
    limit: limit,
    unlimited: false,
    plan: 'FREE',
    canSendMedia: false
  };
}

// 🔧 MODIFICADO: Adicionar ao histórico COM lista de contatos
async function addToHistory(userId, contactsCount, successCount, failedCount, hasMedia, contactsList = null) {
  return new Promise((resolve, reject) => {
    // 🔧 CORREÇÃO: Salvar com horário BRT (UTC-3)
    const now = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    
    // Converter array de contatos para JSON
    const contactsJson = contactsList ? JSON.stringify(contactsList) : null;
    
    db.run(
      'INSERT INTO history (user_id, contacts_count, success_count, failed_count, has_media, contacts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, contactsCount, successCount, failedCount, hasMedia ? 1 : 0, contactsJson, now],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Obter histórico do usuário
async function getUserHistory(userId, limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// ===== FUNÇÕES DE AGENDAMENTO =====

// Criar agendamento
async function createSchedule(userId, contacts, message, mediaPath, mediaType, scheduledDate) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO schedules (user_id, contacts, message, media_path, media_type, scheduled_date) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, JSON.stringify(contacts), message, mediaPath, mediaType, scheduledDate],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

// Obter agendamentos pendentes
async function getPendingSchedules() {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.all(
      'SELECT * FROM schedules WHERE status = ? AND scheduled_date <= ?',
      ['pending', now],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Atualizar status do agendamento
async function updateScheduleStatus(scheduleId, status, executedAt = null) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE schedules SET status = ?, executed_at = ? WHERE id = ?',
      [status, executedAt, scheduleId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Obter agendamentos do usuário
async function getUserSchedules(userId, limit = 20) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM schedules WHERE user_id = ? ORDER BY scheduled_date DESC LIMIT ?',
      [userId, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Cancelar agendamento
async function cancelSchedule(scheduleId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE schedules SET status = ? WHERE id = ? AND user_id = ?',
      ['cancelled', scheduleId, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// ============================================
// [SINGLE-SESSION:DB] FUNÇÕES DE SESSÃO ÚNICA
// ============================================

// 1. Criar nova sessão
async function createSession(userId, sessionToken, deviceInfo, ipAddress) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    
    db.run(
      `INSERT INTO active_sessions 
       (user_id, session_token, device_info, ip_address, created_at, last_activity, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [userId, sessionToken, deviceInfo, ipAddress, now, now],
      function(err) {
        if (err) {
          console.error('[SINGLE-SESSION:DB] Erro ao criar sessão:', err);
          reject(err);
        } else {
          console.log(`[SINGLE-SESSION:DB] Sessão criada | ID: ${this.lastID} | User: ${userId}`);
          resolve({ id: this.lastID });
        }
      }
    );
  });
}

// 2. Invalidar todas as sessões de um usuário
async function invalidateUserSessions(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE active_sessions SET is_active = 0 WHERE user_id = ? AND is_active = 1',
      [userId],
      function(err) {
        if (err) {
          console.error('[SINGLE-SESSION:DB] Erro ao invalidar sessões:', err);
          reject(err);
        } else {
          console.log(`[SINGLE-SESSION:DB] ${this.changes} sessão(ões) invalidada(s) | User: ${userId}`);
          resolve(this.changes);
        }
      }
    );
  });
}

// 3. Verificar se sessão está ativa
async function isSessionActive(sessionToken) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT is_active FROM active_sessions WHERE session_token = ? AND is_active = 1',
      [sessionToken],
      (err, row) => {
        if (err) {
          console.error('[SINGLE-SESSION:DB] Erro ao verificar sessão:', err);
          reject(err);
        } else {
          const isActive = row ? row.is_active === 1 : false;
          resolve(isActive);
        }
      }
    );
  });
}

// 4. Atualizar última atividade da sessão
async function updateSessionActivity(sessionToken) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    
    db.run(
      'UPDATE active_sessions SET last_activity = ? WHERE session_token = ? AND is_active = 1',
      [now, sessionToken],
      (err) => {
        if (err) {
          console.error('[SINGLE-SESSION:DB] Erro ao atualizar atividade:', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

// 5. Fazer logout (invalidar sessão específica)
async function logoutSession(sessionToken) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE active_sessions SET is_active = 0 WHERE session_token = ?',
      [sessionToken],
      function(err) {
        if (err) {
          console.error('[SINGLE-SESSION:DB] Erro ao fazer logout:', err);
          reject(err);
        } else {
          console.log(`[SINGLE-SESSION:DB] Logout realizado | Sessões: ${this.changes}`);
          resolve(this.changes);
        }
      }
    );
  });
}

// 6. Limpar sessões antigas (> 24 horas)
async function cleanOldSessions() {
  return new Promise((resolve, reject) => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    db.run(
      'DELETE FROM active_sessions WHERE last_activity < ?',
      [oneDayAgo],
      function(err) {
        if (err) {
          console.error('[SINGLE-SESSION:DB] Erro ao limpar sessões antigas:', err);
          reject(err);
        } else {
          if (this.changes > 0) {
            console.log(`[SINGLE-SESSION:DB] ${this.changes} sessão(ões) antiga(s) removida(s)`);
          }
          resolve(this.changes);
        }
      }
    );
  });
}

// ============================================
// [MULTI-SESSION:WHATSAPP] FUNÇÕES DE SESSÃO DO WHATSAPP
// ============================================

// Salvar/atualizar sessão do WhatsApp
async function saveWhatsAppSession(userId, whatsappNumber, whatsappName, status) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO whatsapp_sessions (user_id, whatsapp_number, whatsapp_name, status, last_connection, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         whatsapp_number = excluded.whatsapp_number,
         whatsapp_name = excluded.whatsapp_name,
         status = excluded.status,
         last_connection = excluded.last_connection,
         updated_at = excluded.updated_at`,
      [userId, whatsappNumber, whatsappName, status, now, now],
      function(err) {
        if (err) {
          console.error('[MULTI-SESSION:DB] Erro ao salvar sessão WhatsApp:', err);
          reject(err);
        } else {
          console.log(`[MULTI-SESSION:DB] Sessão WhatsApp salva | User: ${userId}`);
          resolve({ id: this.lastID });
        }
      }
    );
  });
}

// Obter sessão do WhatsApp por usuário
async function getWhatsAppSession(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM whatsapp_sessions WHERE user_id = ?',
      [userId],
      (err, row) => {
        if (err) {
          console.error('[MULTI-SESSION:DB] Erro ao buscar sessão WhatsApp:', err);
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

// Atualizar status da sessão
async function updateWhatsAppSessionStatus(userId, status) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
     'INSERT OR REPLACE INTO whatsapp_sessions (user_id, status, updated_at) VALUES (?, ?, ?)',
      [userId, status, now],
      function(err) {
        if (err) {
          console.error('[MULTI-SESSION:DB] Erro ao atualizar status:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

// Remover sessão do WhatsApp
async function deleteWhatsAppSession(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM whatsapp_sessions WHERE user_id = ?',
      [userId],
      function(err) {
        if (err) {
          console.error('[MULTI-SESSION:DB] Erro ao remover sessão WhatsApp:', err);
          reject(err);
        } else {
          console.log(`[MULTI-SESSION:DB] Sessão WhatsApp removida | User: ${userId}`);
          resolve(this.changes);
        }
      }
    );
  });
}

// Listar todas as sessões ativas
async function getAllWhatsAppSessions() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM whatsapp_sessions ORDER BY last_connection DESC',
      [],
      (err, rows) => {
        if (err) {
          console.error('[MULTI-SESSION:DB] Erro ao listar sessões:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

// ============================================
// EXPORTS
// ============================================

// Funções auxiliares para queries genéricas
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  run,
  get,
  all,
  db,
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
  upgradeToPro,
  getTodaySends,
  incrementSends,
  canSend,
  addToHistory,
  getUserHistory,
  createSchedule,
  getPendingSchedules,
  updateScheduleStatus,
  getUserSchedules,
  cancelSchedule,
  // [SINGLE-SESSION:DB] Exportar funções de sessão única
  createSession,
  invalidateUserSessions,
  isSessionActive,
  updateSessionActivity,
  logoutSession,
  cleanOldSessions,
  // [MULTI-SESSION:WHATSAPP] Exportar funções de sessão do WhatsApp
  saveWhatsAppSession,
  getWhatsAppSession,
  updateWhatsAppSessionStatus,
  deleteWhatsAppSession,
  getAllWhatsAppSessions
};
// ============================================================
// FUNÇÕES ANTI-BAN - SEND MODE
// ============================================================

// Obter modo de envio do usuário
async function getUserSendMode(userId) {
  try {
    const user = await db.get('SELECT send_mode FROM users WHERE id = ?', [userId]);
    return user?.send_mode || 'NORMAL';
  } catch (error) {
    console.error('Erro ao obter send_mode:', error);
    return 'NORMAL';
  }
}

// Atualizar modo de envio do usuário
async function updateUserSendMode(userId, mode) {
  try {
    await db.run('UPDATE users SET send_mode = ? WHERE id = ?', [mode, userId]);
    console.log(`✅ Modo de envio atualizado para ${mode} (usuário ${userId})`);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar send_mode:', error);
    return false;
  }
}
// ============================================
// VARIAÇÕES DE MENSAGEM (PREMIUM)
// ============================================

async function addMessageVariation(userId, text, orderIndex = 0) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO message_variations (user_id, variation_text, order_index) VALUES (?, ?, ?)",
      [userId, text, orderIndex],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

async function getMessageVariations(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM message_variations WHERE user_id = ? ORDER BY order_index ASC",
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

async function deleteMessageVariation(userId, variationId) {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM message_variations WHERE id = ? AND user_id = ?",
      [variationId, userId],
      (err) => {
        if (err) reject(err);
        else resolve({ deleted: true });
      }
    );
  });
}

async function getNextMessageVariation(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM message_variations WHERE user_id = ? ORDER BY order_index ASC",
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else if (rows.length === 0) resolve(null);
        else {
          const next = rows[0];
          const maxOrder = Math.max(...rows.map(r => r.order_index));
          db.run(
            "UPDATE message_variations SET order_index = ? WHERE id = ?",
            [maxOrder + 1, next.id],
            (err) => {
              if (err) reject(err);
              else resolve(next);
            }
          );
        }
      }
    );
  });
}

// ============================================
// PREFERÊNCIA DE MODO DE INTERVALO
// ============================================

async function getUserIntervalMode(userId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT interval_mode FROM users WHERE id = ?", [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.interval_mode : "antiban");
    });
  });
}

async function updateUserIntervalMode(userId, mode) {
  return new Promise((resolve, reject) => {
    db.run("UPDATE users SET interval_mode = ? WHERE id = ?", [mode, userId], (err) => {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}

// ============================================
// SISTEMA DE ASSINATURA E PAGAMENTOS
// ============================================

// Atualizar plano e vencimento do usuário
async function updateUserPlan(userId, plan, expiresAt) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      "UPDATE users SET plan = ?, plan_expires_at = ?, last_payment_date = ?, subscription_status = 'active', updated_at = ? WHERE id = ?",
      [plan, expiresAt, now, now, userId],
      (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
}

// Criar registro de pagamento
async function createPayment(userId, asaasPaymentId, plan, amount, paymentMethod, dueDate, boletoUrl, pixQrcode) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO payments (user_id, asaas_payment_id, plan, amount, payment_method, due_date, boleto_url, pix_qrcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, asaasPaymentId, plan, amount, paymentMethod, dueDate, boletoUrl, pixQrcode],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, success: true });
      }
    );
  });
}

// Atualizar status de pagamento
async function updatePaymentStatus(asaasPaymentId, status, paymentDate) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      "UPDATE payments SET status = ?, payment_date = ?, updated_at = ? WHERE asaas_payment_id = ?",
      [status, paymentDate, now, asaasPaymentId],
      (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
}

// Buscar pagamento por ID do Asaas
async function getPaymentByAsaasId(asaasPaymentId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM payments WHERE asaas_payment_id = ?", [asaasPaymentId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Buscar usuários com planos vencidos
async function getExpiredUsers() {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.all(
      "SELECT * FROM users WHERE plan IN ('PRO', 'PREMIUM') AND plan_expires_at <= ? AND subscription_status = 'active'",
      [now],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// Downgrade usuário para FREE
async function downgradeToFree(userId) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      "UPDATE users SET plan = 'FREE', subscription_status = 'expired', updated_at = ? WHERE id = ?",
      [now, userId],
      (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
}

// Atualizar customer ID do Asaas
async function updateAsaasCustomerId(userId, customerId) {
  return new Promise((resolve, reject) => {
    db.run("UPDATE users SET asaas_customer_id = ? WHERE id = ?", [customerId, userId], (err) => {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}

// Buscar pagamentos do usuário
async function getUserPayments(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// ========== BLACKLIST DE NÚMEROS INVÁLIDOS ==========
async function addInvalidNumber(number, userId, reason = 'não existe no WhatsApp') {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO invalid_numbers (number, user_id, reason) VALUES (?, ?, ?)",
      [number, userId, reason],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function isNumberInvalid(number) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT number FROM invalid_numbers WHERE number = ?",
      [number],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

async function filterValidContacts(contacts) {
  const valid = [];
  for (const contact of contacts) {
    const isInvalid = await isNumberInvalid(contact);
    if (!isInvalid) {
      valid.push(contact);
    }
  }
  return valid;
}


// ========== PAUSAS LONGAS ==========
async function getUserLongPausesConfig(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT enable_long_pauses, pause_after_messages, pause_duration_minutes FROM users WHERE id = ?",
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || { enable_long_pauses: 0, pause_after_messages: 100, pause_duration_minutes: 10 });
      }
    );
  });
}

async function updateUserLongPausesConfig(userId, enabled, afterMessages, durationMinutes) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE users SET enable_long_pauses = ?, pause_after_messages = ?, pause_duration_minutes = ? WHERE id = ?",
      [enabled ? 1 : 0, afterMessages, durationMinutes, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

module.exports = {
  ...module.exports,
  getUserSendMode,
  updateUserSendMode,
  addMessageVariation,
  getMessageVariations,
  deleteMessageVariation,
  getNextMessageVariation,
  getUserIntervalMode,
  updateUserIntervalMode,
  updateUserPlan,
  createPayment,
  updatePaymentStatus,
  getPaymentByAsaasId,
  getExpiredUsers,
  downgradeToFree,
  updateAsaasCustomerId,
  getUserPayments,
  addInvalidNumber,
  isNumberInvalid,
  filterValidContacts,
  getUserLongPausesConfig,
  updateUserLongPausesConfig
};
