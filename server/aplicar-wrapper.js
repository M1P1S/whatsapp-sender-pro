#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎯 APLICANDO WRAPPER TRY-CATCH\n');

const filePath = path.join(__dirname, 'whatsapp-manager.js');
let content = fs.readFileSync(filePath, 'utf8');

// MODIFICAÇÃO 1: VÍDEOS
const v1 = `    // VÍDEOS - SEMPRE COMO DOCUMENTO
    if (mediaType === 'video' || ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.3gp'].includes(ext)) {
      await client.sendMessage(chatId, media, { caption: text || undefined });
      console.log(\`[MULTI-SESSION] User \${userId} enviou vídeo para \${number}\`);
    }`;

const v2 = `    // VÍDEOS - SEMPRE COMO DOCUMENTO
    if (mediaType === 'video' || ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.3gp'].includes(ext)) {
      try {
        await client.sendMessage(chatId, media, { caption: text || undefined });
      } catch (error) {
        if (error.message && error.message.includes('markedUnread')) {
          console.log(\`[MULTI-SESSION] Ignorando erro markedUnread - vídeo enviado\`);
        } else {
          throw error;
        }
      }
      console.log(\`[MULTI-SESSION] User \${userId} enviou vídeo para \${number}\`);
    }`;

if (content.includes(v1)) {
  content = content.replace(v1, v2);
  console.log('✅ 1/4 - VÍDEOS modificado');
} else {
  console.log('⚠️  1/4 - VÍDEOS já modificado');
}

// MODIFICAÇÃO 2: IMAGENS
const i1 = `    // IMAGENS
    else if (mediaType === 'image' || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      await client.sendMessage(chatId, media, { caption: text || undefined });
      console.log(\`[MULTI-SESSION] User \${userId} enviou imagem para \${number}\`);
    }`;

const i2 = `    // IMAGENS
    else if (mediaType === 'image' || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      try {
        await client.sendMessage(chatId, media, { caption: text || undefined });
      } catch (error) {
        if (error.message && error.message.includes('markedUnread')) {
          console.log(\`[MULTI-SESSION] Ignorando erro markedUnread - imagem enviada\`);
        } else {
          throw error;
        }
      }
      console.log(\`[MULTI-SESSION] User \${userId} enviou imagem para \${number}\`);
    }`;

if (content.includes(i1)) {
  content = content.replace(i1, i2);
  console.log('✅ 2/4 - IMAGENS modificado');
} else {
  console.log('⚠️  2/4 - IMAGENS já modificado');
}

// MODIFICAÇÃO 3: ÁUDIO
const a1 = `    // ÁUDIO
    else if (mediaType === 'audio' || ['.mp3', '.ogg', '.wav'].includes(ext)) {
      await client.sendMessage(chatId, media, { sendAudioAsVoice: true });
      console.log(\`[MULTI-SESSION] User \${userId} enviou áudio para \${number}\`);
    }`;

const a2 = `    // ÁUDIO
    else if (mediaType === 'audio' || ['.mp3', '.ogg', '.wav'].includes(ext)) {
      try {
        await client.sendMessage(chatId, media, { sendAudioAsVoice: true });
      } catch (error) {
        if (error.message && error.message.includes('markedUnread')) {
          console.log(\`[MULTI-SESSION] Ignorando erro markedUnread - áudio enviado\`);
        } else {
          throw error;
        }
      }
      console.log(\`[MULTI-SESSION] User \${userId} enviou áudio para \${number}\`);
    }`;

if (content.includes(a1)) {
  content = content.replace(a1, a2);
  console.log('✅ 3/4 - ÁUDIO modificado');
} else {
  console.log('⚠️  3/4 - ÁUDIO já modificado');
}

// MODIFICAÇÃO 4: DOCUMENTOS
const d1 = `    // DOCUMENTOS
    else {
      await client.sendMessage(chatId, media, {
        caption: text || undefined,
        sendMediaAsDocument: true
      });
      console.log(\`[MULTI-SESSION] User \${userId} enviou documento para \${number}\`);
    }`;

const d2 = `    // DOCUMENTOS
    else {
      try {
        await client.sendMessage(chatId, media, {
          caption: text || undefined,
          sendMediaAsDocument: true
        });
      } catch (error) {
        if (error.message && error.message.includes('markedUnread')) {
          console.log(\`[MULTI-SESSION] Ignorando erro markedUnread - documento enviado\`);
        } else {
          throw error;
        }
      }
      console.log(\`[MULTI-SESSION] User \${userId} enviou documento para \${number}\`);
    }`;

if (content.includes(d1)) {
  content = content.replace(d1, d2);
  console.log('✅ 4/4 - DOCUMENTOS modificado');
} else {
  console.log('⚠️  4/4 - DOCUMENTOS já modificado');
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n🎉 CONCLUÍDO!\n');
console.log('📝 Arquivo modificado: whatsapp-manager.js');
console.log('🔒 Backup disponível em: ~/BACKUP-WHATSAPP-20260118-234838/\n');
console.log('🚀 Próximo passo: pm2 restart all\n');
