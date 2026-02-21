// ============================================
// BOT ENGINE - Motor de respostas automáticas
// Recurso PREMIUM (PRO only)
// ============================================

class BotEngine {
  constructor(client) {
    this.client = client;
    this.configs = new Map(); // userId -> config
    this.rules = new Map();   // userId -> rules[]
    this.cooldowns = new Map(); // chatId -> timestamp (evitar spam)
    this.cooldownMs = 5000; // 5 segundos entre respostas
  }

  // Atualizar config de um usuário
  updateConfig(userId, config, rules) {
    if (config) {
      this.configs.set(userId, config);
    }
    if (rules) {
      this.rules.set(userId, rules);
    }
    console.log(`[BOT] Config atualizada para user ${userId} | Enabled: ${config?.enabled} | Rules: ${rules?.length || 0}`);
  }

  // Processar mensagem recebida
  async processMessage(msg) {
    try {
      // Ignorar mensagens próprias
      if (msg.fromMe) return;

      // Ignorar mensagens de grupo (por enquanto)
      if (msg.from.includes('@g.us')) return;

      // Ignorar mensagens de status
      if (msg.from === 'status@broadcast') return;

      const body = (msg.body || '').trim().toLowerCase();
      if (!body) return;

      // Verificar cooldown
      const chatId = msg.from;
      const now = Date.now();
      const lastResponse = this.cooldowns.get(chatId) || 0;
      if (now - lastResponse < this.cooldownMs) return;

      // Verificar regras de todos os usuários com bot ativo
      for (const [userId, config] of this.configs) {
        if (!config || !config.enabled) continue;

        // Verificar horário comercial
        if (!this.isWithinBusinessHours(config)) {
          // Fora do horário - enviar mensagem de ausência
          if (config.away_message) {
            await this.reply(msg, config.away_message);
            return;
          }
          continue;
        }

        // Verificar fim de semana
        const dayOfWeek = new Date().getDay();
        if ((dayOfWeek === 0 || dayOfWeek === 6) && config.weekend_message) {
          await this.reply(msg, config.weekend_message);
          return;
        }

        // Verificar regras de keyword
        const userRules = this.rules.get(userId) || [];
        for (const rule of userRules) {
          if (!rule.is_active) continue;

          const keyword = rule.keyword.toLowerCase();
          let matched = false;

          switch (rule.match_type) {
            case 'exact':
              matched = body === keyword;
              break;
            case 'starts_with':
              matched = body.startsWith(keyword);
              break;
            case 'contains':
            default:
              matched = body.includes(keyword);
              break;
          }

          if (matched) {
            console.log(`[BOT] Match: "${body}" -> keyword "${rule.keyword}"`);
            await this.reply(msg, rule.response);
            return;
          }
        }

        // Mensagem de boas-vindas (se nenhuma regra correspondeu)
        if (config.welcome_message) {
          // Só enviar welcome para primeira mensagem do contato (sem histórico recente)
          const recentlySent = this.cooldowns.get('welcome_' + chatId);
          if (!recentlySent || (now - recentlySent > 3600000)) { // 1 hora
            this.cooldowns.set('welcome_' + chatId, now);
            await this.reply(msg, config.welcome_message);
            return;
          }
        }
      }
    } catch (error) {
      console.error('[BOT] Erro ao processar mensagem:', error);
    }
  }

  // Enviar resposta
  async reply(msg, text) {
    try {
      await msg.reply(text);
      this.cooldowns.set(msg.from, Date.now());
      console.log(`[BOT] Resposta enviada para ${msg.from}: ${text.substring(0, 50)}...`);
    } catch (error) {
      console.error('[BOT] Erro ao enviar resposta:', error);
    }
  }

  // Verificar horário comercial
  isWithinBusinessHours(config) {
    const now = new Date();
    // Ajustar para BRT (UTC-3)
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const hours = brt.getUTCHours();
    const minutes = brt.getUTCMinutes();
    const currentTime = hours * 60 + minutes;

    const [startH, startM] = (config.business_hours_start || '09:00').split(':').map(Number);
    const [endH, endM] = (config.business_hours_end || '18:00').split(':').map(Number);
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    return currentTime >= startTime && currentTime <= endTime;
  }
}

module.exports = BotEngine;
