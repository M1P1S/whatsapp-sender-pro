const cron = require('node-cron');
const db = require('./database');

// Job que roda todo dia às 00:00
function startExpirationJob() {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[EXPIRATION JOB] Verificando planos vencidos...');
      
      const expiredUsers = await db.getExpiredUsers();
      
      if (expiredUsers.length === 0) {
        console.log('[EXPIRATION JOB] Nenhum plano vencido');
        return;
      }
      
      console.log(`[EXPIRATION JOB] ${expiredUsers.length} plano(s) vencido(s)`);
      
      for (const user of expiredUsers) {
        await db.downgradeToFree(user.id);
        console.log(`[EXPIRATION JOB] Usuário ${user.id} (${user.email}) downgrade para FREE`);
      }
      
      console.log('[EXPIRATION JOB] Verificação concluída!');
      
    } catch (error) {
      console.error('[EXPIRATION JOB] Erro:', error);
    }
  });
  
  console.log('[EXPIRATION JOB] Job iniciado - Verifica vencimentos todo dia às 00:00');
}

module.exports = { startExpirationJob };
