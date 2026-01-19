console.log('🚀 [INIT] app.js carregado!');

let retryCount = 0;
const MAX_RETRIES = 3;
const API_URL = '';
let contacts = [];

async function checkConnection() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

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
      const disconnectBtn = document.getElementById("disconnect-btn");
      if (disconnectBtn) disconnectBtn.style.display = "inline-block";
      document.body.classList.add('whatsapp-connected');
      statusEl.className = 'status connected';
      qrSection.style.display = 'none';
      mainSection.style.display = 'block';
    } else {
      statusEl.textContent = 'Aguardando QR Code...';
      const disconnectBtn = document.getElementById("disconnect-btn");
      if (disconnectBtn) disconnectBtn.style.display = "none";
      document.body.classList.remove('whatsapp-connected');
      statusEl.className = 'status disconnected';
      loadQRCode();
    }
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
  }
}

async function loadQRCode() {
  try {
    console.log('[QR] Iniciando loadQRCode()');
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/qrcode`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('[QR] Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
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
    const token = localStorage.getItem('token');
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
      displayContacts();
    } else {
      preview.innerHTML = '<p style="color: #f44336;">❌ Nenhum contato encontrado no arquivo</p>';
    }
  } catch (error) {
    preview.innerHTML = `<p style="color: #f44336;">❌ Erro ao carregar contatos: ${error.message}</p>`;
    console.error('Erro:', error);
  }
}

function displayContacts() {
  const preview = document.getElementById('contacts-preview');
  let html = `<div style="max-height: 200px; overflow-y: auto;">`;
  contacts.slice(0, 10).forEach(c => {
    html += `<div style="padding: 5px; border-bottom: 1px solid #ddd;">📱 ${c}</div>`;
  });
  if (contacts.length > 10) {
    html += `<p style="margin-top: 10px;">... e mais ${contacts.length - 10} contatos</p>`;
  }
  html += `</div>`;
  preview.innerHTML = html;
}

async function sendMessages() {
  const token = localStorage.getItem('token');
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
  
  // Adicionar intervalos configurados
  const minInterval = parseInt(document.getElementById('minInterval').value) || 30;
  const maxInterval = parseInt(document.getElementById('maxInterval').value) || 45;
  formData.append('minInterval', minInterval);
  formData.append('maxInterval', maxInterval);
  if (mediaFile) {
    formData.append('media', mediaFile);
  }
  const progressEl = document.getElementById('progress');
  progressEl.style.display = 'block';
  progressEl.innerHTML = '<div style="text-align: center;"><h3>📤 Enviando mensagens...</h3><p>Por favor, aguarde. Não feche esta janela.</p></div>';
  try {
    const response = await fetch(`${API_URL}/api/send`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const successful = data.results.filter(r => r.success).length;
    const failed = data.results.length - successful;
    progressEl.innerHTML = `<div style="text-align: center;"><h3 style="color: #25D366;">✅ Envio Concluído!</h3><div style="display: flex; justify-content: space-around; margin-top: 20px;"><div><div style="font-size: 2em; color: #25D366;">✓ ${successful}</div><div>Sucesso</div></div><div><div style="font-size: 2em; color: #f44336;">✗ ${failed}</div><div>Falhas</div></div></div></div>`;
  } catch (error) {
    progressEl.innerHTML = `<div style="text-align: center; color: #f44336;"><h3>❌ Erro ao enviar mensagens</h3><p>${error.message}</p><button onclick="sendMessages()" style="margin-top: 15px;">🔄 Tentar Novamente</button></div>`;
  }
}

async function scheduleMessages() {
  console.log("[AGENDAR] Função scheduleMessages chamada");
  const planName = document.getElementById("plan-name").textContent;
  if (planName === "FREE") {
    alert("⭐ Recurso PRO\n\nAgendamento está disponível apenas no plano PRO.\n\nUpgrade agora!");
    return;
  }
  const token = localStorage.getItem('token');
  const message = document.getElementById('message').value.trim();
  const scheduleDate = document.getElementById('scheduleDate').value;
  const scheduleTime = document.getElementById('scheduleTime').value;
  const mediaFile = document.getElementById('mediaFile').files[0];
  if (!message || !scheduleDate || !scheduleTime) {
    alert('⚠️ Preencha mensagem, data e hora!');
    return;
  }
  if (contacts.length === 0) {
    alert('⚠️ Carregue os contatos primeiro!');
    return;
  }
  console.log("[TIMEZONE] Navegador offset:", new Date().getTimezoneOffset(), "minutos");
  console.log("[TIMEZONE] Data/Hora digitada:", scheduleDate, scheduleTime);
  const localDate = new Date(`${scheduleDate}T${scheduleTime}`);
  console.log("[TIMEZONE] Data criada (local):", localDate);
  console.log("[TIMEZONE] Data UTC:", localDate.toISOString());
  const scheduledDate = localDate.toISOString();
  const formData = new FormData();
  formData.append('contacts', JSON.stringify(contacts));
  formData.append('message', message);
  
  // Adicionar intervalos configurados
  const minInterval = parseInt(document.getElementById('minInterval').value) || 30;
  const maxInterval = parseInt(document.getElementById('maxInterval').value) || 45;
  formData.append('minInterval', minInterval);
  formData.append('maxInterval', maxInterval);
  formData.append('scheduledDate', scheduledDate);
  if (mediaFile) formData.append('media', mediaFile);
  try {
    const response = await fetch(`${API_URL}/api/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    alert(`✅ Agendado para ${scheduleDate} às ${scheduleTime}!`);
  } catch (error) {
    alert(`❌ Erro: ${error.message}`);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Aplicação iniciada');
  checkConnection();
  setInterval(checkConnection, 5000);
});

async function testNumber() {
  const token = localStorage.getItem('token');
  const number = document.getElementById('testNumber').value.trim();
  const resultDiv = document.getElementById('testResult');
  
  if (!number) {
    alert('⚠️ Digite um número!');
    return;
  }
  
  resultDiv.innerHTML = '<p>⏳ Testando...</p>';
  
  try {
    const response = await fetch(`${API_URL}/api/test-number`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ number })
    });
    
    const data = await response.json();
    
    if (data.exists) {
      resultDiv.innerHTML = `<p style="color: #25D366;">✅ Número válido no WhatsApp!</p>`;
    } else {
      resultDiv.innerHTML = `<p style="color: #f44336;">❌ Número não encontrado no WhatsApp</p>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<p style="color: #f44336;">❌ Erro: ${error.message}</p>`;
  }
}

async function removeDuplicates() {
  // Verificar plano
  const planName = document.getElementById("plan-name").textContent;
  if (planName === "FREE") {
    alert("⭐ Recurso PRO\n\nRemover duplicados automaticamente está disponível apenas no plano PRO.\n\nUpgrade agora!");
    document.getElementById("remove-duplicates").checked = false;
    return;
  }
  const original = contacts.length;
  contacts = [...new Set(contacts)];
  const removed = original - contacts.length;
  if (removed > 0) {
    alert(`✅ ${removed} contato(s) duplicado(s) removido(s)!`);
    displayContacts();
  } else {
    alert("ℹ️ Nenhum contato duplicado encontrado");
  }
}

function toggleRemoveDuplicates() {
  const checkbox = document.getElementById('removeDuplicates');
  if (checkbox.checked && contacts.length > 0) {
    removeDuplicates();
  }
}

async function loadUserPlan() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
  console.log("[DEBUG] Plano carregado:", data.plan);
    document.getElementById('plan-name').textContent = data.plan || 'FREE';
    // Controlar banner upgrade PREMIUM (apenas PRO)
    const premiumBanner = document.getElementById("premium-upgrade-banner");
    if (premiumBanner) {
      if (data.plan === "PRO") {
        premiumBanner.style.display = "block";
      } else {
        premiumBanner.style.display = "none";
      }
    }
    
    // Controlar banner de upgrade
    const upgradeBtn = document.getElementById("upgrade-button");
    if (upgradeBtn) upgradeBtn.style.display = "none";
    if (data.plan === 'PRO' || data.plan === 'PREMIUM') {
      document.getElementById('sends-info').innerHTML = '<span style="color: #FFD700;">✨ Envios Ilimitados</span>';
    } else {
      document.getElementById('sends-info').textContent = '0/50 mensagens hoje';
    if (upgradeBtn) upgradeBtn.style.display = "block";
    console.log("[DEBUG] Banner upgrade exibido para FREE");
      document.getElementById('schedule-section').style.opacity = '0.5';
      document.getElementById('schedule-section').style.pointerEvents = 'none';
      document.getElementById('scheduleDate').disabled = true;
      document.getElementById('scheduleTime').disabled = true;
      document.getElementById('minInterval').disabled = true;
      document.getElementById('maxInterval').disabled = true;
      document.getElementById('testNumber').disabled = true;
      const testBtn = document.querySelector('button[onclick="testNumber()"]');
      if (testBtn) testBtn.disabled = true;
      document.getElementById("mediaFile").disabled = true;
      console.log("[DEBUG] Mídia bloqueada FREE");
      document.getElementById('remove-duplicates').disabled = true;
      document.querySelector('#filter-duplicates-section').style.opacity = '0.5';
      document.getElementById("filter-duplicates-section").style.display = "none";
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

window.addEventListener('DOMContentLoaded', loadUserPlan);

// ========== FUNCIONALIDADES PREMIUM ==========

// Mostrar/ocultar seções PREMIUM

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
    contacts = window.processedContacts;
    // Contatos prontos para uso
    alert(`✅ ${contacts.length} contatos carregados com sucesso!`);
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

// Chamar updatePremiumSections quando carregar
setTimeout(updatePremiumSections, 500);

// ========== GERENCIAMENTO DE SUBLISTAS ==========


// ========== GERENCIAMENTO DE SUBLISTAS MELHORADO ==========

let allContactsData = [];
let filteredContactsData = [];
let selectedContactIds = new Set();
let currentPage = 1;
let pageSize = 50;

// Extrair DDD de um telefone
function extractDDD(phone) {
  if (!phone) return '';
  const match = phone.match(/^55(\d{2})/);
  return match ? match[1] : '';
}

// Abrir modal e carregar contatos
async function openContactsManager() {
  document.getElementById('contactsModal').style.display = 'block';
  
  try {
    const response = await fetch('/api/contacts', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      allContactsData = data.contacts;
      filteredContactsData = [...allContactsData];
      
      // Popular select de DDDs
      const ddds = [...new Set(allContactsData.map(c => extractDDD(c.phone)).filter(d => d))].sort();
      const dddSelect = document.getElementById('filterDDD');
      dddSelect.innerHTML = '<option value="">Todos os DDDs</option>' + 
        ddds.map(ddd => `<option value="${ddd}">(${ddd})</option>`).join('');
      
      currentPage = 1;
      renderContactsList();
      updateSelectedCount();
    } else {
      alert('Erro ao carregar contatos: ' + data.error);
    }
  } catch (error) {
    alert('Erro ao carregar contatos: ' + error.message);
  }
}

// Filtrar contatos
function filterContacts() {
  const search = document.getElementById('searchContacts').value.toLowerCase();
  const ddd = document.getElementById('filterDDD').value;
  const source = document.getElementById('filterSource').value;
  
  filteredContactsData = allContactsData.filter(contact => {
    const matchSearch = !search || 
      contact.name.toLowerCase().includes(search) || 
      contact.phone.includes(search) ||
      (contact.email && contact.email.toLowerCase().includes(search));
    
    const matchDDD = !ddd || extractDDD(contact.phone) === ddd;
    const matchSource = !source || contact.source === source;
    
    return matchSearch && matchDDD && matchSource;
  });
  
  currentPage = 1;
  renderContactsList();
}

// Mudar tamanho da página
function changePageSize() {
  const size = document.getElementById('pageSize').value;
  pageSize = size === 'all' ? filteredContactsData.length : parseInt(size);
  currentPage = 1;
  renderContactsList();
}

// Renderizar lista com paginação
function renderContactsList() {
  const container = document.getElementById('contactsList');
  const totalPages = Math.ceil(filteredContactsData.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredContactsData.length);
  const pageContacts = filteredContactsData.slice(startIdx, endIdx);
  
  // Atualizar info de paginação
  document.getElementById('paginationInfo').textContent = 
    `Mostrando ${startIdx + 1}-${endIdx} de ${filteredContactsData.length} contatos`;
  
  if (pageContacts.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Nenhum contato encontrado.</p>';
    document.getElementById('paginationControls').innerHTML = '';
    return;
  }
  
  container.innerHTML = pageContacts.map(contact => `
    <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; hover: background: #f9fafb;">
      <input type="checkbox" id="contact-${contact.id}" value="${contact.id}" 
        ${selectedContactIds.has(contact.id) ? 'checked' : ''}
        onchange="toggleContactSelection(${contact.id})"
        style="margin-right: 12px; width: 18px; height: 18px; cursor: pointer;">
      <label for="contact-${contact.id}" style="cursor: pointer; flex: 1;">
        <strong style="color: #1f2937;">${contact.name}</strong><br>
        <small style="color: #6b7280;">📱 ${contact.phone} ${extractDDD(contact.phone) ? `(DDD ${extractDDD(contact.phone)})` : ''}</small>
        ${contact.email ? `<br><small style="color: #9ca3af;">📧 ${contact.email}</small>` : ''}
        <br><small style="color: #d1d5db;">📂 ${contact.source === 'google' ? 'Google' : 'Manual'}</small>
      </label>
    </div>
  `).join('');
  
  // Controles de paginação
  renderPaginationControls(totalPages);
}

// Renderizar controles de paginação
function renderPaginationControls(totalPages) {
  const controls = document.getElementById('paginationControls');
  
  if (totalPages <= 1) {
    controls.innerHTML = '';
    return;
  }
  
  let html = '';
  
  // Botão Anterior
  if (currentPage > 1) {
    html += `<button onclick="changePage(${currentPage - 1})" style="background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">← Anterior</button>`;
  }
  
  // Páginas
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === currentPage;
    html += `<button onclick="changePage(${i})" style="background: ${isActive ? '#8b5cf6' : '#e5e7eb'}; color: ${isActive ? 'white' : '#374151'}; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">${i}</button>`;
  }
  
  // Botão Próximo
  if (currentPage < totalPages) {
    html += `<button onclick="changePage(${currentPage + 1})" style="background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">Próximo →</button>`;
  }
  
  controls.innerHTML = html;
}

// Mudar página
function changePage(page) {
  currentPage = page;
  renderContactsList();
}

// Selecionar/deselecionar contato
function toggleContactSelection(contactId) {
  if (selectedContactIds.has(contactId)) {
    selectedContactIds.delete(contactId);
  } else {
    selectedContactIds.add(contactId);
  }
  updateSelectedCount();
}

// Selecionar todos os contatos filtrados
function selectAllContacts() {
  filteredContactsData.forEach(c => selectedContactIds.add(c.id));
  renderContactsList();
  updateSelectedCount();
}

// Desmarcar todos
function deselectAllContacts() {
  selectedContactIds.clear();
  renderContactsList();
  updateSelectedCount();
}

// Selecionar apenas o DDD atual filtrado
function selectCurrentDDD() {
  const ddd = document.getElementById('filterDDD').value;
  if (!ddd) {
    alert('Selecione um DDD primeiro!');
    return;
  }
  
  filteredContactsData.forEach(c => {
    if (extractDDD(c.phone) === ddd) {
      selectedContactIds.add(c.id);
    }
  });
  
  renderContactsList();
  updateSelectedCount();
  alert(`✅ Selecionados todos os contatos do DDD ${ddd}!`);
}

// Atualizar contador
function updateSelectedCount() {
  const count = selectedContactIds.size;
  const total = filteredContactsData.length;
  document.getElementById('selectedCount').innerHTML = 
    `<strong>${count}</strong> contato(s) selecionado(s) de <strong>${total}</strong> ${total !== allContactsData.length ? `(${allContactsData.length} no total)` : ''}`;
}

// Fechar modal
function closeContactsModal() {
  document.getElementById('contactsModal').style.display = 'none';
}

// Criar sublista
async function createSublistFromSelected() {
  if (selectedContactIds.size === 0) {
    alert('❌ Selecione pelo menos um contato!');
    return;
  }
  
  const name = prompt('📝 Nome da sublista:');
  if (!name) return;
  
  const description = prompt('📄 Descrição (opcional):') || '';
  
  try {
    const response = await fetch('/api/contacts/lists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name,
        description,
        contactIds: Array.from(selectedContactIds)
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`✅ Sublista "${name}" criada com ${selectedContactIds.size} contatos!`);
      selectedContactIds.clear();
      closeContactsModal();
      loadSublists();
    } else {
      alert('❌ Erro: ' + data.error);
    }
  } catch (error) {
    alert('❌ Erro ao criar sublista: ' + error.message);
  }
}

// [... resto das funções anteriores: loadSublists, viewSublistContacts, etc ...]

// Carregar sublistas
async function loadSublists() {
  const container = document.getElementById('sublistsContainer');
  container.innerHTML = '<p>⏳ Carregando sublistas...</p>';
  
  try {
    const response = await fetch('/api/contacts/lists', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      if (data.lists.length === 0) {
        container.innerHTML = `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 10px;">
            <p>📁 Você ainda não tem sublistas.</p>
            <p>Clique em "Ver Todos os Contatos" para criar sua primeira sublista!</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div style="max-height: 500px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-top: 15px; padding: 10px;">
            ${data.lists.map(list => `
              <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #1f2937;">📁 ${list.name}</h4>
                ${list.description ? `<p style="color: #6b7280; font-size: 0.9em; margin: 5px 0;">${list.description}</p>` : ''}
                <p style="color: #3b82f6; font-weight: bold; margin: 10px 0;">
                  👥 ${list.contact_count} contato(s)
                </p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                  <button onclick="viewSublistContacts(${list.id}, '${list.name}')" 
                    style="flex: 1; background: #3b82f6; color: white; padding: 8px; border: none; border-radius: 5px; cursor: pointer;">
                    👁️ Ver
                  </button>
                  <button onclick="useSublistForSending(${list.id})" 
                    style="flex: 1; background: #10b981; color: white; padding: 8px; border: none; border-radius: 5px; cursor: pointer;">
                    ✉️ Usar
                  </button>
                  <button onclick="deleteSublist(${list.id}, '${list.name}')" 
                    style="background: #ef4444; color: white; padding: 8px 12px; border: none; border-radius: 5px; cursor: pointer;">
                    🗑️
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    } else {
      container.innerHTML = `<p style="color: red;">❌ Erro: ${data.error}</p>`;
    }
  } catch (error) {
    container.innerHTML = `<p style="color: red;">❌ Erro ao carregar: ${error.message}</p>`;
  }
}

// Ver contatos de uma sublista
async function viewSublistContacts(listId, listName) {
  try {
    const response = await fetch(`/api/contacts/lists/${listId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      const phones = data.contacts.map(c => c.phone).join('\n');
      alert(`📋 ${listName}\n\n${data.contacts.length} contatos:\n\n${phones.substring(0, 500)}${phones.length > 500 ? '\n...' : ''}`);
    } else {
      alert('❌ Erro: ' + data.error);
    }
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

// Usar sublista para envio
async function useSublistForSending(listId) {
  try {
    const response = await fetch(`/api/contacts/lists/${listId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      window.contacts = data.contacts.map(c => c.phone);
      contacts = window.contacts;
      alert(`✅ ${contacts.length} contatos carregados! Role para baixo e configure sua mensagem.`);
    } else {
      alert('❌ Erro: ' + data.error);
    }
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

// Deletar sublista
async function deleteSublist(listId, listName) {
  if (!confirm(`🗑️ Tem certeza que deseja deletar a sublista "${listName}"?\n\nOs contatos NÃO serão deletados, apenas a lista.`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/contacts/lists/${listId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`✅ Sublista "${listName}" deletada!`);
      loadSublists();
    } else {
      alert('❌ Erro: ' + data.error);
    }
  } catch (error) {
    alert('❌ Erro: ' + error.message);
  }
}

// Mostrar/ocultar seção de sublistas
function updateSublistsSection() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isPremium = user.plan === 'PREMIUM';
  
  const sublistsSection = document.getElementById('premium-sublists-section');
  if (sublistsSection) sublistsSection.style.display = isPremium ? 'block' : 'none';
}

// Inicializar
setTimeout(() => {
  updateSublistsSection();
  updatePremiumSections();
}, 500);

// Selecionar apenas contatos da página atual
function selectCurrentPage() {
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredContactsData.length);
  const pageContacts = filteredContactsData.slice(startIdx, endIdx);
  
  pageContacts.forEach(c => selectedContactIds.add(c.id));
  
  renderContactsList();
  updateSelectedCount();
  alert(`✅ ${pageContacts.length} contatos desta página selecionados!`);
}
function updatePremiumSections() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isPro = user.plan === 'PRO' || user.plan === 'PREMIUM';
  const isPremium = user.plan === 'PREMIUM';
  
  // Funcionalidades PRO (para PRO e PREMIUM)
  const scheduleSection = document.getElementById('schedule-section');
  const mediaSection = document.getElementById('media-upload');
  const intervalBadge = document.getElementById('interval-pro-badge');
  
  if (scheduleSection) scheduleSection.style.display = isPro ? 'block' : 'none';
  if (mediaSection) mediaSection.style.display = isPro ? 'block' : 'none';
  if (intervalBadge) intervalBadge.style.display = isPro ? 'inline' : 'none';
  
  // Funcionalidades PREMIUM EXCLUSIVAS
  const pasteSection = document.getElementById('premium-paste-section');
  const googleSection = document.getElementById('premium-google-section');
  const sublistsSection = document.getElementById('premium-sublists-section');
  
  if (pasteSection) pasteSection.style.display = isPremium ? 'block' : 'none';
  if (googleSection) googleSection.style.display = isPremium ? 'block' : 'none';
  if (sublistsSection) sublistsSection.style.display = isPremium ? 'block' : 'none';
}

// ============================================
// ANTI-BAN: Modo de Envio (PREMIUM)
// ============================================
async function loadSendMode() {
  const userData = JSON.parse(localStorage.getItem('user'));
  if (!userData || userData.plan !== 'PREMIUM') {
    const section = document.getElementById('send-mode-section');
    if (section) section.style.display = 'none';
    return;
  }
  
  const section = document.getElementById('send-mode-section');
  if (section) section.style.display = 'block';
  
  try {
    const response = await fetch('/api/send-mode', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const select = document.getElementById('sendMode');
      if (select) {
        select.value = data.mode;
        updateModeInfoDisplay(true);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar modo:', error);
  }
}

async function updateSendMode(mode, showAlert = true) {
  try {
    const response = await fetch('/api/send-mode', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode })
    });
    
    if (response.ok && showAlert) {
      const modes = { SEGURO: '🐢 SEGURO', NORMAL: '⚖️ NORMAL', TURBO: '🚀 TURBO' };
      alert(`✅ Modo ${modes[mode]} ativado`);
    }
  } catch (error) {
    console.error('Erro ao atualizar modo:', error);
  }
}

function updateModeInfoDisplay(silent = false) {
  const mode = document.getElementById('sendMode')?.value || 'NORMAL';
  const modeInfoDiv = document.getElementById('mode-info');
  if (!modeInfoDiv) return;
  
  const modeData = {
    SEGURO: { icon: '🐢', name: 'SEGURO', interval: '60-120s', risk: 'Muito baixo', msgs: '~40' },
    NORMAL: { icon: '⚖️', name: 'NORMAL', interval: '30-60s', risk: 'Baixo', msgs: '~80' },
    TURBO: { icon: '🚀', name: 'TURBO', interval: '15-30s', risk: 'Alto ⚠️', msgs: '~150' }
  };
  
  const info = modeData[mode];
  modeInfoDiv.innerHTML = `<strong>${info.icon} Modo ${info.name}:</strong> Intervalo ${info.interval} • Risco ${info.risk} • ${info.msgs} msgs/hora`;
  
  if (!silent) updateSendMode(mode, true);
}

// ============================================
// VARIAÇÕES DE MENSAGEM (PREMIUM)
// ============================================
async function loadVariations() {
  const userData = JSON.parse(localStorage.getItem('user'));
  if (!userData || userData.plan !== 'PREMIUM') {
    const section = document.getElementById('variations-section');
    if (section) section.style.display = 'none';
    return;
  }
  
  const section = document.getElementById('variations-section');
  if (section) section.style.display = 'block';
  
  try {
    const response = await fetch('/api/message-variations', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      renderVariations(data.variations);
    }
  } catch (error) {
    console.error('Erro ao carregar variações:', error);
  }
}

async function addVariation() {
  const input = document.getElementById('variation-input');
  const text = input.value.trim();
  
  if (!text) {
    alert('Digite uma variação!');
    return;
  }
  
  try {
    const response = await fetch('/api/message-variations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    if (response.ok) {
      input.value = '';
      loadVariations();
    } else {
      const data = await response.json();
      alert(data.error || 'Erro ao adicionar');
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao adicionar variação');
  }
}

async function deleteVariation(id) {
  if (!confirm('Deletar esta variação?')) return;
  
  try {
    const response = await fetch(`/api/message-variations/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) loadVariations();
  } catch (error) {
    console.error('Erro ao deletar:', error);
  }
}

function renderVariations(variations) {
  const list = document.getElementById('variations-list');
  if (!list) return;
  
  if (variations.length === 0) {
    list.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; margin: 0;">Nenhuma variação cadastrada</p>';
    return;
  }
  
  list.innerHTML = variations.map((v, i) => `
    <div style="background: white; padding: 10px; margin-bottom: 8px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
      <div style="flex: 1;">
        <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; margin-right: 8px;">#${i + 1}</span>
        <span style="color: #333;">${v.variation_text}</span>
      </div>
      <button onclick="deleteVariation(${v.id})" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">🗑️</button>
    </div>
  `).join('');
}

// Carregar ao conectar
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    loadSendMode();
    loadVariations();
  }, 1500);
});

// ============================================
// ESCOLHA DE MODO DE INTERVALO (PREMIUM)
// ============================================

async function loadIntervalMode() {
  const userData = JSON.parse(localStorage.getItem('user'));
  if (!userData) return;
  
  const isPremium = userData.plan === 'PREMIUM';
  
  // Mostrar escolha apenas para PREMIUM
  const choiceSection = document.getElementById('interval-mode-choice');
  if (choiceSection) {
    choiceSection.style.display = isPremium ? 'block' : 'none';
  }
  
  if (!isPremium) return;
  
  // Carregar preferência
  try {
    const response = await fetch('/api/interval-mode', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const mode = data.mode || 'antiban';
      
      // Marcar radio correto
      const radio = document.querySelector(`input[name="intervalMode"][value="${mode}"]`);
      if (radio) radio.checked = true;
      
      // Aplicar visibilidade
      toggleIntervalMode(mode, false);
    }
  } catch (error) {
    console.error('Erro ao carregar modo:', error);
  }
}

function toggleIntervalMode(mode, save = true) {
  // Encontrar as seções
  const intervalSection = document.getElementById("interval-section");
  // Removido: já temos intervalSection
  const antiBanSection = document.getElementById('send-mode-section');
  
  if (mode === 'manual') {
    // Mostrar intervalo manual, ocultar anti-ban
    if (intervalSection) intervalSection.style.display = "block";
    if (antiBanSection) antiBanSection.style.display = 'none';
  } else {
    // Mostrar anti-ban, ocultar intervalo manual
    if (intervalSection) intervalSection.style.display = "none";
    if (antiBanSection) antiBanSection.style.display = 'block';
  }
  
  // Salvar preferência
  if (save) saveIntervalMode(mode);
}

async function saveIntervalMode(mode) {
  try {
    await fetch('/api/interval-mode', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode })
    });
    console.log(`Preferência salva: ${mode}`);
  } catch (error) {
    console.error('Erro ao salvar modo:', error);
  }
}

// Adicionar ao DOMContentLoaded existente
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadIntervalMode, 2000);
});


// Desconectar WhatsApp
async function disconnectWhatsApp() {
  if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
    return;
  }
  
  try {
    const response = await fetch('/api/disconnect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      alert('WhatsApp desconectado com sucesso!');
      // Recarregar página para atualizar status
      window.location.reload();
    } else {
      alert('Erro ao desconectar: ' + (data.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error);
    alert('Erro ao desconectar WhatsApp');
  }
}
