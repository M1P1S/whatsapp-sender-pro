// [SINGLE-SESSION:UI] Sistema de verificação de sessão única
// Garante que apenas 1 dispositivo esteja logado por vez

class SessionChecker {
  constructor() {
    this.checkInterval = 30000; // Verificar a cada 30 segundos
    this.intervalId = null;
    this.isChecking = false;
  }

  // Iniciar verificação automática
  start() {
    console.log('[SESSION] Iniciando verificação automática de sessão');
    
    // Verificar imediatamente
    this.check();
    
    // Verificar periodicamente
    this.intervalId = setInterval(() => {
      this.check();
    }, this.checkInterval);
  }

  // Parar verificação
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[SESSION] Verificação de sessão parada');
    }
  }

  // Verificar status da sessão
  async check() {
    if (this.isChecking) return;
    
    this.isChecking = true;
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('[SESSION] Token não encontrado');
        this.handleDisconnected('Sessão não encontrada');
        return;
      }

      const response = await fetch('/api/auth/session-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.disconnected || data.error === 'session_terminated') {
          console.log('[SESSION] Sessão foi desconectada');
          this.handleDisconnected(data.message || 'Você foi desconectado');
        } else {
          console.error('[SESSION] Erro ao verificar:', data);
        }
      } else {
        // Sessão ativa - tudo ok
        console.log('[SESSION] Sessão ativa ✓');
      }
    } catch (error) {
      console.error('[SESSION] Erro na verificação:', error);
      // Não desconectar em caso de erro de rede
    } finally {
      this.isChecking = false;
    }
  }

  // Tratar desconexão
  handleDisconnected(message) {
    console.log('[SESSION] Processando desconexão:', message);
    
    // Parar verificação
    this.stop();
    
    // Mostrar modal de desconexão
    this.showDisconnectModal(message);
    
    // Limpar dados locais
    localStorage.removeItem('token');
    
    // Redirecionar após 3 segundos
    setTimeout(() => {
      window.location.href = '/auth.html';
    }, 3000);
  }

  // Mostrar modal de desconexão
  showDisconnectModal(message) {
    // Remover modal existente (se houver)
    const existingModal = document.getElementById('disconnect-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'disconnect-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease-in;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        padding: 40px;
        border-radius: 15px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        animation: slideUp 0.3s ease-out;
      ">
        <div style="
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #ff5252, #ff1744);
          border-radius: 50%;
          margin: 0 auto 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(255, 82, 82, 0.3);
        ">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        
        <h2 style="
          color: #333;
          margin: 0 0 15px 0;
          font-size: 26px;
          font-weight: 600;
        ">⚠️ Sessão Desconectada</h2>
        
        <p style="
          color: #666;
          margin: 0 0 25px 0;
          font-size: 16px;
          line-height: 1.6;
        ">${message || 'Você foi desconectado. Outro dispositivo fez login com esta conta.'}</p>
        
        <div style="
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        ">
          <p style="
            color: #999;
            font-size: 14px;
            margin: 0;
          ">Redirecionando para login em <span id="countdown">3</span> segundos...</p>
        </div>
        
        <button onclick="window.location.href='/auth.html'" style="
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          border: none;
          padding: 12px 30px;
          font-size: 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          Fazer Login Agora
        </button>
      </div>
      
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      </style>
    `;

    document.body.appendChild(modal);
    
    // Countdown
    let countdown = 3;
    const countdownElement = modal.querySelector('#countdown');
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdownElement) {
        countdownElement.textContent = countdown;
      }
      if (countdown <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);
  }
}

// Instância global
const sessionChecker = new SessionChecker();

// Auto-iniciar se tiver token
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('[SESSION] Token encontrado, iniciando verificação');
      sessionChecker.start();
    }
  });
  
  // Parar ao sair da página
  window.addEventListener('beforeunload', () => {
    sessionChecker.stop();
  });
}

// Exportar para uso em outros scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionChecker;
}