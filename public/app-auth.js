const API_URL = '';
const TOKEN_KEY = 'token_' + (window.location.port || '80');
let contacts = [];
let retryCount = 0;
const MAX_RETRIES = 3;
let token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
let userPlan = 'FREE';
let canSendMedia = false;

// Verifica autenticação
if (!token) {
  window.location.href = '/auth.html';
}

// ============================================
// ⭐ ITEM 6: Carrega informações do usuário e plano
// ============================================
async function loadUserInfo() {
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Não autenticado');
    }

    const data = await response.json();
    document.getElementById('user-name').textContent = data.user.name;
    
    // Carrega info do plano
    const planResponse = await fetch(`${API_URL}/api/plan/info`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const planData = await planResponse.json();
    userPlan = planData.plan;
    canSendMedia = planData.canSendMedia;
    
    // ⭐ ITEM 6: Atualiza UI com mensagem ILIMITADO
    const planInfo = document.getElementById('plan-info');
    const planName = document.getElementById('plan-name');
    const sendsInfo = document.getElementById('sends-info');
    
    planName.textContent = planData.plan;
    
    // ⭐ ITEM 6: Lógica ILIMITADO
    if (planData.plan === 'PRO' || planData.plan === 'PREMIUM') {
      sendsInfo.innerHTML = '✨ Envios <strong>ILIMITADOS</strong>';
      sendsInfo.style.fontSize = '1.1em';
      sendsInfo.style.fontWeight = 'bold';
      console.log('✅ Item 6: Mostrar ILIMITADO para PRO');
    } else {
      sendsInfo.textContent = `${planData.todaySends}/${planData.limit} mensagens hoje (${planData.remaining} restantes)`;
      sendsInfo.style.fontSize = '';
      sendsInfo.style.fontWeight = '';
      console.log('✅ Item 6: Mostrar limite FREE');
    }
    
    if (planData.plan === 'PRO' || planData.plan === 'PREMIUM') {
      planInfo.classList.add('pro');
      document.getElementById('upgrade-button').style.display = 'none';
      
      // ⭐ ITEM 4: Mostrar filtro de duplicados para PRO
      updateFilterVisibility(true);
      
      // 🔧 CORREÇÃO 5: Mostrar intervalo para PRO
      updateIntervalVisibility(true);
      
    } else {
      document.getElementById('upgrade-button').style.display = 'block';
      document.getElementById('pro-only-badge').style.display = 'inline';
      
      // ⭐ ITEM 4: Ocultar filtro de duplicados para FREE
      updateFilterVisibility(false);
      
      // 🔧 CORREÇÃO 5: Ocultar intervalo para FREE
      updateIntervalVisibility(false);
      
      // Desabilita upload de mídia para FREE
      const mediaContainer = document.getElementById('media-upload-container');
      mediaContainer.classList.add('disabled');
      const badge = document.createElement('span');
      badge.className = 'pro-badge';
      badge.textContent = '💎 PRO';
      mediaContainer.appendChild(badge);
      
      // Mostra aviso ao tentar adicionar mídia
      document.getElementById('mediaFile').addEventListener('click', (e) => {
        if (userPlan === 'FREE') {
          e.preventDefault();
          document.getElementById('upgrade-notice').classList.add('show');
          setTimeout(() => {
            document.getElementById('upgrade-notice').classList.remove('show');
          }, 5000);
        }
      });
    }
    
  } catch (error) {
    console.error('Erro ao carregar usuário:', error);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    window.location.href = '/auth.html';
  }
}

// ============================================
// ⭐⭐⭐ ITEM 4: FILTRO DE DUPLICADOS ⭐⭐⭐
// ============================================

/**
 * Remove contatos duplicados de uma lista
 */
function removeDuplicateContacts(contactsList) {
  if (!Array.isArray(contactsList) || contactsList.length === 0) {
    return contactsList;
  }
  
  console.log(`🔍 Item 4: Filtrando ${contactsList.length} contatos...`);
  
  const seen = new Set();
  const unique = [];
  let duplicatesCount = 0;
  
  for (const contact of contactsList) {
    if (!contact) continue;
    
    // Normalizar: remover tudo que não é dígito
    const normalized = String(contact)
      .replace(/\D/g, '')
      .replace(/^0+/, ''); // Remove zeros à esquerda
    
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(contact);
    } else {
      duplicatesCount++;
      console.log(`🔄 Duplicado removido: ${contact}`);
    }
  }
  
  console.log(`📊 Item 4: ${contactsList.length} → ${unique.length} contatos (${duplicatesCount} removidos)`);
  
  if (duplicatesCount > 0) {
    alert(`✅ ${duplicatesCount} contato(s) duplicado(s) removido(s)!\n\nTotal final: ${unique.length} contatos únicos`);
  }
  
  return unique;
}

/**
 * Mostrar/ocultar seção de filtro baseado no plano
 */
function updateFilterVisibility(isPro) {
  const section = document.getElementById('filter-duplicates-section');
  
  if (section) {
    section.style.display = isPro ? 'block' : 'none';
    console.log(`🔍 Item 4: Filtro ${isPro ? 'VISÍVEL' : 'OCULTO'}`);
  }
}

// ============================================
// 🔧 CORREÇÃO 5: INTERVALO PRO ONLY
// ============================================

/**
 * Mostrar/ocultar seção de intervalo baseado no plano
 */
function updateIntervalVisibility(isPro) {
  const section = document.getElementById('interval-section');
  const badge = document.getElementById('interval-pro-badge');
  
  if (section) {
    section.style.display = isPro ? 'block' : 'none';
  }
  
  if (badge) {
    badge.style.display = isPro ? 'inline' : 'none';
  }
  
  console.log(`⏱️ Correção 5: Intervalo ${isPro ? 'VISÍVEL' : 'OCULTO'}`);
}

// ============================================
// FIM ITEM 4 E CORREÇÃO 5
// ============================================

// Logout
function logout() {
  if (confirm('Deseja realmente sair?')) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth.html';
  }
}

// Desconectar WhatsApp
async function disconnectWhatsApp() {
  if (!confirm('⚠️ Deseja desconectar o WhatsApp? Você precisará escanear o QR Code novamente.')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ WhatsApp desconectado! Aguarde 5 segundos para gerar novo QR Code...');
      
      // Aguarda 5 segundos e recarrega
      setTimeout(() => {
        location.reload();
      }, 5000);
    } else {
      alert('❌ Erro ao desconectar');
    }
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

// 🔧 CORREÇÃO 1: Verificar conexão do WhatsApp (SEM deslogar em erro 401/403)
async function checkConnection() {
  try {
    const response = await fetch(`${API_URL}/api/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // 🔧 CORREÇÃO 1: REMOVIDO bloco que deslogava em erro 401/403
    // A função checkConnection() serve para verificar status do WHATSAPP,
    // não para validar autenticação do usuário.
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    retryCount = 0;
    
    const statusEl = document.getElementById('status');
    const qrSection = document.getElementById('qr-section');
    const mainSection = document.getElementById('main-section');
    
    if (data.connected) {
      statusEl.textContent = 'Conectado ✓';
      statusEl.className = 'status connected';
      qrSection.style.display = 'none';
      mainSection.style.display = 'block';
      
      // Mostra botão de desconectar
      document.getElementById('disconnectBtn').style.display = 'inline-block';
      
      // Mostra seção de agendamento se for PRO
      if (userPlan === 'PRO' || userPlan === 'PREMIUM') {
        document.getElementById('schedule-section').style.display = 'block';
      }
    } else {
      statusEl.textContent = 'Aguardando QR Code...';
      statusEl.className = 'status disconnected';
      qrSection.style.display = 'block';
      mainSection.style.display = 'none';
      
      // Oculta botão de desconectar
      document.getElementById('disconnectBtn').style.display = 'none';
      
      // Mostra QR Code
      if (data.qr) {
        const qrContainer = document.getElementById('qr-container');
        qrContainer.innerHTML = `
          <div style="text-align: center;">
            <img src="${data.qr}" alt="QR Code" style="max-width: 300px; border: 2px solid #25D366; border-radius: 10px; padding: 10px; background: white;" />
            <p style="margin-top: 15px; color: #666;">Escaneie o QR Code com seu WhatsApp</p>
            <p style="font-size: 0.85em; color: #999;">WhatsApp > Configurações > Aparelhos conectados > Conectar aparelho</p>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    
    retryCount++;
    if (retryCount > MAX_RETRIES) {
      const statusEl = document.getElementById('status');
      statusEl.textContent = '❌ Erro de conexão';
      statusEl.className = 'status error';
      
      const qrContainer = document.getElementById('qr-container');
      qrContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="color: #f44336;">❌ Erro ao conectar com o servidor</p>
          <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🔄 Recarregar Página
          </button>
        </div>
      `;
    }
  }
}

// ============================================
// UPLOAD DE CONTATOS (usa o servidor)
// ============================================
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
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.contacts && data.contacts.length > 0) {
      contacts = data.contacts;
      
      preview.innerHTML = `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #25D366;">
          <h3 style="margin-bottom: 10px; color: #2e7d32;">✅ ${contacts.length} contatos carregados</h3>
          <p style="color: #666; font-size: 0.9em;">Primeiros contatos: ${contacts.slice(0, 3).join(', ')}${contacts.length > 3 ? '...' : ''}</p>
        </div>
      `;
      
      console.log('✅ Contatos carregados:', contacts.length);
    } else {
      preview.innerHTML = '<p style="color: #f44336;">❌ Nenhum contato encontrado no arquivo</p>';
    }
  } catch (error) {
    preview.innerHTML = `<p style="color: #f44336;">❌ Erro ao carregar contatos: ${error.message}</p>`;
    console.error('Erro:', error);
  }
}

// Testar número individual
async function testNumber() {
  const number = document.getElementById('testNumber').value.trim();
  const resultDiv = document.getElementById('testResult');
  
  if (!number) {
    resultDiv.innerHTML = '<p style="color: #f44336;">⚠️ Digite um número!</p>';
    return;
  }
  
  resultDiv.innerHTML = '<p>⏳ Verificando número...</p>';
  
  try {
    const response = await fetch(`${API_URL}/api/test-number`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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

// ============================================
// ⭐⭐⭐ ITEM 4: Enviar mensagens COM FILTRO ⭐⭐⭐
// ============================================
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
  
  // Verifica se está tentando enviar mídia no plano FREE
  if (mediaFile && userPlan === 'FREE') {
    alert('⚠️ Envio de mídia disponível apenas no plano PRO!\n\nFaça upgrade para enviar imagens e vídeos.');
    document.getElementById('upgrade-notice').classList.add('show');
    return;
  }
  
  // ⭐ ITEM 4: Aplicar filtro de duplicados SE checkbox marcado
  let contactsToSend = [...contacts]; // Cópia
  
  const checkbox = document.getElementById('remove-duplicates');
  if (checkbox && checkbox.checked) {
    console.log('🔍 Item 4: Aplicando filtro de duplicados...');
    contactsToSend = removeDuplicateContacts(contactsToSend);
    
    // Se não sobrou nenhum contato após filtro
    if (contactsToSend.length === 0) {
      alert('❌ Nenhum contato válido após remover duplicados!');
      return;
    }
  }
  
  if (!confirm(`📤 Deseja enviar a mensagem para ${contactsToSend.length} contatos?`)) {
    return;
  }
  
  const formData = new FormData();
  formData.append('contacts', JSON.stringify(contactsToSend));
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
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.status === 403) {
      // Limite atingido ou precisa de upgrade
      progressEl.innerHTML = `
        <div style="text-align: center; color: #ff9800;">
          <h3>⚠️ ${data.error}</h3>
          ${data.needsUpgrade ? '<a href="/upgrade.html" style="color: #0066cc; font-weight: bold; text-decoration: underline;">Fazer upgrade para PRO →</a>' : ''}
          <p style="margin-top: 15px;">Restam: ${data.remaining} mensagens hoje</p>
        </div>
      `;
      return;
    }
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro desconhecido');
    }
    
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
        ${failed > 0 ? '<p style="margin-top: 15px; color: #666;">Alguns contatos podem estar incorretos</p>' : ''}
        <button onclick="window.location.href='/dashboard.html'" style="margin-top: 20px; padding: 12px 30px; background: #25D366; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Ver Dashboard
        </button>
      </div>
    `;
    
    // Atualiza contador
    loadUserInfo();
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

// Agendar envio (PRO)
async function scheduleMessages() {
  if (userPlan !== 'PRO' && userPlan !== 'PREMIUM') {
    alert('⚠️ Agendamento disponível apenas no plano PRO!');
    window.location.href = '/upgrade.html';
    return;
  }
  
  const message = document.getElementById('message').value.trim();
  const mediaFile = document.getElementById('mediaFile').files[0];
  const scheduleDate = document.getElementById('scheduleDate').value;
  const scheduleTime = document.getElementById('scheduleTime').value;
  
  if (!message && !mediaFile) {
    alert('⚠️ Digite uma mensagem ou adicione uma mídia!');
    return;
  }
  
  if (contacts.length === 0) {
    alert('⚠️ Carregue os contatos primeiro!');
    return;
  }
  
  if (!scheduleDate || !scheduleTime) {
    alert('⚠️ Selecione data e hora para o agendamento!');
    return;
  }
  
  const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
  const now = new Date();
  
  if (scheduledDateTime <= now) {
    alert('⚠️ Data e hora devem ser no futuro!');
    return;
  }
  
  if (!confirm(`📅 Agendar envio para ${contacts.length} contatos em:\n\n📆 ${scheduleDate}\n🕐 ${scheduleTime}\n\nConfirmar?`)) {
    return;
  }
  
  const formData = new FormData();
  formData.append('contacts', JSON.stringify(contacts));
  formData.append('message', message || '');
  formData.append('scheduledDate', scheduledDateTime.toISOString());
  if (mediaFile) {
    formData.append('media', mediaFile);
  }
  
  try {
    const response = await fetch(`${API_URL}/api/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`✅ Envio agendado com sucesso!\n\nID: ${data.scheduleId}\nData: ${scheduleDate} ${scheduleTime}`);
      document.getElementById('progress').innerHTML = `
        <div style="text-align: center; background: #e8f5e9; padding: 20px; border-radius: 10px;">
          <h3 style="color: #2e7d32;">✅ Agendamento Criado!</h3>
          <p>Suas mensagens serão enviadas em ${scheduleDate} às ${scheduleTime}</p>
          <a href="/dashboard.html" style="display: inline-block; margin-top: 15px; padding: 12px 30px; background: #25D366; color: white; text-decoration: none; border-radius: 8px;">
            Ver Agendamentos
          </a>
        </div>
      `;
    } else {
      alert('❌ Erro ao agendar: ' + data.error);
    }
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

// Inicialização
loadUserInfo();
checkConnection();
setInterval(checkConnection, 5000);

// Adicionar funções globais ao window para serem acessíveis pelo HTML
window.disconnectWhatsApp = disconnectWhatsApp;
window.scheduleMessages = scheduleMessages;
window.sendMessages = sendMessages;
window.uploadContacts = uploadContacts;
window.testNumber = testNumber;
window.logout = logout;