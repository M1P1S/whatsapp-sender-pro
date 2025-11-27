// ============================================
// PROCESSADOR DE VÍDEOS - VERSÃO CORRIGIDA
// Com paths do FFmpeg configurados
// ============================================

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// ⭐ CONFIGURAR PATHS DO FFMPEG ⭐
try {
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  const ffprobePath = require('@ffprobe-installer/ffprobe').path;
  
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
  
  console.log('✅ FFmpeg configurado:', ffmpegPath);
  console.log('✅ FFprobe configurado:', ffprobePath);
} catch (error) {
  console.warn('⚠️  Aviso: FFmpeg installers não encontrados');
  console.warn('   Tentando usar FFmpeg do sistema...');
}

// Verificar se FFmpeg está disponível
function checkFFmpegInstalled() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      if (err) {
        console.warn('⚠️  FFmpeg não disponível:', err.message);
        resolve(false);
      } else {
        console.log('✅ FFmpeg disponível e funcionando');
        resolve(true);
      }
    });
  });
}

// Obter informações do vídeo
function getVideoInfo(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        
        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name,
          videoCodec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name,
          width: videoStream?.width,
          height: videoStream?.height,
          fps: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : 30
        });
      }
    });
  });
}

// Converter vídeo para MP4 otimizado
async function convertToWhatsAppFormat(inputPath, outputPath = null) {
  try {
    console.log('🎬 Processando vídeo para WhatsApp...');
    
    if (!outputPath) {
      const dir = path.dirname(inputPath);
      const ext = path.extname(inputPath);
      const name = path.basename(inputPath, ext);
      outputPath = path.join(dir, `${name}_whatsapp.mp4`);
    }

    const info = await getVideoInfo(inputPath);
    console.log(`📊 Original: ${(info.size / 1024 / 1024).toFixed(2)}MB, ${info.videoCodec}, ${info.width}x${info.height}`);

    const needsCompression = info.size > 12 * 1024 * 1024;
    const needsConversion = info.videoCodec !== 'h264' || !info.format.includes('mp4');

    if (!needsCompression && !needsConversion) {
      console.log('✅ Vídeo já está OK!');
      return inputPath;
    }

    return new Promise((resolve, reject) => {
      console.log('🔄 Convertendo...');
      
      let ffmpegCmd = ffmpeg(inputPath);

      ffmpegCmd
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .outputOptions([
          '-preset fast',
          '-crf 28',
          '-movflags +faststart',
          '-pix_fmt yuv420p',
          '-max_muxing_queue_size 1024'
        ]);

      if (needsCompression && info.size > 14 * 1024 * 1024) {
        console.log('📉 Comprimindo...');
        if (info.width > 1280 || info.height > 720) {
          ffmpegCmd.size('1280x?');
        }
        ffmpegCmd.videoBitrate('800k').audioBitrate('96k');
      }

      ffmpegCmd
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r⏳ Progresso: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('\n✅ Conversão concluída!');
          const finalSize = fs.statSync(outputPath).size;
          console.log(`📊 Final: ${(finalSize / 1024 / 1024).toFixed(2)}MB`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('\n❌ Erro:', err.message);
          reject(err);
        })
        .save(outputPath);
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar:', error.message);
    throw error;
  }
}

// Validar vídeo
async function validateVideo(videoPath) {
  try {
    const info = await getVideoInfo(videoPath);
    const issues = [];
    
    if (info.size > 16 * 1024 * 1024) {
      issues.push(`Muito grande: ${(info.size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    if (info.videoCodec !== 'h264') {
      issues.push(`Codec: ${info.videoCodec} (ideal: h264)`);
    }
    
    return {
      valid: issues.length === 0,
      issues: issues,
      info: info,
      needsConversion: info.videoCodec !== 'h264' || !info.format.includes('mp4')
    };
  } catch (error) {
    return {
      valid: false,
      issues: [`Erro: ${error.message}`],
      needsConversion: true
    };
  }
}

// Função principal
async function processVideoForWhatsApp(videoPath) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🎬 PROCESSADOR DE VÍDEOS');
    console.log('='.repeat(60));
    
    if (!fs.existsSync(videoPath)) {
      throw new Error('Arquivo não encontrado');
    }

    const validation = await validateVideo(videoPath);
    
    console.log('\n📋 Validação:');
    if (validation.valid) {
      console.log('✅ Vídeo OK!');
    } else {
      console.log('⚠️  Problemas:');
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (!validation.valid || validation.needsConversion) {
      console.log('\n🔄 Processando...');
      const outputPath = await convertToWhatsAppFormat(videoPath);
      
      console.log('='.repeat(60) + '\n');
      return {
        success: true,
        originalPath: videoPath,
        processedPath: outputPath,
        wasConverted: outputPath !== videoPath
      };
    } else {
      console.log('\n✅ Não precisa processar!');
      console.log('='.repeat(60) + '\n');
      return {
        success: true,
        originalPath: videoPath,
        processedPath: videoPath,
        wasConverted: false
      };
    }
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.log('='.repeat(60) + '\n');
    throw error;
  }
}

module.exports = {
  checkFFmpegInstalled,
  getVideoInfo,
  convertToWhatsAppFormat,
  validateVideo,
  processVideoForWhatsApp
};