#!/bin/bash
# ============================================
# CORRIGIR TODOS OS BUGS
# ============================================

set -e
cd /root/whatsapp-sender-pro

echo "🔧 CORRIGINDO BUGS DO SISTEMA"
echo "=============================="
echo ""

# ============================================
# BUG 1: API_URL DUPLICADO
# ============================================
echo "1️⃣ Corrigindo API_URL duplicado..."

# Remover a linha 3 (const API_URL = '';)
sed -i '3d' public/app-auth.js

# Verificar
echo "   Verificando app-auth.js:"
grep -n "const API_URL" public/app-auth.js | head -5

echo "✅ API_URL corrigido"
echo ""

# ============================================
# BUG 2: SESSION-CHECKER.JS (404)
# ============================================
echo "2️⃣ Verificando session-checker.js..."

# Criar diretório js se não existir
mkdir -p public/js

# Mover session-checker.js para public/js/
if [ -f "public/session-checker.js" ]; then
  cp public/session-checker.js public/js/session-checker.js
  echo "✅ session-checker.js copiado para public/js/"
else
  echo "⚠️  session-checker.js não encontrado"
fi

echo ""

# ============================================
# BUG 3: ASAAS PRODUÇÃO
# ============================================
echo "3️⃣ Configurando Asaas para PRODUÇÃO..."

# Verificar se .env existe
if [ ! -f ".env" ]; then
  echo "⚠️  Arquivo .env não existe, criando..."
  cp .env.example .env
fi

# Atualizar .env para produção
sed -i 's/ASAAS_ENVIRONMENT=sandbox/ASAAS_ENVIRONMENT=production/' .env
sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env

echo "✅ Asaas configurado para PRODUÇÃO"
echo ""
echo "⚠️  IMPORTANTE: Você precisa:"
echo "   1. Obter chave de PRODUÇÃO do Asaas"
echo "   2. Atualizar ASAAS_API_KEY no .env"
echo "   3. Configurar webhook no painel Asaas"
echo ""

# ============================================
# BUG 4: CRIAR USUÁRIOS ADMIN
# ============================================
echo "4️⃣ Criando usuários admin..."

cat > create-admins.js << 'EOFADMIN'
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
EOFADMIN

node create-admins.js

echo ""

# ============================================
# BUG 5: CORRIGIR QR CODE
# ============================================
echo "5️⃣ Verificando geração de QR Code..."

# Verificar se whatsapp-simple.js está correto
if grep -q "qrcode.toDataURL" server/whatsapp-simple.js; then
  echo "✅ Função de QR Code OK"
else
  echo "⚠️  Função de QR Code pode estar com problema"
fi

echo ""

# ============================================
# REINICIAR SISTEMA
# ============================================
echo "6️⃣ Reiniciando sistema..."

pm2 restart whatsapp-sender --update-env

sleep 5

echo "✅ Sistema reiniciado"
echo ""

# ============================================
# VERIFICAR STATUS
# ============================================
echo "7️⃣ Verificando status..."
echo ""

pm2 status
echo ""

pm2 logs whatsapp-sender --lines 15 --nostream

echo ""
echo "═════════════════════════════════════"
echo "✅ CORREÇÕES APLICADAS!"
echo "═════════════════════════════════════"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo ""
echo "1. Configurar Asaas PRODUÇÃO:"
echo "   - Obter chave: https://www.asaas.com/configuracoes/api"
echo "   - Editar: nano .env"
echo "   - Atualizar: ASAAS_API_KEY=sua_chave_real"
echo "   - Reiniciar: pm2 restart whatsapp-sender --update-env"
echo ""
echo "2. Configurar Webhook no Asaas:"
echo "   URL: https://whatsapp-sender.duckdns.org/api/payment/webhook"
echo ""
echo "3. Testar QR Code:"
echo "   - Acesse: https://whatsapp-sender.duckdns.org"
echo "   - Faça login com admin criado"
echo "   - Verifique se QR Code aparece"
echo ""
echo "4. Credenciais Admin (veja acima ↑)"
echo ""
echo "═════════════════════════════════════"

