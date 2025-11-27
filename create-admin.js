const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Conectar ao banco de dados
const db = new sqlite3.Database(path.join(__dirname, 'server', 'whatsapp.db'), (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
    process.exit(1);
  }
  console.log('✅ Conectado ao banco de dados');
});

const adminData = {
  email: 'teste01@teste.com',  // ← Mude aqui
  password: 'Bernardo123',       // ← Mude aqui
  name: 'Usuário Teste',     // ← Mude aqui
  plan: 'PRO'
};

// Calcular data de expiração (1 ano no futuro)
const expiresAt = new Date();
expiresAt.setFullYear(expiresAt.getFullYear() + 1);

// Criar hash da senha
const hashedPassword = bcrypt.hashSync(adminData.password, 10);

// Verificar se admin já existe
db.get('SELECT id FROM users WHERE email = ?', [adminData.email], (err, row) => {
  if (err) {
    console.error('❌ Erro ao verificar admin:', err);
    db.close();
    process.exit(1);
  }

  if (row) {
    // Admin já existe, atualizar para PRO
    console.log('⚠️  Admin já existe, atualizando para PRO...');
    
    db.run(
      'UPDATE users SET plan = ?, plan_expires_at = ? WHERE email = ?',
      ['PRO', expiresAt.toISOString(), adminData.email],
      (err) => {
        if (err) {
          console.error('❌ Erro ao atualizar admin:', err);
        } else {
          console.log('✅ Admin atualizado com sucesso!');
          console.log('\n' + '='.repeat(60));
          console.log('📋 CREDENCIAIS DE ACESSO:');
          console.log('='.repeat(60));
          console.log(`Email: ${adminData.email}`);
          console.log(`Senha: ${adminData.password}`);
          console.log(`Plano: PRO`);
          console.log(`Expira em: ${expiresAt.toLocaleDateString('pt-BR')}`);
          console.log('='.repeat(60));
        }
        db.close();
      }
    );
  } else {
    // Criar novo admin
    console.log('📝 Criando usuário administrador...');
    
    db.run(
      'INSERT INTO users (email, password, name, plan, plan_expires_at) VALUES (?, ?, ?, ?, ?)',
      [adminData.email, hashedPassword, adminData.name, 'PRO', expiresAt.toISOString()],
      function(err) {
        if (err) {
          console.error('❌ Erro ao criar admin:', err);
          db.close();
          process.exit(1);
        }

        console.log('✅ Usuário administrador criado com sucesso!');
        console.log('\n' + '='.repeat(60));
        console.log('📋 CREDENCIAIS DE ACESSO:');
        console.log('='.repeat(60));
        console.log(`Email: ${adminData.email}`);
        console.log(`Senha: ${adminData.password}`);
        console.log(`Plano: PRO (ILIMITADO)`);
        console.log(`Expira em: ${expiresAt.toLocaleDateString('pt-BR')}`);
        console.log(`ID: ${this.lastID}`);
        console.log('='.repeat(60));
        console.log('\n💡 Use essas credenciais para fazer login em:');
        console.log('   http://localhost:3000/auth.html');
        console.log('\n');

        db.close();
      }
    );
  }
});