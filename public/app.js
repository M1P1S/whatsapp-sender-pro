let contacts = [];
const API_URL = 'http://localhost:3000';
let retryCount = 0;
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
    const response = await fetch(`${API_URL}/api/qrcode`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const qrContainer = document.getElementById('qr-container');
    
    if (data.qrCode) {
      qrContainer.innerHTML = `
        <div>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrCode)}" alt="QR Code">
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
  if (mediaFile) {
    formData.append('media', mediaFile);
  }
  
  const progressEl = document.getElementById('progress');
  progressEl.style.display = 'block';
  progressEl.innerHTML = `
    <div style="text-align: center;">
      <h3>📤 Enviando mensagens...</h3>
      <p>Por favor, aguarde. Não feche esta janela.</p>
      <div style="margin: 20px auto; width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #25D366; border-radius: 50%; animation: spin 1s linear infinite;"></div>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_URL}/api/send`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
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