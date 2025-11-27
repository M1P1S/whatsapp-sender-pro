#!/usr/bin/env node

// [SINGLE-SESSION:DB] Script de migração - Adicionar sistema de sessão única

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../server/whatsapp.db');

console.log('\n🔒 MIGRAÇÃO: SISTEMA DE SESSÃO ÚNICA');
console.log('═'.repeat(50));

// Verificar se banco existe
if (!fs.existsSync(dbPath)) {
  console.error('\n❌ Banco de dados não encontrado:', dbPath);
  console.error('   Execute o servidor primeiro para criar o banco.\n');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

console.log('\n📊 Criando tabela de sessões ativas...\n');

db.serialize(() => {
  // Criar tabela de sessões
  db.run(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      device_info TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela active_sessions:', err.message);
    } else {
      console.log('✅ Tabela active_sessions criada');
    }
  });
  
  // Criar índices
  const indexes = [
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON active_sessions(user_id)',
      desc: 'Índice por user_id'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_token ON active_sessions(session_token)',
      desc: 'Índice por session_token'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_active ON active_sessions(is_active)',
      desc: 'Índice por is_active'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON active_sessions(last_activity)',
      desc: 'Índice por last_activity'
    }
  ];
  
  let indexCount = 0;
  
  indexes.forEach(index => {
    db.run(index.sql, (err) => {
      if (err) {
        if (err.message.includes('already exists')) {
          console.log(`⏭️  ${index.desc} (já existe)`);
        } else {
          console.error(`❌ ${index.desc}: ${err.message}`);
        }
      } else {
        console.log(`✅ ${index.desc}`);
        indexCount++;
      }
    });
  });
  
  // Verificar estrutura
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='active_sessions'", (err, row) => {
    if (err) {
      console.error('\n❌ Erro ao verificar tabela:', err.message);
    } else if (row) {
      console.log('\n📊 Estrutura da tabela active_sessions:');
      
      db.all("PRAGMA table_info(active_sessions)", (err, columns) => {
        if (err) {
          console.error('❌ Erro ao listar colunas:', err.message);
        } else {
          console.log('\nColunas:');
          columns.forEach(col => {
            console.log(`   • ${col.name} (${col.type})`);
          });
          
          // Contar sessões
          db.get("SELECT COUNT(*) as count FROM active_sessions", (err, result) => {
            if (err) {
              console.error('\n❌ Erro ao contar sessões:', err.message);
            } else {
              console.log(`\n📊 Sessões existentes: ${result.count}`);
            }
            
            console.log('\n' + '═'.repeat(50));
            console.log('\n✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
            console.log('\n📝 PRÓXIMOS PASSOS:');
            console.log('   1. Adicionar funções no database.js');
            console.log('   2. Modificar middleware no index.js');
            console.log('   3. Modificar rota de login');
            console.log('   4. Adicionar session-checker.js nos HTMLs');
            console.log('   5. Testar login simultâneo');
            console.log('\n' + '═'.repeat(50) + '\n');
            
            db.close();
          });
        }
      });
    } else {
      console.error('\n❌ Tabela active_sessions não foi criada');
      db.close();
    }
  });
});