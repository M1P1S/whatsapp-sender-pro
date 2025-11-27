const axios = require('axios');

// Configuração
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || 'sandbox';

// URL da API
const API_URL = ASAAS_ENVIRONMENT === 'sandbox' 
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3';

// Verificar configuração
if (!ASAAS_API_KEY || ASAAS_API_KEY.includes('sua-chave')) {
  console.warn('⚠️  AVISO: Configure o ASAAS_API_KEY no arquivo .env');
  console.warn('   Obtenha em: https://www.asaas.com/api/keys');
} else {
  console.log(`✅ Asaas configurado em modo: ${ASAAS_ENVIRONMENT.toUpperCase()}`);
}

// Cliente HTTP
const asaasClient = axios.create({
  baseURL: API_URL,
  headers: {
    'access_token': ASAAS_API_KEY,
    'Content-Type': 'application/json'
  }
});

// ============================================
// CRIAR/BUSCAR CLIENTE
// ============================================
async function getOrCreateCustomer(userEmail, userName, userId) {
  try {
    // Verificar se cliente já existe
    const searchResponse = await asaasClient.get('/customers', {
      params: { email: userEmail }
    });

    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      console.log('✅ Cliente já existe:', searchResponse.data.data[0].id);
      return searchResponse.data.data[0];
    }

    // Criar novo cliente
    const customerData = {
      name: userName,
      email: userEmail,
      cpfCnpj: '', // Opcional
      externalReference: `user_${userId}`, // Referência interna
      notificationDisabled: false
    };

    const createResponse = await asaasClient.post('/customers', customerData);
    console.log('✅ Novo cliente criado:', createResponse.data.id);
    
    return createResponse.data;
  } catch (error) {
    console.error('❌ Erro ao criar/buscar cliente:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// CRIAR COBRANÇA (Cartão ou PIX)
// ============================================
async function createPayment(userId, userEmail, userName, planType, amount) {
  try {
    // Criar/buscar cliente
    const customer = await getOrCreateCustomer(userEmail, userName, userId);

    const months = planType === 'yearly' ? 12 : 1;
    const description = planType === 'yearly' 
      ? 'WhatsApp Sender PRO - Plano Anual'
      : 'WhatsApp Sender PRO - Plano Mensal';

    // Calcular data de vencimento (3 dias)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const paymentData = {
      customer: customer.id,
      billingType: 'UNDEFINED', // Permite qualquer forma de pagamento
      value: amount,
      dueDate: dueDateStr,
      description: description,
      externalReference: `${userId}_${planType}_${months}`,
      postalService: false
    };

    const response = await asaasClient.post('/payments', paymentData);
    
    console.log('✅ Cobrança criada:', response.data.id);

    return {
      id: response.data.id,
      invoiceUrl: response.data.invoiceUrl,
      bankSlipUrl: response.data.bankSlipUrl,
      invoiceNumber: response.data.invoiceNumber,
      status: response.data.status,
      value: response.data.value,
      dueDate: response.data.dueDate
    };
  } catch (error) {
    console.error('❌ Erro ao criar cobrança:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// GERAR PIX
// ============================================
async function generatePixQRCode(paymentId) {
  try {
    const response = await asaasClient.get(`/payments/${paymentId}/pixQrCode`);
    
    console.log('✅ QR Code PIX gerado');

    return {
      qrCodeUrl: response.data.encodedImage, // Base64
      payload: response.data.payload, // Código copia e cola
      expirationDate: response.data.expirationDate
    };
  } catch (error) {
    console.error('❌ Erro ao gerar PIX:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// CRIAR PAGAMENTO COM PIX
// ============================================
async function createPixPayment(userId, userEmail, userName, planType, amount) {
  try {
    // Criar cobrança
    const payment = await createPayment(userId, userEmail, userName, planType, amount);
    
    // Gerar QR Code PIX
    const pixData = await generatePixQRCode(payment.id);

    return {
      paymentId: payment.id,
      qrCode: pixData.payload,
      qrCodeBase64: pixData.qrCodeUrl,
      invoiceUrl: payment.invoiceUrl,
      status: payment.status,
      value: payment.value,
      expirationDate: pixData.expirationDate
    };
  } catch (error) {
    console.error('❌ Erro ao criar pagamento PIX:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// CRIAR LINK DE PAGAMENTO (Cartão)
// ============================================
async function createPaymentLink(userId, userEmail, userName, planType, amount) {
  try {
    // Criar cobrança
    const payment = await createPayment(userId, userEmail, userName, planType, amount);

    // Link de pagamento (cartão)
    const paymentLink = payment.invoiceUrl;

    return {
      paymentId: payment.id,
      paymentLink: paymentLink,
      invoiceUrl: payment.invoiceUrl,
      status: payment.status,
      value: payment.value
    };
  } catch (error) {
    console.error('❌ Erro ao criar link de pagamento:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// VERIFICAR STATUS DO PAGAMENTO
// ============================================
async function checkPaymentStatus(paymentId) {
  try {
    const response = await asaasClient.get(`/payments/${paymentId}`);
    
    const payment = response.data;

    return {
      id: payment.id,
      status: payment.status, // PENDING, RECEIVED, CONFIRMED, OVERDUE
      value: payment.value,
      netValue: payment.netValue,
      confirmedDate: payment.confirmedDate,
      paymentDate: payment.paymentDate,
      externalReference: payment.externalReference,
      billingType: payment.billingType
    };
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// PROCESSAR WEBHOOK
// ============================================
async function processWebhook(webhookData) {
  try {
    console.log('📥 Webhook recebido do Asaas');
    console.log('Event:', webhookData.event);

    // Eventos possíveis:
    // PAYMENT_CREATED, PAYMENT_UPDATED, PAYMENT_CONFIRMED, 
    // PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_DELETED

    if (webhookData.event === 'PAYMENT_CONFIRMED' || webhookData.event === 'PAYMENT_RECEIVED') {
      const paymentId = webhookData.payment.id;
      const paymentInfo = await checkPaymentStatus(paymentId);

      if (paymentInfo.status === 'RECEIVED' || paymentInfo.status === 'CONFIRMED') {
        const [userId, planType, months] = paymentInfo.externalReference.split('_');

        return {
          approved: true,
          userId: parseInt(userId),
          months: parseInt(months),
          amount: paymentInfo.value
        };
      }
    }

    return { approved: false };
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    throw error;
  }
}

module.exports = {
  createPixPayment,
  createPaymentLink,
  checkPaymentStatus,
  processWebhook,
  getOrCreateCustomer
};