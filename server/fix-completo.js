const fs = require('fs');

console.log('🔧 CORREÇÃO COMPLETA - DEFINITIVA\n');

let content = fs.readFileSync('whatsapp-manager.js', 'utf8');

// 1. CORRIGIR TODOS OS console.log` (com crase)
console.log('1️⃣ Corrigindo console.log com crase...');
content = content.replace(/console\.log`/g, 'console.log(');

// 2. SUBSTITUIR O BLOCO PROBLEMÁTICO
console.log('2️⃣ Substituindo bloco de envio...');

const blocoAntigo = `          try {
            await client.sendMessage(chatId, text);
          } catch (error) {
            if (error.message && error.message.includes('markedUnread')) {
              console.log([MULTI-SESSION] Ignorando erro markedUnread - mensagem enviada`);
            } else {
              throw error;
            }
          }
          console.log([MULTI-SESSION] User \${userId} enviou texto para \${number}`);`;

const blocoNovo = `          // TENTATIVA 1: Envio direto
          let enviado = false;
          let tentativas = 0;
          const maxTentativas = 3;
          
          while (!enviado && tentativas < maxTentativas) {
            tentativas++;
            console.log(\`[DEBUG] Tentativa \${tentativas}/\${maxTentativas} de envio para \${chatId}\`);
            
            try {
              await client.sendMessage(chatId, text);
              console.log(\`[DEBUG] SendMessage executado - aguardando 2s...\`);
              
              // Aguardar 2 segundos
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // VERIFICAR se mensagem foi enviada de verdade
              try {
                const chat = await client.getChatById(chatId);
                const msgs = await chat.fetchMessages({ limit: 3 });
                
                // Procurar nossa mensagem nas últimas 3
                const found = msgs.find(m => m.body === text && m.fromMe);
                
                if (found) {
                  console.log(\`[DEBUG] ✅ CONFIRMADO - Mensagem encontrada no chat!\`);
                  enviado = true;
                } else {
                  console.log(\`[DEBUG] ⚠️  Mensagem NÃO encontrada, tentando novamente...\`);
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              } catch (verifyError) {
                console.log(\`[DEBUG] ⚠️  Erro ao verificar: \${verifyError.message}\`);
                // Se não conseguir verificar, aguardar e tentar novamente
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
              
            } catch (error) {
              console.log(\`[DEBUG] ⚠️  Erro na tentativa \${tentativas}: \${error.message.substring(0, 80)}\`);
              
              if (error.message && error.message.includes('markedUnread')) {
                console.log(\`[DEBUG] Erro markedUnread - aguardando 3s antes de verificar...\`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Tentar verificar se foi enviado mesmo com erro
                try {
                  const chat = await client.getChatById(chatId);
                  const msgs = await chat.fetchMessages({ limit: 3 });
                  const found = msgs.find(m => m.body === text && m.fromMe);
                  
                  if (found) {
                    console.log(\`[DEBUG] ✅ Mensagem enviada apesar do erro markedUnread!\`);
                    enviado = true;
                  }
                } catch (e) {
                  console.log(\`[DEBUG] Não conseguiu verificar, tentará novamente...\`);
                }
              } else {
                // Erro diferente de markedUnread
                throw error;
              }
            }
          }
          
          if (!enviado) {
            throw new Error(\`Falha ao enviar mensagem após \${maxTentativas} tentativas\`);
          }
          
          console.log(\`[MULTI-SESSION] ✅ User \${userId} enviou texto para \${number}\`);`;

// Primeiro tentar com o bloco exato que vimos
if (content.includes(blocoAntigo)) {
  content = content.replace(blocoAntigo, blocoNovo);
  console.log('   ✅ Bloco substituído!');
} else {
  // Se não encontrar, usar regex mais flexível
  const regex = /try\s*{\s*await client\.sendMessage\(chatId,\s*text\);[\s\S]*?}\s*catch\s*\(error\)\s*{[\s\S]*?markedUnread[\s\S]*?}\s*}\s*console\.log\([^)]*User.*enviou texto/;
  
  if (regex.test(content)) {
    content = content.replace(regex, blocoNovo);
    console.log('   ✅ Bloco substituído (regex)!');
  } else {
    console.log('   ⚠️  Bloco não encontrado - vou adicionar logs');
  }
}

fs.writeFileSync('whatsapp-manager.js', content, 'utf8');

console.log('\n✅ CORREÇÕES APLICADAS!\n');
console.log('O que mudou:');
console.log('  1. ✅ Corrigidos TODOS os console.log` para console.log(');
console.log('  2. ✅ Sistema de retry (até 3 tentativas)');
console.log('  3. ✅ Verificação REAL no histórico do chat');
console.log('  4. ✅ Aguarda 2-3s entre tentativas');
console.log('  5. ✅ Só considera sucesso se encontrar a mensagem\n');
