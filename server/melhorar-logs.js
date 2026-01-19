const fs = require('fs');
const path = require('path');

console.log('🔍 MELHORANDO LOGS DE DEBUG...\n');

const filePath = path.join(__dirname, 'whatsapp-manager.js');
let content = fs.readFileSync(filePath, 'utf8');

// Encontrar o bloco do try-catch que acabamos de adicionar
const oldBlock = `      try {
        await client.sendMessage(chatId, text);
      } catch (error) {
        if (error.message && error.message.includes('markedUnread')) {
          console.log(\`[MULTI-SESSION] Ignorando erro markedUnread - mensagem enviada\`);
        } else {
          throw error;
        }
      }`;

const newBlock = `      console.log(\`[MULTI-SESSION] 🚀 ENVIANDO mensagem para \${chatId}...\`);
      
      try {
        const result = await client.sendMessage(chatId, text);
        console.log(\`[MULTI-SESSION] ✅ SUCESSO - Mensagem enviada para \${chatId}\`);
        console.log(\`[MULTI-SESSION] 📋 Resultado:\`, result ? 'OK' : 'SEM RETORNO');
      } catch (error) {
        console.log(\`[MULTI-SESSION] ⚠️  ERRO capturado:\`, error.message);
        
        if (error.message && error.message.includes('markedUnread')) {
          console.log(\`[MULTI-SESSION] ✅ Erro markedUnread ignorado - mensagem FOI enviada\`);
          // Mensagem foi enviada, erro ocorreu no sendSeen
        } else {
          console.log(\`[MULTI-SESSION] ❌ ERRO REAL - mensagem NÃO foi enviada:\`, error.message);
          throw error;
        }
      }`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Logs melhorados com sucesso!\n');
  console.log('📝 Agora teremos logs detalhados:\n');
  console.log('  🚀 Antes de enviar');
  console.log('  ✅ Depois de enviar com sucesso');
  console.log('  ⚠️  Quando erro for capturado');
  console.log('  📋 Resultado do envio\n');
} else {
  console.log('⚠️  Bloco não encontrado - pode já estar modificado\n');
}
