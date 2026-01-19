const fs = require('fs');

console.log('🔧 APLICANDO SOLUÇÃO ROBUSTA...\n');

let content = fs.readFileSync('whatsapp-manager.js', 'utf8');

// Encontrar o bloco atual
const oldBlock = `      try {
        await client.sendMessage(chatId, text);
      } catch (error) {
        if (error.message && error.message.includes('markedUnread')) {
          console.log(\`[MULTI-SESSION] Ignorando erro markedUnread - mensagem enviada\`);
        } else {
          throw error;
        }
      }`;

const newBlock = `      let messageResult = null;
      let errorOccurred = false;
      
      try {
        console.log(\`[DEBUG] 🚀 Iniciando envio para \${chatId}...\`);
        messageResult = await client.sendMessage(chatId, text);
        console.log(\`[DEBUG] ✅ SendMessage retornou:\`, messageResult ? 'COM RESULTADO' : 'SEM RESULTADO');
      } catch (error) {
        errorOccurred = true;
        console.log(\`[DEBUG] ⚠️  Erro capturado:\`, error.message.substring(0, 100));
        
        if (error.message && error.message.includes('markedUnread')) {
          console.log(\`[MULTI-SESSION] ⚠️  Erro markedUnread detectado\`);
          
          // Aguardar 3 segundos e verificar se a mensagem foi enviada
          console.log(\`[DEBUG] ⏳ Aguardando 3s para verificar envio...\`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Tentar verificar o histórico do chat
          try {
            const chat = await client.getChatById(chatId);
            const messages = await chat.fetchMessages({ limit: 5 });
            
            // Verificar se a última mensagem é nossa
            const lastMsg = messages[0];
            if (lastMsg && lastMsg.body === text && lastMsg.fromMe) {
              console.log(\`[DEBUG] ✅ CONFIRMADO - Mensagem encontrada no chat!\`);
              console.log(\`[MULTI-SESSION] ✅ Mensagem enviada com sucesso (confirmado no histórico)\`);
              messageResult = lastMsg;
            } else {
              console.log(\`[DEBUG] ❌ Mensagem NÃO encontrada no histórico\`);
              throw new Error('Mensagem não foi enviada - não encontrada no histórico');
            }
          } catch (verifyError) {
            console.log(\`[DEBUG] ❌ Erro ao verificar histórico:\`, verifyError.message);
            throw new Error('Não foi possível confirmar envio da mensagem');
          }
        } else {
          console.log(\`[DEBUG] ❌ Erro diferente de markedUnread - propagando\`);
          throw error;
        }
      }
      
      if (!errorOccurred) {
        console.log(\`[DEBUG] ✅ Envio completado sem erros!\`);
      }`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync('whatsapp-manager.js', content, 'utf8');
  console.log('✅ Solução robusta aplicada!\n');
  console.log('O que mudou:');
  console.log('  1. Captura o resultado do sendMessage');
  console.log('  2. Se der erro markedUnread, aguarda 3s');
  console.log('  3. Busca no histórico do chat para CONFIRMAR envio');
  console.log('  4. Só considera sucesso se encontrar a mensagem\n');
} else {
  console.log('⚠️  Bloco não encontrado\n');
}
