#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🧹 LIMPEZA FINAL DO PROJETO');
console.log('═'.repeat(50));
console.log('\n📋 Removendo arquivos de backup desnecessários...\n');

const toDelete = [
  // Backup principal na raiz
  { path: 'backup_1764020665184', type: 'dir', desc: 'Backup antigo na raiz' },
  
  // Backup de HTML
  { path: 'dashboard.html.backup', type: 'file', desc: 'Backup do dashboard' },
  
  // Backups de index.js no server
  { path: 'server/index.js.backup', type: 'file', desc: 'Backup index.js' },
  { path: 'server/index.js.backup.1764416694692', type: 'file', desc: 'Backup index.js antigo' },
  { path: 'server/index.js.backup.1764020665466', type: 'file', desc: 'Backup index.js antigo' },
  
  // Backups de payment.js
  { path: 'server/payment.js.backup.1763578487756', type: 'file', desc: 'Backup payment.js' },
  { path: 'server/payment.js.backup.1763358541771', type: 'file', desc: 'Backup payment.js antigo' },
  
  // Backup de package.json
  { path: 'package.json.backup.1763416694703', type: 'file', desc: 'Backup package.json' },
  
  // Sessão WhatsApp antiga (será recriada)
  { path: 'wwwbap_auth', type: 'dir', desc: 'Sessão WhatsApp antiga' }
];

let deleted = 0;
let notFound = 0;
let errors = 0;
const deletedList = [];

toDelete.forEach(item => {
  const fullPath = path.join(process.cwd(), item.path);
  
  try {
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      
      if (item.type === 'dir' && stats.isDirectory()) {
        // Calcular tamanho da pasta antes de deletar
        const size = calculateDirSize(fullPath);
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ 📁 ${item.path}`);
        console.log(`   └─ ${item.desc} (${formatBytes(size)})`);
        deletedList.push({ path: item.path, size });
        deleted++;
      } else if (item.type === 'file' && stats.isFile()) {
        const size = stats.size;
        fs.unlinkSync(fullPath);
        console.log(`✅ 📄 ${item.path}`);
        console.log(`   └─ ${item.desc} (${formatBytes(size)})`);
        deletedList.push({ path: item.path, size });
        deleted++;
      }
    } else {
      console.log(`⏭️  ${item.path} (já removido)`);
      notFound++;
    }
  } catch (error) {
    console.error(`❌ ${item.path}`);
    console.error(`   └─ Erro: ${error.message}`);
    errors++;
  }
});

// Calcular espaço total liberado
const totalSize = deletedList.reduce((sum, item) => sum + item.size, 0);

console.log('\n' + '═'.repeat(50));
console.log('\n📊 RESUMO DA LIMPEZA:\n');
console.log(`   ✅ Deletados com sucesso: ${deleted} itens`);
console.log(`   ⏭️  Já removidos anteriormente: ${notFound} itens`);
console.log(`   ❌ Erros: ${errors} itens`);
console.log(`   💾 Espaço liberado: ${formatBytes(totalSize)}`);

if (deleted > 0) {
  console.log('\n✨ Limpeza concluída com sucesso!');
  console.log('💡 Espaço em disco liberado!');
} else if (notFound > 0 && errors === 0) {
  console.log('\n✅ Projeto já está limpo!');
} else {
  console.log('\n⚠️  Alguns arquivos não puderam ser deletados.');
}

console.log('\n📝 PRÓXIMOS PASSOS:');
console.log('   1. Otimizar banco: node scripts/optimize-database.js');
console.log('   2. Adicionar compression: npm install compression');
console.log('   3. Testar aplicação: npm run dev');

console.log('\n' + '═'.repeat(50) + '\n');

// Funções auxiliares
function calculateDirSize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        size += calculateDirSize(filePath);
      } else {
        size += stats.size;
      }
    });
  } catch (err) {
    // Ignorar erros de permissão
  }
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}