let qrPollingInterval = null;

function startQRPolling() {
  console.log('🔄 Iniciando polling do QR Code...');
  
  if (qrPollingInterval) {
    clearInterval(qrPollingInterval);
  }
  
  fetchQRCode();
  qrPollingInterval = setInterval(fetchQRCode, 3000);
}

async function fetchQRCode() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ Sem token');
      stopQRPolling();
      return;
    }
    
    const response = await fetch('/api/qrcode', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    const data = await response.json();
    
    if (data.connected) {
      console.log('✅ WhatsApp conectado!');
      stopQRPolling();
      
      // Redirecionar para dashboard ao invés de recarregar
      window.location.href = '/dashboard.html';
      return;
    }
    
    if (data.qrCode) {
      console.log('📱 QR Code recebido!');
      displayQRCodeVisual(data.qrCode);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

function stopQRPolling() {
  if (qrPollingInterval) {
    clearInterval(qrPollingInterval);
    qrPollingInterval = null;
  }
}

function displayQRCodeVisual(qrCodeDataURL) {
  const container = document.getElementById('qrcode-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'text-align:center;padding:30px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
  
  const title = document.createElement('h3');
  title.textContent = '📱 Escaneie o QR Code';
  title.style.cssText = 'color:white;margin-bottom:20px;font-size:24px;font-weight:bold;';
  
  const qrBox = document.createElement('div');
  qrBox.style.cssText = 'background:white;padding:20px;display:inline-block;border-radius:15px;box-shadow:0 5px 15px rgba(0,0,0,0.2);';
  
  const img = document.createElement('img');
  img.src = qrCodeDataURL;
  img.alt = 'QR Code do WhatsApp';
  img.style.cssText = 'width:300px;height:300px;display:block;';
  
  qrBox.appendChild(img);
  
  const instructions = document.createElement('p');
  instructions.textContent = 'Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo';
  instructions.style.cssText = 'color:white;margin-top:20px;font-size:16px;line-height:1.5;';
  
  const timer = document.createElement('p');
  timer.textContent = '🔄 QR Code atualiza automaticamente';
  timer.style.cssText = 'color:rgba(255,255,255,0.8);margin-top:10px;font-size:14px;';
  
  wrapper.appendChild(title);
  wrapper.appendChild(qrBox);
  wrapper.appendChild(instructions);
  wrapper.appendChild(timer);
  
  container.appendChild(wrapper);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startQRPolling);
} else {
  startQRPolling();
}
