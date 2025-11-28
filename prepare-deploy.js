#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

console.log('\n' + '='.repeat(70));
console.log('🚀 PREPARAÇÃO PARA DEPLOY EM PRODUÇÃO');
console.log('='.repeat(70) + '\n');

async function main() {
  console.log('📋 Vou fazer algumas perguntas para configurar corretamente:\n');

  // 1. Domínio
  const domain = await question('1️⃣  Qual o domínio do seu servidor? (ex: seusite.com.br): ');
  const protocol = domain.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${domain}`;

  // 2. Porta
  const port = await question('2️⃣  Qual porta vai usar? (padrão: 3000): ') || '3000';

  // 3. Asaas
  console.log('\n📍 IMPORTANTE: ASAAS ESTÁ EM SANDBOX (TESTE)!');
  console.log('   Para receber pagamentos reais, você precisa:');
  console.log('   1. Acessar: https://www.asaas.com/configuracoes/api');
  console.log('   2. Copiar a chave de PRODUÇÃO');
  console.log('   3. Validar sua conta (enviar documentos)');
  
  const useProduction = await question('\n   Já tem a chave de PRODUÇÃO? (s/n): ');
  
  let asaasKey = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZtNGZhZGY6OmQ0NTY5MWNmLWI5M2YtNGRhNC1iY2E5LTRkNjIyZWE1ZWMwYTo6JGFhY2hfNThlODY5YWYtNmZlNS00ZjZkLWE4YTgtZTZmMTAyZGI5YTdk';
  let asaasEnv = 'sandbox';

  if (useProduction.toLowerCase() === 's') {
    asaasKey = await question('   Cole a chave de PRODUÇÃO aqui: ');
    asaasEnv = 'production';
    console.log('   ✅ Configurado para PRODUÇÃO - pagamentos serão processados!');
  } else {
    console.log('   ⚠️  ATENÇÃO: Continuará em SANDBOX (teste)');
    console.log('      Configure a chave de produção antes de divulgar!');
  }

  // 4. JWT Secret (gerar novo para produção)
  const crypto = require('crypto');
  const jwtSecret = crypto.randomBytes(64).toString('hex');

  // Criar arquivo .env de produção
  const envContent = `# ====================================
# SERVIDOR
# ====================================
PORT=${port}
NODE_ENV=production

# URL base do seu domínio
BASE_URL=${baseUrl}

# ====================================
# SEGURANÇA - JWT
# ====================================
JWT_SECRET=${jwtSecret}

# ====================================
# ASAAS - SISTEMA DE PAGAMENTO
# ====================================
ASAAS_API_KEY=${asaasKey}
ASAAS_ENVIRONMENT=${asaasEnv}

# ====================================
# BANCO DE DADOS
# ====================================
DB_PATH=./server/whatsapp.db

# ====================================
# CORS - Domínios Permitidos
# ====================================
ALLOWED_ORIGINS=${baseUrl}

# ====================================
# RATE LIMITING
# ====================================
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
`;

  // Salvar
  fs.writeFileSync('.env.production', envContent);
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ ARQUIVO .env.production CRIADO COM SUCESSO!');
  console.log('='.repeat(70));
  
  console.log('\n📦 CONFIGURAÇÕES SALVAS:');
  console.log(`   🌐 Domínio: ${baseUrl}`);
  console.log(`   🔌 Porta: ${port}`);
  console.log(`   💳 Asaas: ${asaasEnv === 'production' ? '✅ PRODUÇÃO' : '⚠️  SANDBOX (teste)'}`);
  console.log(`   🔐 JWT: Novo token gerado`);

  console.log('\n📋 PRÓXIMOS PASSOS NO SERVIDOR:');
  console.log('\n1️⃣  INSTALAR DEPENDÊNCIAS DO CHROME:');
  console.log('   sudo apt-get update');
  console.log('   sudo apt-get install -y \\');
  console.log('     chromium-browser \\');
  console.log('     libgbm1 \\');
  console.log('     libnss3 \\');
  console.log('     libxss1 \\');
  console.log('     libasound2 \\');
  console.log('     fonts-liberation');

  console.log('\n2️⃣  COPIAR ARQUIVO .env:');
  console.log('   cp .env.production .env');

  console.log('\n3️⃣  INSTALAR NODE MODULES:');
  console.log('   npm install --production');

  console.log('\n4️⃣  CRIAR USUÁRIO ADMIN:');
  console.log('   node create-admin.js');

  console.log('\n5️⃣  INICIAR COM PM2:');
  console.log('   npm install -g pm2');
  console.log('   pm2 start server/index.js --name "whatsapp-sender"');
  console.log('   pm2 startup');
  console.log('   pm2 save');

  console.log('\n6️⃣  CONFIGURAR NGINX (reverso proxy):');
  console.log(`   server {
     listen 80;
     server_name ${domain};
     
     location / {
       proxy_pass http://localhost:${port};
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }`);

  if (asaasEnv === 'sandbox') {
    console.log('\n⚠️  LEMBRETE IMPORTANTE:');
    console.log('   🔴 ASAAS está em modo TESTE!');
    console.log('   🔴 Clientes NÃO conseguirão pagar de verdade!');
    console.log('   🔴 Configure a chave de PRODUÇÃO antes de divulgar!');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✨ Preparação concluída! Boa sorte com o deploy!');
  console.log('='.repeat(70) + '\n');

  rl.close();
}

main().catch(err => {
  console.error('❌ Erro:', err);
  rl.close();
  process.exit(1);
});