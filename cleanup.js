#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 LIMPEZA PROFISSIONAL DO PROJETO\n');
console.log('═'.repeat(50));

// Lista de arquivos/pastas para deletar
const toDelete = [
  // Backups na raiz
  { path: 'backup_1764020665184', type: 'dir' },
  { path: 'estado-pos-otimizacao-20251125_095051', type: 'dir' },
  
  // Backups de .env
  { path: '.env.backup.1763132105386', type: 'file' },
  { path: '.env.backup.1763578487750', type: 'file' },
  { path: '.env.backup.1764078870905', type: 'file' },
  
  // Backups de JS no server
  { path: 'server/index.js.backup.1763132105404', type: 'file' },
  { path: 'server/index.js.backup.1763416694802', type: 'file' },
  { path: 'server/index.js.backup.1763578487760', type: 'file' },
  { path: 'server/index.js.backup.1764078870905', type: 'file' },
  
  // Backup de package.json
  { path: 'package.json.backup.1763416640703', type: 'file' },
  
  // Sessões WhatsApp (serão recriadas automaticamente)
  { path: 'wwwbap_auth_session', type: 'dir' },
  { path: 'wwwbap_auth', type: 'dir' },
  
  // Crash logs do Chromium/Electron
  { path: 'Crashpad', type: 'dir' },
  
  // Scripts temporários (já aplicados)
  { path: 'apply-improvements.js', type: 'file' },
  { path: 'fix-admin-login.js', type: 'file' },
  { path: 'fix-cpf-asaas.js', type: 'file' },
  { path: 'implementar-seguranca.js', type: 'file' },
  { path: 'install-asaas.js', type: 'file' },
  { path: 'migrate-auto.js', type: 'file' },
  { path: 'setup-security.js', type: 'file' },
  
  // Arquivos .bat (Windows)
  { path: 'restaurar-backup.bat', type: 'file' },
  
  // Arquivos de teste temporários
  { path: 'server/test-minimal.js', type: 'file' },
  { path: 'test-payment.js', type: 'file' },
  
  // Relatórios temporários
  { path: 'RELATORIO_SEGURANCA.md', type: 'file' }
];

let deleted = 0;
let notFound = 0;
let errors = 0;

console.log('\n🔍 Verificando arquivos para deletar...\n');

toDelete.forEach(item => {
  const fullPath = path.join(process.cwd(), item.path);
  
  try {
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      
      if (item.type === 'dir' && stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ 📁 Pasta deletada: ${item.path}`);
        deleted++;
      } else if (item.type === 'file' && stats.isFile()) {
        fs.unlinkSync(fullPath);
        console.log(`✅ 📄 Arquivo deletado: ${item.path}`);
        deleted++;
      } else {
        console.log(`⚠️  Tipo incorreto: ${item.path}`);
        notFound++;
      }
    } else {
      console.log(`⏭️  Não encontrado: ${item.path}`);
      notFound++;
    }
  } catch (error) {
    console.error(`❌ Erro ao deletar ${item.path}:`, error.message);
    errors++;
  }
});

console.log('\n' + '═'.repeat(50));
console.log('\n📊 RESUMO DA LIMPEZA:\n');
console.log(`   ✅ Deletados: ${deleted} itens`);
console.log(`   ⏭️  Já removidos/não encontrados: ${notFound} itens`);
console.log(`   ❌ Erros: ${errors} itens`);

if (deleted > 0) {
  console.log('\n✨ Limpeza concluída com sucesso!');
  console.log('💡 Espaço liberado no projeto');
} else {
  console.log('\n✅ Projeto já está limpo!');
}

console.log('\n📝 Próximos passos:');
console.log('   1. Criar pasta: mkdir scripts docs tests backups logs');
console.log('   2. Organizar arquivos conforme guia');
console.log('   3. Atualizar .gitignore');
console.log('   4. Testar: npm run dev');
console.log('\n' + '═'.repeat(50) + '\n');