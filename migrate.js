const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/whatsapp.db');
console.log('🔒 Criando tabela...');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS active_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (err) { console.error('❌', err); process.exit(1); }
    console.log('✅ Tabela OK');
    db.run('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON active_sessions(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON active_sessions(session_token)');
    db.run('CREATE INDEX IF NOT EXISTS idx_sessions_active ON active_sessions(is_active)');
    db.run('CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON active_sessions(last_activity)', () => {
      console.log('✅ Índices OK');
      db.close();
    });
  });
});
