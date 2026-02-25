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

  // Tabela de sessões ativas (SINGLE-SESSION)
  db.run(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_token TEXT NOT NULL,
      device_info TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela active_sessions:', err);
    } else {
      console.log('✅ Tabela active_sessions criada/verificada');
    }
  });

  // Tabela de configurações do bot
  db.run(`
    CREATE TABLE IF NOT EXISTS bot_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      enabled INTEGER DEFAULT 0,
      welcome_message TEXT,
      away_message TEXT,
      business_hours_start TEXT DEFAULT '09:00',
      business_hours_end TEXT DEFAULT '18:00',
      weekend_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela bot_configs:', err);
    } else {
      console.log('✅ Tabela bot_configs criada/verificada');
    }
  });

  // Tabela de regras do bot
  db.run(`
    CREATE TABLE IF NOT EXISTS bot_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      keyword TEXT NOT NULL,
      response TEXT NOT NULL,
      match_type TEXT DEFAULT 'contains',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela bot_rules:', err);
    } else {
      console.log('✅ Tabela bot_rules criada/verificada');
    }
  });

  // Tabela de contatos importados
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT,
      phone TEXT NOT NULL,
      ddd TEXT,
      source TEXT DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, phone)
    )
  `, (err) => {
    if (err) console.error('❌ Erro ao criar tabela contacts:', err);
    else console.log('✅ Tabela contacts criada/verificada');
  });

  // Tabela de sublistas
  db.run(`
    CREATE TABLE IF NOT EXISTS sublists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('❌ Erro ao criar tabela sublists:', err);
    else console.log('✅ Tabela sublists criada/verificada');
  });

  // Tabela de membros das sublistas
  db.run(`
    CREATE TABLE IF NOT EXISTS sublist_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sublist_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      FOREIGN KEY (sublist_id) REFERENCES sublists(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      UNIQUE(sublist_id, contact_id)
    )
  `, (err) => {
    if (err) console.error('❌ Erro ao criar tabela sublist_members:', err);
    else console.log('✅ Tabela sublist_members criada/verificada');
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
async function createUser(email, password, name) {
  return new Promise((resolve, reject) => {
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run(
      'INSERT INTO users (email, password, name, plan) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, 'FREE'],
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
    db.get('SELECT id, email, name, plan, plan_expires_at FROM users WHERE id = ?', [id], (err, row) => {
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
async function upgradeToPremium(userId, months = 1) {
  return new Promise((resolve, reject) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    db.run(
      'UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?',
      ['PREMIUM', expiresAt.toISOString(), userId],
      (err) => {
        if (err) reject(err);
        else resolve({ plan: 'PREMIUM', expiresAt });
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
  
  // Verifica se plano PREMIUM está ativo
  if (user.plan === 'PREMIUM') {
    if (user.plan_expires_at) {
      const expiresAt = new Date(user.plan_expires_at);
      if (expiresAt < new Date()) {
        // Plano expirou, volta para FREE
        await db.run('UPDATE users SET plan = ? WHERE id = ?', ['FREE', userId]);
        user.plan = 'FREE';
      } else {
        // PRO/PREMIUM ativo - limite alto (500) ou ilimitado
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
      message: 'Upgrade para PREMIUM para enviar imagens e vídeos'
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
// PROMISE WRAPPER para db.run (usado em rotas de webhook/premium)
// ============================================
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// ============================================
// FUNÇÕES DO BOT
// ============================================

async function getBotConfig(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM bot_configs WHERE user_id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

async function saveBotConfig(userId, config) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO bot_configs (user_id, enabled, welcome_message, away_message, business_hours_start, business_hours_end, weekend_message, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         enabled = excluded.enabled,
         welcome_message = excluded.welcome_message,
         away_message = excluded.away_message,
         business_hours_start = excluded.business_hours_start,
         business_hours_end = excluded.business_hours_end,
         weekend_message = excluded.weekend_message,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, config.enabled ? 1 : 0, config.welcome_message, config.away_message,
       config.business_hours_start || '09:00', config.business_hours_end || '18:00',
       config.weekend_message],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

async function getBotRules(userId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM bot_rules WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function addBotRule(userId, keyword, response, matchType = 'contains') {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO bot_rules (user_id, keyword, response, match_type) VALUES (?, ?, ?, ?)',
      [userId, keyword, response, matchType],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

async function deleteBotRule(ruleId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM bot_rules WHERE id = ? AND user_id = ?',
      [ruleId, userId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

// ============================================
// FUNÇÕES DE CONTATOS
// ============================================

// Importar contatos em lote (upsert - ignora duplicados)
async function importContacts(userId, contactsList, source = 'csv') {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO contacts (user_id, name, phone, ddd, source) VALUES (?, ?, ?, ?, ?)`
  );
  let imported = 0;
  let skipped = 0;
  for (const c of contactsList) {
    const phone = String(c.phone || c).replace(/\D/g, '');
    if (phone.length < 10) { skipped++; continue; }
    const ddd = phone.length >= 12 ? phone.substring(2, 4) : (phone.length >= 10 ? phone.substring(0, 2) : '');
    const name = c.name || '';
    try {
      await new Promise((resolve, reject) => {
        stmt.run([userId, name, phone, ddd, source], function(err) {
          if (err) { skipped++; resolve(); }
          else if (this.changes > 0) { imported++; resolve(); }
          else { skipped++; resolve(); }
        });
      });
    } catch(e) { skipped++; }
  }
  stmt.finalize();
  return { imported, skipped };
}

// Listar contatos com filtros e paginação
async function getContacts(userId, { search = '', ddd = '', source = '', page = 1, limit = 50 } = {}) {
  return new Promise((resolve, reject) => {
    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (search) {
      where += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push('%' + search + '%', '%' + search + '%');
    }
    if (ddd) {
      where += ' AND ddd = ?';
      params.push(ddd);
    }
    if (source) {
      where += ' AND source = ?';
      params.push(source);
    }

    // Total count
    db.get(`SELECT COUNT(*) as total FROM contacts ${where}`, params, (err, countRow) => {
      if (err) return reject(err);
      const total = countRow.total;
      const offset = (page - 1) * limit;
      const queryParams = [...params, limit, offset];

      db.all(
        `SELECT * FROM contacts ${where} ORDER BY name ASC, phone ASC LIMIT ? OFFSET ?`,
        queryParams,
        (err, rows) => {
          if (err) return reject(err);
          resolve({ contacts: rows || [], total, page, limit, pages: Math.ceil(total / limit) });
        }
      );
    });
  });
}

// Obter DDDs distintos de um usuário
async function getContactDDDs(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT DISTINCT ddd FROM contacts WHERE user_id = ? AND ddd != "" ORDER BY ddd',
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []).map(r => r.ddd));
      }
    );
  });
}

// Obter fontes distintas de um usuário
async function getContactSources(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT DISTINCT source FROM contacts WHERE user_id = ? ORDER BY source',
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []).map(r => r.source));
      }
    );
  });
}

// Deletar contato
async function deleteContact(contactId, userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM contacts WHERE id = ? AND user_id = ?', [contactId, userId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

// Deletar TODOS os contatos do usuário
async function deleteAllContacts(userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM contacts WHERE user_id = ?', [userId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

// Obter contatos por IDs
async function getContactsByIds(userId, ids) {
  return new Promise((resolve, reject) => {
    if (!ids.length) return resolve([]);
    const placeholders = ids.map(() => '?').join(',');
    db.all(
      `SELECT * FROM contacts WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...ids],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// Obter contatos filtrados (para selecionar por DDD)
async function getContactsByDDD(userId, ddd) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM contacts WHERE user_id = ? AND ddd = ?',
      [userId, ddd],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// Obter TODOS os IDs de contatos (com filtros opcionais)
async function getAllContactIds(userId, { search = '', ddd = '', source = '' } = {}) {
  return new Promise((resolve, reject) => {
    let where = 'WHERE user_id = ?';
    const params = [userId];
    if (search) {
      where += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push('%' + search + '%', '%' + search + '%');
    }
    if (ddd) { where += ' AND ddd = ?'; params.push(ddd); }
    if (source) { where += ' AND source = ?'; params.push(source); }

    db.all(`SELECT id FROM contacts ${where}`, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []).map(r => r.id));
    });
  });
}

// ============================================
// FUNÇÕES DE SUBLISTAS
// ============================================

async function createSublist(userId, name, contactIds = []) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO sublists (user_id, name) VALUES (?, ?)',
      [userId, name],
      function(err) {
        if (err) return reject(err);
        const sublistId = this.lastID;
        if (!contactIds.length) return resolve({ id: sublistId, name, memberCount: 0 });

        const stmt = db.prepare('INSERT OR IGNORE INTO sublist_members (sublist_id, contact_id) VALUES (?, ?)');
        let added = 0;
        let remaining = contactIds.length;
        for (const cid of contactIds) {
          stmt.run([sublistId, cid], function(e) {
            if (!e && this.changes > 0) added++;
            remaining--;
            if (remaining === 0) {
              stmt.finalize();
              resolve({ id: sublistId, name, memberCount: added });
            }
          });
        }
      }
    );
  });
}

async function getSublists(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT s.*, COUNT(sm.id) as member_count
       FROM sublists s
       LEFT JOIN sublist_members sm ON s.id = sm.sublist_id
       WHERE s.user_id = ?
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

async function deleteSublist(sublistId, userId) {
  return new Promise((resolve, reject) => {
    // Delete members first, then sublist
    db.run('DELETE FROM sublist_members WHERE sublist_id = ?', [sublistId], (err) => {
      if (err) return reject(err);
      db.run('DELETE FROM sublists WHERE id = ? AND user_id = ?', [sublistId, userId], function(err2) {
        if (err2) reject(err2);
        else resolve(this.changes);
      });
    });
  });
}

async function getSublistContacts(sublistId, userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT c.* FROM contacts c
       JOIN sublist_members sm ON c.id = sm.contact_id
       JOIN sublists s ON sm.sublist_id = s.id
       WHERE sm.sublist_id = ? AND s.user_id = ?
       ORDER BY c.name ASC, c.phone ASC`,
      [sublistId, userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  db,
  run,
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
  upgradeToPremium,
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
  // Bot functions
  getBotConfig,
  saveBotConfig,
  getBotRules,
  addBotRule,
  deleteBotRule,
  // Contacts functions
  importContacts,
  getContacts,
  getContactDDDs,
  getContactSources,
  deleteContact,
  deleteAllContacts,
  getContactsByIds,
  getContactsByDDD,
  getAllContactIds,
  // Sublists functions
  createSublist,
  getSublists,
  deleteSublist,
  getSublistContacts
};