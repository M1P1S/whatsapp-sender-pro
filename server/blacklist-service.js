const db = require('./database');

// Adicionar número à blacklist
async function addToBlacklist(userId, phone, reason) {
  try {
    await db.run(`
      INSERT INTO blacklist (user_id, phone, reason)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, phone) 
      DO UPDATE SET 
        fail_count = fail_count + 1,
        reason = ?
    `, [userId, phone, reason, reason]);
    
    console.log(`📛 Número ${phone} adicionado à blacklist (usuário ${userId})`);
  } catch (error) {
    console.error('Erro ao adicionar à blacklist:', error);
  }
}

// Verificar se número está na blacklist
async function isBlacklisted(userId, phone) {
  try {
    const result = await db.get(`
      SELECT * FROM blacklist 
      WHERE user_id = ? AND phone = ?
    `, [userId, phone]);
    return !!result;
  } catch (error) {
    console.error('Erro ao verificar blacklist:', error);
    return false;
  }
}

// Filtrar contatos removendo blacklisted
async function filterBlacklistedContacts(userId, contacts) {
  const filtered = [];
  for (const contact of contacts) {
    const blacklisted = await isBlacklisted(userId, contact);
    if (!blacklisted) {
      filtered.push(contact);
    }
  }
  
  const removed = contacts.length - filtered.length;
  if (removed > 0) {
    console.log(`🚫 ${removed} contatos removidos da blacklist`);
  }
  
  return filtered;
}

// Listar blacklist do usuário
async function getBlacklist(userId) {
  try {
    const results = await db.all(`
      SELECT * FROM blacklist 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);
    return results;
  } catch (error) {
    console.error('Erro ao listar blacklist:', error);
    return [];
  }
}

// Remover número da blacklist
async function removeFromBlacklist(userId, phone) {
  try {
    await db.run(`
      DELETE FROM blacklist 
      WHERE user_id = ? AND phone = ?
    `, [userId, phone]);
    console.log(`✅ Número ${phone} removido da blacklist`);
  } catch (error) {
    console.error('Erro ao remover da blacklist:', error);
  }
}

module.exports = {
  addToBlacklist,
  isBlacklisted,
  filterBlacklistedContacts,
  getBlacklist,
  removeFromBlacklist
};
