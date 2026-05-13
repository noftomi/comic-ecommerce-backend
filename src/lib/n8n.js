const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function callWebhook(path, data) {
  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) console.error(`n8n webhook "${path}" responded with ${res.status}`);
  } catch (err) {
    console.error(`n8n webhook "${path}" unreachable:`, err.message);
  }
}

const triggerEmailVerification = (email, name, token) =>
  callWebhook('verify-email', { email, name, token, verifyUrl: `${FRONTEND_URL}/verify-email?token=${token}` });

const triggerPasswordReset = (email, name, token) =>
  callWebhook('reset-password', { email, name, token, resetUrl: `${FRONTEND_URL}/reset-password?token=${token}` });

const triggerOrderInvoice = (email, name, orderId, items, total) =>
  callWebhook('order-invoice', { email, name, orderId, items, total });

module.exports = { triggerEmailVerification, triggerPasswordReset, triggerOrderInvoice };
