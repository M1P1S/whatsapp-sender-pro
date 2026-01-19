// Normaliza números de telefone para formato padrão brasileiro: 5561999999999
function normalizePhone(phone, userDDD = '61') {
  if (!phone) return null;
  
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  
  // Identifica o formato
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    // Já está no formato completo: 5561999999999
    return cleaned;
  } else if (cleaned.length === 11) {
    // Formato: 61999999999 (DDD + número)
    return '55' + cleaned;
  } else if (cleaned.length === 10) {
    // Formato: 6199999999 (DDD + número sem 9º dígito)
    const ddd = cleaned.substring(0, 2);
    const number = cleaned.substring(2);
    return '55' + ddd + '9' + number;
  } else if (cleaned.length === 9) {
    // Só o número com 9º dígito: 999999999
    return '55' + userDDD + cleaned;
  } else if (cleaned.length === 8) {
    // Só o número sem 9º dígito: 99999999
    return '55' + userDDD + '9' + cleaned;
  }
  
  return null; // Formato inválido
}

function validateBrazilianPhone(phone) {
  if (!phone || phone.length !== 13) return false;
  if (!phone.startsWith('55')) return false;
  
  const ddd = phone.substring(2, 4);
  const validDDDs = ['11','12','13','14','15','16','17','18','19','21','22','24','27','28','31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49','51','53','54','55','61','62','63','64','65','66','67','68','69','71','73','74','75','77','79','81','82','83','84','85','86','87','88','89','91','92','93','94','95','96','97','98','99'];
  
  return validDDDs.includes(ddd);
}

function processContactList(text, userDDD = '61') {
  const lines = text.split(/\r?\n/);
  const results = {
    valid: [],
    invalid: [],
    duplicates: 0
  };
  
  const seen = new Set();
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const normalized = normalizePhone(trimmed, userDDD);
    
    if (normalized && validateBrazilianPhone(normalized)) {
      if (seen.has(normalized)) {
        results.duplicates++;
      } else {
        seen.add(normalized);
        results.valid.push(normalized);
      }
    } else {
      results.invalid.push(trimmed);
    }
  }
  
  return results;
}

module.exports = {
  normalizePhone,
  validateBrazilianPhone,
  processContactList
};
