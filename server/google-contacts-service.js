const { google } = require('googleapis');
const db = require('./database');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getAuthUrl(userId) {
  const oauth2Client = getOAuth2Client();
  const scopes = ['https://www.googleapis.com/auth/contacts.readonly'];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId.toString(),
    prompt: 'consent'
  });
}

async function handleCallback(code, userId) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600000)).toISOString();
  
  await db.run(
    `INSERT OR REPLACE INTO google_tokens (user_id, access_token, refresh_token, expires_at, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, tokens.access_token, tokens.refresh_token || '', expiresAt]
  );
  
  return tokens;
}

async function getValidToken(userId) {
  const token = await db.get(
    'SELECT * FROM google_tokens WHERE user_id = ?',
    [userId]
  );
  
  if (!token) return null;
  
  if (new Date(token.expires_at) < new Date() && token.refresh_token) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: token.refresh_token });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    await db.run(
      `UPDATE google_tokens SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [credentials.access_token, new Date(credentials.expiry_date).toISOString(), userId]
    );
    
    return credentials.access_token;
  }
  
  return token.access_token;
}

async function syncContacts(userId) {
  const accessToken = await getValidToken(userId);
  if (!accessToken) throw new Error('Token não encontrado ou inválido');
  
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  const people = google.people({ version: 'v1', auth: oauth2Client });
  
  let allContacts = [];
  let pageToken = null;
  let totalFetched = 0;
  
  do {
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      pageToken: pageToken,
      personFields: 'names,phoneNumbers,emailAddresses'
    });
    
    const contacts = response.data.connections || [];
    allContacts = allContacts.concat(contacts);
    totalFetched += contacts.length;
    pageToken = response.data.nextPageToken;
    
    console.log(`[Google Contacts] Buscados ${totalFetched} contatos...`);
  } while (pageToken);
  
  console.log(`[Google Contacts] Total buscado: ${totalFetched}`);
  console.log('[Google Contacts] Removendo contatos anteriores do Google...');
  
  await db.run('DELETE FROM contacts WHERE user_id = ? AND source = ?', [userId, 'google']);
  
  let imported = 0;
  const uniquePhones = new Set();
  
  for (const contact of allContacts) {
    const name = contact.names?.[0]?.displayName || 'Sem nome';
    const phones = contact.phoneNumbers || [];
    const email = contact.emails?.[0]?.value || null;
    
    for (const phoneObj of phones) {
      const phone = phoneObj.value;
      const normalized = require('./phone-normalizer').normalizePhone(phone);
      
      if (normalized && require('./phone-normalizer').validateBrazilianPhone(normalized)) {
        if (!uniquePhones.has(normalized)) {
          uniquePhones.add(normalized);
          await db.run(
            `INSERT INTO contacts (user_id, name, phone, email, source, google_contact_id, created_at)
             VALUES (?, ?, ?, ?, 'google', ?, CURRENT_TIMESTAMP)`,
            [userId, name, normalized, email, contact.resourceName]
          );
          imported++;
        }
      }
    }
  }
  
  console.log(`[Google Contacts] Importados: ${imported} números únicos`);
  
  const stats = await getContactStats(userId);
  console.log(`[Google Contacts] === ESTATÍSTICAS FINAIS ===`);
  console.log(`[Google Contacts] Total no banco: ${stats.total}`);
  console.log(`[Google Contacts] Do Google: ${stats.fromGoogle}`);
  console.log(`[Google Contacts] Números únicos: ${stats.uniquePhones}`);
  console.log(`[Google Contacts] Duplicatas: ${stats.duplicates}`);

  return { total: totalFetched, imported };
}

module.exports = {
  getContactStats,
  getAuthUrl,
  handleCallback,
  syncContacts,
  getValidToken
};

// Função para debug - mostra estatísticas
async function getContactStats(userId) {
  const total = await db.get('SELECT COUNT(*) as count FROM contacts WHERE user_id = ?', [userId]);
  const google = await db.get('SELECT COUNT(*) as count FROM contacts WHERE user_id = ? AND source = "google"', [userId]);
  const unique = await db.get('SELECT COUNT(DISTINCT phone) as count FROM contacts WHERE user_id = ?', [userId]);
  
  return {
    total: total.count,
    fromGoogle: google.count,
    uniquePhones: unique.count,
    duplicates: total.count - unique.count
  };
}
