console.log('🚀 [INIT] app.js carregado!');

const API_URL = '';
let contacts = [];
const MAX_RETRIES = 3;

// Verificar conexão do WhatsApp com retry
async function checkConnection() {
  try {
    const response = await fetch(`${API_URL}/api/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    clearInterval(progressInterval);
    retryCount = 0; // Reset contador de tentativas
    
    const statusEl = document.getElementById('status');
    const qrSection = document.getElementById('qr-section');
    const mainSection = document.getElementById('main-section');
    
    if (data.connected) {
      statusEl.textContent = 'Conectado ✓';
      statusEl.className = 'status connected';
      qrSection.style.display = 'none';
      mainSection.style.display = 'block';
    } else {
      statusEl.textContent = 'Aguardando QR Code...';
      statusEl.className = 'status disconnected';
      loadQRCode();
    }
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
    
    retryCount++;
    const statusEl = document.getElementById('status');
    
    if (retryCount <= MAX_RETRIES) {
      statusEl.textContent = `Tentando conectar... (${retryCount}/${MAX_RETRIES})`;
      statusEl.className = 'status disconnected';
    } else {
      statusEl.textContent = '❌ Servidor offline';
      statusEl.className = 'status disconnected';
      
      const qrContainer = document.getElementById('qr-container');
      qrContainer.innerHTML = `
        <div style="color: #f44336; text-align: center;">
          <h3>⚠️ Não foi possível conectar ao servidor</h3>
          <p>Verifique se o servidor está rodando:</p>
          <code style="background: #f5f5f5; padding: 10px; display: block; margin: 10px 0; border-radius: 5px;">
            npm run dev
          </code>
          <p style="margin-top: 15px;">O servidor deve estar rodando em:</p>
          <strong>${API_URL}</strong>
          <button onclick="location.reload()" style="margin-top: 20px;">
            🔄 Tentar Novamente
          </button>
        </div>
      `;
    }
  }
}

// Carregar QR Code com melhor tratamento de erro
async function loadQRCode() {
  try {
    console.log('[QR] Iniciando loadQRCode()');
    const response = await fetch(`${API_URL}/api/qrcode`);
    console.log('[QR] Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    clearInterval(progressInterval);
    console.log('[QR] Data recebida:', data);
    const qrContainer = document.getElementById('qr-container');
    
    if (data.qrCode) {
      console.log('[QR] QR Code encontrado! Tamanho:', data.qrCode.length);
      qrContainer.innerHTML = `
        <div>
          <img src="${data.qrCode}" alt="QR Code" style="width: 300px; height: 300px;">
          <p style="margin-top: 15px; font-size: 1.1em;">📱 Escaneie com o WhatsApp</p>
          <p style="color: #666; font-size: 0.9em;">Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar um aparelho</p>
        </div>
      `;
    } else if (data.connected) {
      checkConnection();
    } else {
      qrContainer.innerHTML = `
        <div>
          <p style="font-size: 1.1em;">⏳ Aguardando geração do QR Code...</p>
          <p style="color: #666; margin-top: 10px;">Isso pode levar alguns segundos</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Erro ao carregar QR Code:', error);
  }
}

// Upload de contatos
async function uploadContacts() {
  const fileInput = document.getElementById('contactFile');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('⚠️ Selecione um arquivo!');
    return;
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  const preview = document.getElementById('contacts-preview');
  preview.innerHTML = '<p>⏳ Processando arquivo...</p>';
  
  try {
    const response = await fetch(`${API_URL}/api/upload-contacts`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    clearInterval(progressInterval);
    
    if (data.contacts && data.contacts.length > 0) {
      contacts = data.contacts;
      displayContacts();
    } else {
      preview.innerHTML = '<p style="color: #f44336;">❌ Nenhum contato encontrado no arquivo</p>';
    }
  } catch (error) {
    preview.innerHTML = `<p style="color: #f44336;">❌ Erro ao carregar contatos: ${error.message}</p>`;
    console.error('Erro:', error);
  }
}

// Exibir contatos com validação
function displayContacts() {
  const preview = document.getElementById('contacts-preview');
  
  // Valida e formata os contatos
  const validContacts = [];
  const invalidContacts = [];
  
  contacts.forEach(contact => {
    const cleaned = contact.replace(/\D/g, '');
    
    // Verifica se tem formato válido
    if (cleaned.length >= 10 && cleaned.length <= 13) {
      let formatted = cleaned;
      
      // Adiciona 55 se não tiver
      if (!formatted.startsWith('55')) {
        formatted = '55' + formatted;
      }
      
      // Verifica se tem 13 dígitos (55 + 11 dígitos)
      if (formatted.length === 13 || formatted.length === 12) {
        validContacts.push({
          original: contact,
          formatted: formatted,
          display: `${formatted.substring(0,2)} (${formatted.substring(2,4)}) ${formatted.substring(4)}`
        });
      } else {
        invalidContacts.push(contact);
      }
    } else {
      invalidContacts.push(contact);
    }
  });
  
  // Atualiza o array de contatos com os válidos
  contacts = validContacts.map(c => c.formatted);
  
  preview.innerHTML = `
    <div>
      <h3 style="color: #25D366;">✅ ${validContacts.length} contatos válidos</h3>
      ${invalidContacts.length > 0 ? `<h3 style="color: #f44336;">❌ ${invalidContacts.length} contatos inválidos</h3>` : ''}
      
      <div style="margin-top: 15px; max-height: 200px; overflow-y: auto;">
        ${validContacts.slice(0, 10).map(c => `
          <div class="contact-item">
            <strong>📱 ${c.display}</strong>
            <div style="font-size: 0.85em; color: #666; margin-top: 3px;">
              Original: ${c.original} → Formatado: ${c.formatted}
            </div>
          </div>
        `).join('')}
        ${validContacts.length > 10 ? `<p style="margin-top: 10px; color: #666;">... e mais ${validContacts.length - 10} contatos</p>` : ''}
      </div>
      
      ${invalidContacts.length > 0 ? `
        <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
          <strong>⚠️ Contatos Inválidos (ignorados):</strong>
          <div style="margin-top: 5px; font-size: 0.9em;">
            ${invalidContacts.slice(0, 5).join(', ')}
            ${invalidContacts.length > 5 ? ` ... e mais ${invalidContacts.length - 5}` : ''}
          </div>
          <p style="margin-top: 8px; font-size: 0.85em; color: #666;">
            Formato correto: <code>5561991234567</code> (55 + DDD + 9 + número)
          </p>
        </div>
      ` : ''}
    </div>
  `;
}


// Testar número individual
async function testNumber() {
  const numberInput = document.getElementById('testNumber');
  const number = numberInput.value.trim().replace(/\D/g, '');
  const resultDiv = document.getElementById('testResult');
  
  if (!number) {
    resultDiv.innerHTML = '<p style="color: #f44336;">⚠️ Digite um número!</p>';
    return;
  }
  
  resultDiv.innerHTML = '<p>⏳ Verificando número...</p>';
  
  try {
    const response = await fetch(`${API_URL}/api/test-number`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number })
    });
    
    const data = await response.json();
    clearInterval(progressInterval);
    
    if (data.exists) {
      resultDiv.innerHTML = `
        <p style="color: #25D366;">✅ Número existe no WhatsApp!</p>
        <p style="font-size: 0.9em; color: #666;">Formatado: ${data.formatted}</p>
      `;
    } else {
      resultDiv.innerHTML = `
        <p style="color: #f44336;">❌ Número NÃO existe no WhatsApp</p>
        <p style="font-size: 0.9em;">Verifique se o número está correto</p>
      `;
    }
  } catch (error) {
    resultDiv.innerHTML = `<p style="color: #f44336;">❌ Erro: ${error.message}</p>`;
  }
}

// Enviar mensagens
async function sendMessages() {
  const message = document.getElementById('message').value.trim();
  const mediaFile = document.getElementById('mediaFile').files[0];
  
  if (!message) {
    alert('⚠️ Digite uma mensagem!');
    return;
  }
  
  if (contacts.length === 0) {
    alert('⚠️ Carregue os contatos primeiro!');
    return;
  }
  
  if (!confirm(`📤 Deseja enviar a mensagem para ${contacts.length} contatos?`)) {
    return;
  }
  
  const formData = new FormData();
  formData.append('contacts', JSON.stringify(contacts));
  formData.append('message', message);
  formData.append('minInterval', document.getElementById('minInterval').value);
  formData.append('maxInterval', document.getElementById('maxInterval').value);
  if (mediaFile) {
    formData.append('media', mediaFile);
  }
  const progressEl = document.getElementById('progress');
  progressEl.style.display = 'block';
  
  const total = contacts.length;
  const minInt = parseInt(document.getElementById('minInterval').value);
  const maxInt = parseInt(document.getElementById('maxInterval').value);
  const avgInterval = (minInt + maxInt) / 2;
  const estimatedTime = total * avgInterval;
  
  let current = 0;
  progressEl.innerHTML = `
    <div style="text-align: center;">
      <h3>📤 Enviando mensagens...</h3>
      <p><strong id="progress-counter">0/${total}</strong> mensagens enviadas</p>
      <div style="width: 80%; margin: 20px auto; background: #f0f0f0; border-radius: 10px; height: 30px; overflow: hidden;">
        <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #25D366, #128C7E); transition: width 0.3s;"></div>
      </div>
      <p style="color: #666;">Tempo estimado: ${Math.ceil(estimatedTime / 60)} minutos</p>
      <p style="font-size: 0.9em; color: #999;">Por favor, não feche esta janela.</p>
    </div>
  `;
  
  // Simular progresso
  const progressInterval = setInterval(() => {
    if (current < total) {
      current++;
      const percent = (current / total) * 100;
      document.getElementById('progress-counter').textContent = `${current}/${total}`;
      document.getElementById('progress-bar').style.width = percent + '%';
    }
  }, avgInterval * 1000);
  
  try {
    const response = await fetch(`${API_URL}/api/send`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    clearInterval(progressInterval);
    
    const successful = data.results.filter(r => r.success).length;
    const failed = data.results.length - successful;
    
    progressEl.innerHTML = `
      <div style="text-align: center;">
        <h3 style="color: #25D366;">✅ Envio Concluído!</h3>
        <div style="display: flex; justify-content: space-around; margin-top: 20px;">
          <div>
            <div style="font-size: 2em; color: #25D366;">✓ ${successful}</div>
            <div>Sucesso</div>
          </div>
          <div>
            <div style="font-size: 2em; color: #f44336;">✗ ${failed}</div>
            <div>Falhas</div>
          </div>
        </div>
        ${failed > 0 ? '<p style="margin-top: 15px; color: #666;">Alguns contatos podem estar incorretos ou bloqueados</p>' : ''}
      </div>
    `;
  } catch (error) {
    progressEl.innerHTML = `
      <div style="text-align: center; color: #f44336;">
        <h3>❌ Erro ao enviar mensagens</h3>
        <p>${error.message}</p>
        <button onclick="sendMessages()" style="margin-top: 15px;">🔄 Tentar Novamente</button>
      </div>
    `;
    console.error('Erro:', error);
  }
}

// Adicionar animação de loading no CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Iniciar verificação quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Aplicação iniciada');
  console.log('🔗 Conectando ao servidor:', API_URL);
  checkConnection();
  setInterval(checkConnection, 5000);
});

// ========== FUNCIONALIDADES PREMIUM ==========

// Mostrar/ocultar seções PREMIUM baseado no plano
function updatePremiumSections() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isPremium = user.plan === 'PREMIUM';
  
  const pasteSection = document.getElementById('premium-paste-section');
  const googleSection = document.getElementById('premium-google-section');
  
  if (pasteSection) pasteSection.style.display = isPremium ? 'block' : 'none';
  if (googleSection) googleSection.style.display = isPremium ? 'block' : 'none';
}

// Processar números colados
async function processPastedNumbers() {
  const text = document.getElementById('pasteNumbers').value;
  const result = document.getElementById('pasteResult');
  
  if (!text.trim()) {
    result.innerHTML = '<p style="color: red;">❌ Cole os números primeiro!</p>';
    return;
  }
  
  result.innerHTML = '<p>⏳ Processando...</p>';
  
  try {
    const response = await fetch('/api/contacts/process-paste', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ text, userDDD: '61' })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Armazenar números válidos para uso
      window.processedContacts = data.valid;
      
      result.innerHTML = `
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-top: 10px;">
          <h4>✅ Processamento Concluído!</h4>
          <p><strong>Válidos:</strong> ${data.valid.length}</p>
          <p><strong>Inválidos:</strong> ${data.invalid.length}</p>
          <p><strong>Duplicados removidos:</strong> ${data.duplicates}</p>
          <button onclick="useProcessedContacts()" style="background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">
            ✅ Usar Estes Contatos
          </button>
        </div>
      `;
    } else {
      result.innerHTML = `<p style="color: red;">❌ ${data.error}</p>`;
    }
  } catch (error) {
    result.innerHTML = `<p style="color: red;">❌ Erro: ${error.message}</p>`;
  }
}

// Usar contatos processados
function useProcessedContacts() {
  if (window.processedContacts && window.processedContacts.length > 0) {
    window.contacts = window.processedContacts;
    document.getElementById('contactCount').textContent = window.contacts.length;
    alert(`✅ ${window.contacts.length} contatos carregados com sucesso!`);
  }
}

// Conectar Google
async function connectGoogle() {
  const result = document.getElementById('googleResult');
  result.innerHTML = '<p>⏳ Abrindo autorização...</p>';
  
  try {
    const response = await fetch('/api/google/auth', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      window.open(data.authUrl, 'Google Authorization', 'width=600,height=600');
      result.innerHTML = '<p style="color: green;">✅ Janela de autorização aberta! Após autorizar, clique em "Sincronizar Contatos".</p>';
    } else {
      result.innerHTML = `<p style="color: red;">❌ ${data.error}</p>`;
    }
  } catch (error) {
    result.innerHTML = `<p style="color: red;">❌ Erro: ${error.message}</p>`;
  }
}

// Sincronizar Google Contacts
async function syncGoogleContacts() {
  const result = document.getElementById('googleResult');
  result.innerHTML = '<p>⏳ Sincronizando contatos...</p>';
  
  try {
    const response = await fetch('/api/google/sync', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      result.innerHTML = `
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
          <h4>✅ Sincronização Concluída!</h4>
          <p><strong>Total de contatos:</strong> ${data.total}</p>
          <p><strong>Importados com sucesso:</strong> ${data.imported}</p>
        </div>
      `;
    } else {
      result.innerHTML = `<p style="color: red;">❌ ${data.error}</p>`;
    }
  } catch (error) {
    result.innerHTML = `<p style="color: red;">❌ Erro: ${error.message}</p>`;
  }
}

// Inicializar seções PREMIUM quando a página carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updatePremiumSections);
} else {
  updatePremiumSections();
}
