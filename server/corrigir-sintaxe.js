const fs = require('fs');

console.log('🔧 CORRIGINDO ERROS DE SINTAXE...\n');

let content = fs.readFileSync('whatsapp-manager.js', 'utf8');

// Correção 1: console.log` para console.log(
content = content.replace(
  /console\.log`\[MULTI-SESSION\] Ignorando erro markedUnread - mensagem enviada`\)/g,
  'console.log(`[MULTI-SESSION] Ignorando erro markedUnread - mensagem enviada`)'
);

// Correção 2: console.log` para console.log(
content = content.replace(
  /console\.log`\[MULTI-SESSION\] User \$\{userId\} enviou texto para \$\{number\}`\)/g,
  'console.log(`[MULTI-SESSION] User ${userId} enviou texto para ${number}`)'
);

// Correção 3: Outros console.log` que podem existir
content = content.replace(
  /console\.log`\[MULTI-SESSION\] User \$\{userId\} enviando mídia \(\$\{fileSizeMB\}MB\) para \$\{number\}`\)/g,
  'console.log(`[MULTI-SESSION] User ${userId} enviando mídia (${fileSizeMB}MB) para ${number}`)'
);

fs.writeFileSync('whatsapp-manager.js', content, 'utf8');

console.log('✅ Erros de sintaxe corrigidos!');
console.log('');
console.log('Correções aplicadas:');
console.log('  1. console.log` → console.log(');
console.log('  2. Removido parêntese extra');
console.log('');
