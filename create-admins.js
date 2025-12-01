const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'server/whatsapp.db'));

const admins = [
  {
    email: 'admin1@whatsapp-sender.com',
    password: 'Admin@123',
    name: 'Administrador 1',
    plan: 'PRO'
  },
  {
    email: 'admin2@whatsapp-sender.com', 
    password: 'Admin@456',
    name: 'Administrador 2',
    plan: 'PRO'
  }
];

console.log('\n👥 CRIANDO USUÁRIOS ADMIN');
console.log('═'.repeat(50));

const expiresAt = new Date();
expiresAt.setFullYear(expiresAt.getFullYear() + 10); // 10 anos

let created = 0;
let updated = 0;

admins.forEach((admin, index) => {
  const hashedPassword = bcrypt.hashSync(admin.password, 10);
  
  // Verificar se existe
  db.get('SELECT id FROM users WHERE email = ?', [admin.email], (err, row) => {
    if (row) {
      // Atualizar
      db.run(
        'UPDATE users SET password = ?, plan = ?, plan_expires_at = ? WHERE email = ?',
        [hashedPassword, admin.plan, expiresAt.toISOString(), admin.email],
        (err) => {
          if (!err) {
            console.log(`✅ Admin ${index + 1} atualizado: ${admin.email}`);
            updated++;
          }
          checkComplete();
        }
      );
    } else {
      // Criar
      db.run(
        'INSERT INTO users (email, password, name, plan, plan_expires_at) VALUES (?, ?, ?, ?, ?)',
        [admin.email, hashedPassword, admin.name, admin.plan, expiresAt.toISOString()],
        (err) => {
          if (!err) {
            console.log(`✅ Admin ${index + 1} criado: ${admin.email}`);
            created++;
          }
          checkComplete();
        }
      );
    }
  });
});

function checkComplete() {
  if (created + updated === admins.length) {
    console.log('\n' + '═'.repeat(50));
    console.log('📋 CREDENCIAIS DOS ADMINS:');
    console.log('═'.repeat(50));
    admins.forEach((admin, i) => {
      console.log(`\n${i + 1}. ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Senha: ${admin.password}`);
      console.log(`   Plano: ${admin.plan} (válido até ${expiresAt.toLocaleDateString('pt-BR')})`);
    });
    console.log('\n' + '═'.repeat(50));
    console.log(`\n✅ Total: ${created} criados, ${updated} atualizados\n`);
    
    db.close();
    process.exit(0);
  }
}
