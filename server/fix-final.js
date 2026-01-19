const fs = require('fs');

console.log('🔧 CORREÇÃO FINAL - TENTATIVA CORRETA\n');

let content = fs.readFileSync('whatsapp-manager.js', 'utf8');

// Primeiro: corrigir TODOS os console.log` para console.log(
console.log('1️⃣ Corrigindo console.log com crase...');

// Substituir console.log` por console.log(
content = content.split('console.log`').join('console.log(');

console.log('   ✅ Crases corrigidas!\n');

// Agora vamos encontrar e substituir o bloco do try-catch
console.log('2️⃣ Procurando e substituindo bloco de envio...\n');

// Procurar o padrão
const lines = content.split('\n');
let startLine = -1;
let endLine = -1;

// Encontrar onde começa o try
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('try {') && i > 380 && i < 400) {
    // Verificar se a próxima linha tem sendMessage
    if (lines[i + 1] && lines[i + 1].includes('await client.sendMessage(chatId, text)')) {
      startLine = i;
      
      // Encontrar o final (depois do console.log de sucesso)
      for (let j = i; j < i + 15; j++) {
        if (lines[j].includes('User') && lines[j].includes('enviou texto')) {
          endLine = j;
          break;
        }
      }
      break;
    }
  }
}

if (startLine === -1) {
  console.log('❌ Não encontrei o bloco try-catch!\n');
  console.log('Vou criar um patch manual...\n');
  process.exit(1);
}

console.log(`   📍 Encontrado nas linhas ${startLine + 1} a ${endLine + 1}\n`);

// Novo código com verificação real
const novoBloco = [
  '          // Sistema de envio com verificação real',
  '          let enviado = false;',
  '          let tentativas = 0;',
  '          ',
  '          while (!enviado && tentativas < 3) {',
  '            tentativas++;',
  '            console.log(`[DEBUG] 🚀 Tentativa ${tentativas}/3 para ${chatId}`);',
  '            ',
  '            try {',
  '              await client.sendMessage(chatId, text);',
  '              console.log(`[DEBUG] ⏳ Aguardando 2s...`);',
  '              await new Promise(resolve => setTimeout(resolve, 2000));',
  '              ',
  '              // Verificar se mensagem foi enviada',
  '              const chat = await client.getChatById(chatId);',
  '              const msgs = await chat.fetchMessages({ limit: 3 });',
  '              const found = msgs.find(m => m.body === text && m.fromMe);',
  '              ',
  '              if (found) {',
  '                console.log(`[DEBUG] ✅ CONFIRMADO - Mensagem no chat!`);',
  '                enviado = true;',
  '              } else {',
  '                console.log(`[DEBUG] ⚠️ Não encontrada, retry...`);',
  '              }',
  '              ',
  '            } catch (error) {',
  '              console.log(`[DEBUG] ⚠️ Erro: ${error.message.substring(0, 50)}`);',
  '              ',
  '              if (error.message && error.message.includes("markedUnread")) {',
  '                console.log(`[DEBUG] Erro markedUnread - verificando...`);',
  '                await new Promise(resolve => setTimeout(resolve, 3000));',
  '                ',
  '                try {',
  '                  const chat = await client.getChatById(chatId);',
  '                  const msgs = await chat.fetchMessages({ limit: 3 });',
  '                  const found = msgs.find(m => m.body === text && m.fromMe);',
  '                  ',
  '                  if (found) {',
  '                    console.log(`[DEBUG] ✅ Enviada apesar do erro!`);',
  '                    enviado = true;',
  '                  }',
  '                } catch (e) {',
  '                  console.log(`[DEBUG] Não conseguiu verificar`);',
  '                }',
  '              } else {',
  '                throw error;',
  '              }',
  '            }',
  '          }',
  '          ',
  '          if (!enviado) {',
  '            throw new Error(`Falha após 3 tentativas`);',
  '          }',
  '          ',
  '          console.log(`[MULTI-SESSION] ✅ User ${userId} enviou texto para ${number}`)'
];

// Substituir as linhas
const newLines = [
  ...lines.slice(0, startLine),
  ...novoBloco,
  ...lines.slice(endLine + 1)
];

content = newLines.join('\n');

fs.writeFileSync('whatsapp-manager.js', content, 'utf8');

console.log('✅ SUBSTITUIÇÃO COMPLETA!\n');
console.log('Novo sistema:');
console.log('  • Até 3 tentativas');
console.log('  • Verifica mensagem no chat');
console.log('  • Aguarda entre tentativas');
console.log('  • Logs detalhados\n');
