// ============================================
// PAYMENT SERVICE - ASAAS
// Sistema de pagamento completo usando Asaas
// ============================================

const axios = require('axios');

// Configuração do Asaas
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || 'sandbox';

// URL da API (sandbox ou produção)
const API_URL = ASAAS_ENVIRONMENT === 'sandbox' 
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3';

// Validar configuração
if (!ASAAS_API_KEY || ASAAS_API_KEY.includes('sua-chave')) {
  console.warn('⚠️  AVISO: Configure o ASAAS_API_KEY no arquivo .env');
  console.warn('   Obtenha em: https://www.asaas.com/configuracoes/api');
} else {
  console.log(`✅ Asaas configurado em modo: ${ASAAS_ENVIRONMENT.toUpperCase()}`);
  console.log(`🔗 API URL: ${API_URL}`);
}

// Cliente HTTP configurado
const asaasClient = axios.create({
  baseURL: API_URL,
  headers: {
    'access_token': ASAAS_API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// ============================================
// CRIAR/BUSCAR CLIENTE
// ============================================
async function getOrCreateCustomer(userEmail, userName, userId) {
  try {
    console.log(`🔍 Buscando/Criando cliente: ${userEmail}`);
    
    // CPF de teste para sandbox
    const cpfTeste = ASAAS_ENVIRONMENT === 'sandbox' ? '24971563792' : '';
    
    const searchResponse = await asaasClient.get('/customers', {
      params: { email: userEmail }
    });

    if (searchResponse.data.data && searchResponse.data.data.length > 0) {
      const existingCustomer = searchResponse.data.data[0];
      console.log('✅ Cliente já existe:', existingCustomer.id);
      
      // ⭐ FIX: Atualizar cliente com CPF se não tiver
      if (!existingCustomer.cpfCnpj && cpfTeste) {
        console.log('🔄 Atualizando cliente com CPF...');
        
        try {
          const updateResponse = await asaasClient.put(`/customers/${existingCustomer.id}`, {
            cpfCnpj: cpfTeste
          });
          
          console.log('✅ Cliente atualizado com CPF!');
          return updateResponse.data;
        } catch (updateError) {
          console.error('⚠️ Erro ao atualizar cliente:', updateError.response?.data || updateError.message);
          // Continuar mesmo se falhar a atualização
        }
      }
      
      return existingCustomer;
    }

    const customerData = {
      name: userName,
      email: userEmail,
      cpfCnpj: cpfTeste,
      externalReference: `user_${userId}`,
      notificationDisabled: false
    };

    const createResponse = await asaasClient.post('/customers', customerData);
    console.log('✅ Novo cliente criado:', createResponse.data.id);
    
    return createResponse.data;
  } catch (error) {
    console.error('❌ Erro ao criar/buscar cliente:', error.response?.data || error.message);
    throw new Error('Erro ao criar cliente no Asaas');
  }
}

// ============================================
// CRIAR COBRANÇA (GENÉRICA - Cartão/Boleto)
// ============================================
async function createPayment(userId, userEmail, userName, planType, amount) {
  try {
    console.log(`💳 Criando cobrança: ${userEmail} - ${planType} - R$ ${amount}`);
    
    const customer = await getOrCreateCustomer(userEmail, userName, userId);
    const months = planType === 'yearly' ? 12 : 1;
    const description = planType === 'yearly' 
      ? 'WhatsApp Sender PRO - Plano Anual'
      : 'WhatsApp Sender PRO - Plano Mensal';

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const paymentData = {
      customer: customer.id,
      billingType: 'UNDEFINED',
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
    throw new Error('Erro ao criar cobrança no Asaas');
  }
}

// ============================================
// CRIAR COBRANÇA PIX (ESPECÍFICA)
// ============================================
async function createPixCharge(userId, userEmail, userName, planType, amount) {
  try {
    console.log(`🔐 Criando cobrança PIX: ${userEmail} - ${planType} - R$ ${amount}`);
    
    const customer = await getOrCreateCustomer(userEmail, userName, userId);
    const months = planType === 'yearly' ? 12 : 1;
    const description = planType === 'yearly' 
      ? 'WhatsApp Sender PRO - Plano Anual'
      : 'WhatsApp Sender PRO - Plano Mensal';

    const dueDate = new Date();
    const dueDateStr = dueDate.toISOString().split('T')[0];
    // ⭐ PIX deve vencer HOJE para gerar QR Code no Sandbox
    console.log(`📅 Data de vencimento PIX: ${dueDateStr} (HOJE)`);

    const paymentData = {
      customer: customer.id,
      billingType: 'PIX', // ⭐ IMPORTANTE: PIX específico
      value: amount,
      dueDate: dueDateStr,
      description: description,
      externalReference: `${userId}_${planType}_${months}`,
      postalService: false
    };

    const response = await asaasClient.post('/payments', paymentData);
    console.log('✅ Cobrança PIX criada:', response.data.id);

    return {
      id: response.data.id,
      invoiceUrl: response.data.invoiceUrl,
      status: response.data.status,
      value: response.data.value,
      dueDate: response.data.dueDate
    };
  } catch (error) {
    console.error('❌ Erro ao criar cobrança PIX:', error.response?.data || error.message);
    throw new Error('Erro ao criar cobrança PIX no Asaas');
  }
}

// ============================================
// GERAR QR CODE PIX
// ============================================
async function generatePixQRCode(paymentId) {
  try {
    console.log(`🔑 Gerando QR Code PIX para: ${paymentId}`);
    
    // ⭐ DEBUG: Verificar status da cobrança primeiro
    const checkPayment = await asaasClient.get(`/payments/${paymentId}`);
    console.log(`📊 Status da cobrança: ${checkPayment.data.status}`);
    console.log(`📊 Billing Type: ${checkPayment.data.billingType}`);
    console.log(`📊 Dados completos:`, JSON.stringify(checkPayment.data, null, 2));
    
    const response = await asaasClient.get(`/payments/${paymentId}/pixQrCode`);
    console.log('✅ QR Code PIX gerado');

    return {
      qrCodeUrl: response.data.encodedImage,
      payload: response.data.payload,
      expirationDate: response.data.expirationDate
    };
  } catch (error) {
    console.error('❌ Erro ao gerar PIX:', error.response?.data || error.message);
    console.error('📊 Status HTTP:', error.response?.status);
    console.error('📊 Headers:', error.response?.headers);
    throw new Error('Erro ao gerar QR Code PIX');
  }
}

// ============================================
// CRIAR PAGAMENTO PIX COMPLETO
// ============================================
async function createPixPayment(userId, userEmail, userName, planType, amount) {
  try {
    console.log(`🔑 Criando pagamento PIX completo para: ${userEmail}`);
    
    // ⭐ Usar função específica para PIX
    const payment = await createPixCharge(userId, userEmail, userName, planType, amount);
    const pixData = await generatePixQRCode(payment.id);

    return {
      id: payment.id,
      paymentId: payment.id,
      qrCode: pixData.payload,
      qrCodeBase64: pixData.qrCodeUrl,
      invoiceUrl: payment.invoiceUrl,
      status: payment.status,
      value: payment.value,
      expirationDate: pixData.expirationDate,
      dueDate: payment.dueDate
    };
  } catch (error) {
    console.error('❌ Erro ao criar pagamento PIX:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// CRIAR LINK DE PAGAMENTO (CARTÃO)
// ============================================
async function createPaymentPreference(userId, userEmail, userName, planType, months) {
  try {
    console.log(`💳 Criando link de pagamento (Cartão) para: ${userEmail}`);
    const amount = planType === 'yearly' ? 999.00 : 99.90;
    const payment = await createPayment(userId, userEmail, userName, planType, amount);

    return {
      id: payment.id,
      init_point: payment.invoiceUrl,
      sandbox_init_point: payment.invoiceUrl,
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
    console.log(`🔍 Verificando status do pagamento: ${paymentId}`);
    const response = await asaasClient.get(`/payments/${paymentId}`);
    const payment = response.data;

    return {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status,
      transaction_amount: payment.value,
      external_reference: payment.externalReference,
      netValue: payment.netValue,
      confirmedDate: payment.confirmedDate,
      paymentDate: payment.paymentDate,
      billingType: payment.billingType
    };
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error.response?.data || error.message);
    throw new Error('Erro ao verificar status do pagamento');
  }
}

// ============================================
// PROCESSAR WEBHOOK DO ASAAS
// ============================================
async function processWebhook(webhookData) {
  try {
    console.log('📥 Webhook recebido do Asaas');
    console.log('Event:', webhookData.event);
    console.log('Payment ID:', webhookData.payment?.id);

    if (webhookData.event === 'PAYMENT_CONFIRMED' || 
        webhookData.event === 'PAYMENT_RECEIVED') {
      
      const paymentId = webhookData.payment.id;
      const paymentInfo = await checkPaymentStatus(paymentId);

      if (paymentInfo.status === 'RECEIVED' || 
          paymentInfo.status === 'CONFIRMED') {
        
        const [userId, planType, months] = paymentInfo.external_reference.split('_');

        console.log(`✅ Pagamento aprovado!`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Plano: ${planType}`);
        console.log(`   Meses: ${months}`);

        return {
          approved: true,
          userId: parseInt(userId),
          months: parseInt(months),
          amount: paymentInfo.transaction_amount,
          planType: planType
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
  createPaymentPreference,
  createPixPayment,
  checkPaymentStatus,
  processWebhook,
  getOrCreateCustomer
};