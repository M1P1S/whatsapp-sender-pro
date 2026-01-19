// Função de randomização inteligente com distribuição gaussiana
function getSmartRandomDelay(mode = 'NORMAL') {
  const modes = {
    SEGURO: { min: 60000, max: 120000 },   // 60-120s
    NORMAL: { min: 30000, max: 60000 },    // 30-60s
    TURBO: { min: 15000, max: 30000 }      // 15-30s
  };
  
  const range = modes[mode] || modes.NORMAL;
  
  // Distribuição gaussiana (Box-Muller transform)
  const u1 = Math.random();
  const u2 = Math.random();
  const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // 20% de chance de "spike" (pausa maior para parecer mais humano)
  const spike = Math.random() < 0.2 ? 1.5 : 1;
  
  // Calcular delay com distribuição gaussiana
  const mean = (range.min + range.max) / 2;
  const stdDev = (range.max - range.min) / 6; // 99.7% dos valores entre min e max
  
  let delay = mean + (gaussian * stdDev * spike);
  
  // Garantir que está dentro dos limites
  delay = Math.max(range.min, Math.min(range.max, delay));
  
  return Math.floor(delay);
}

// Converter delay para formato legível
function formatDelay(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${seconds}s`;
}

// Informações sobre o modo
function getModeInfo(mode) {
  const info = {
    SEGURO: {
      name: '🐢 SEGURO',
      interval: '60-120s',
      risk: 'Muito baixo',
      msgsPerHour: '~40',
      description: 'Máxima proteção, recomendado para contas novas'
    },
    NORMAL: {
      name: '⚖️ NORMAL',
      interval: '30-60s',
      risk: 'Baixo',
      msgsPerHour: '~80',
      description: 'Equilibrado entre velocidade e segurança'
    },
    TURBO: {
      name: '🚀 TURBO',
      interval: '15-30s',
      risk: 'Alto ⚠️',
      msgsPerHour: '~150',
      description: 'Maior velocidade, use com cautela'
    }
  };
  
  return info[mode] || info.NORMAL;
}

module.exports = {
  getSmartRandomDelay,
  formatDelay,
  getModeInfo
};
