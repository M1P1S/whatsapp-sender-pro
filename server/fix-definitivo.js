const fs = require('fs');

console.log('🔧 SOLUÇÃO DEFINITIVA - sendSeen: false\n');

let content = fs.readFileSync('whatsapp-manager.js', 'utf8');

// 1. Substituir TODO o bloco complexo por código simples
const pattern = /\/\/ Sistema de envio com verificação real[\s\S]*?console\.log\(`\[MULTI-SESSION\] ✅ User[\s\S]*?\);/;

const replacement = `await client.sendMessage(chatId, text, { sendSeen: false });
          console.log(\`[MULTI-SESSION] ✅ User \${userId} enviou texto para \${number}\`);`;

content = content.replace(pattern, replacement);

// 2. Adicionar sendSeen: false para TODAS as mensagens com mídia
content = content.replace(
  /await client\.sendMessage\(chatId, media, \{ caption: text \|\| undefined \}\);/g,
  'await client.sendMessage(chatId, media, { sendSeen: false, caption: text || undefined });'
);

content = content.replace(
  /await client\.sendMessage\(chatId, media, \{ sendAudioAsVoice: true \}\);/g,
  'await client.sendMessage(chatId, media, { sendSeen: false, sendAudioAsVoice: true });'
);

content = content.replace(
  /await client\.sendMessage\(chatId, media, \{\s*caption: text \|\| undefined,\s*sendMediaAsDocument: true\s*\}\);/g,
  'await client.sendMessage(chatId, media, { sendSeen: false, caption: text || undefined, sendMediaAsDocument: true });'
);

fs.writeFileSync('whatsapp-manager.js', content);

console.log('✅ SOLUÇÃO APLICADA!\n');
console.log('Mudanças:');
console.log('  • Código simplificado (sem try-catch complexo)');
console.log('  • sendSeen: false em TODAS as mensagens');
console.log('  • Sistema NÃO vai mais tentar marcar como lida\n');
