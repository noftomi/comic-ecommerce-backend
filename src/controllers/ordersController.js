const crypto = require('crypto');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const PDFDocument = require('pdfkit');
const { getPrisma } = require('../lib/prisma');
const { triggerOrderInvoice } = require('../lib/n8n');

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

function validateMercadoPagoSignature(req) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  const dataId = req.query['data.id'] || req.body?.data?.id;

  if (!secret) return true;
  if (!xSignature || !xRequestId || !dataId) return false;

  let ts;
  let v1;
  for (const part of xSignature.split(',')) {
    const [key, value] = part.trim().split('=');
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return hash === v1;
}

const toOrderResponse = (order) => ({
  ...order,
  total: order.total?.toNumber ? order.total.toNumber() : Number(order.total),
  items: order.items.map((item) => ({
    ...item,
    price: item.price?.toNumber ? item.price.toNumber() : Number(item.price),
  })),
});

const createPreference = async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });

  try {
    const user = await getPrisma().user.findUnique({ where: { id: req.session.userId } });

    const cartItems = await getPrisma().cartItem.findMany({
      where: { userId: req.session.userId },
      include: { comic: true },
    });

    if (cartItems.length === 0) return res.status(400).json({ error: 'El carrito está vacío' });

    const total = cartItems.reduce((sum, item) => sum + Number(item.comic.price) * item.quantity, 0);

    const order = await getPrisma().order.create({
      data: {
        userId: req.session.userId,
        total,
        status: 'PENDING',
        items: {
          create: cartItems.map((item) => ({
            comicId: item.comicId,
            quantity: item.quantity,
            price: item.comic.price,
          })),
        },
      },
      include: { items: { include: { comic: true } } },
    });

    // Modo desarrollo: simula el pago sin llamar a MercadoPago
    if (process.env.MP_DEV_BYPASS === 'true') {
      await getPrisma().order.update({ where: { id: order.id }, data: { status: 'PAID' } });
      await getPrisma().cartItem.deleteMany({ where: { userId: req.session.userId } });
      await triggerOrderInvoice(
        user.email, user.name, order.id,
        order.items.map((i) => ({ title: i.comic.title, quantity: i.quantity, price: Number(i.price) })),
        Number(order.total)
      );
      return res.json({
        preferenceId: 'dev-bypass',
        initPoint: `${process.env.FRONTEND_URL}/orders?status=success`,
      });
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: cartItems.map((item) => ({
          id: String(item.comicId),
          title: item.comic.title,
          quantity: item.quantity,
          unit_price: Number(item.comic.price),
          currency_id: 'ARS',
        })),
        payer: {
          email: process.env.NODE_ENV === 'production' ? user.email : 'test_user_buyer@testuser.com',
          name: user.name,
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/orders?status=success`,
          failure: `${process.env.FRONTEND_URL}/orders?status=failure`,
          pending: `${process.env.FRONTEND_URL}/orders?status=pending`,
        },
        ...(process.env.NODE_ENV === 'production' && { auto_return: 'approved' }),
        external_reference: String(order.id),
        notification_url: `${process.env.BACKEND_URL}/api/orders/webhook`,
      }),
    });

    if (!mpRes.ok) {
      const errBody = await mpRes.text();
      throw new Error(`MercadoPago ${mpRes.status}: ${errBody}`);
    }

    const mpResponse = await mpRes.json();
    res.json({ preferenceId: mpResponse.id, initPoint: mpResponse.init_point, orderId: order.id });
  } catch (error) {
    console.error('createPreference error:', error);
    res.status(500).json({ error: 'Error al crear la preferencia de pago' });
  }
};

const handleWebhook = async (req, res) => {
  if (!validateMercadoPagoSignature(req)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    const { type, data } = req.body;

    if (type !== 'payment') return res.sendStatus(200);

    const payment = new Payment(client);
    const paymentData = await payment.get({ id: data.id });

    if (paymentData.status !== 'approved') return res.sendStatus(200);

    const orderId = parseInt(paymentData.external_reference);

    const order = await getPrisma().order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
      include: {
        user: true,
        items: { include: { comic: true } },
      },
    });

    await getPrisma().cartItem.deleteMany({ where: { userId: order.userId } });

    await triggerOrderInvoice(
      order.user.email,
      order.user.name,
      order.id,
      order.items.map((i) => ({ title: i.comic.title, quantity: i.quantity, price: Number(i.price) })),
      Number(order.total)
    );

    res.sendStatus(200);
  } catch (error) {
    console.error('handleWebhook error:', error);
    res.sendStatus(500);
  }
};

const verifyPayment = async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });

  try {
    const { payment_id, order_id } = req.query;
    if (!payment_id && !order_id) return res.status(400).json({ error: 'payment_id u order_id requerido' });

    const payment = new Payment(client);
    let paymentData;

    if (payment_id) {
      paymentData = await payment.get({ id: payment_id });
    } else {
      const results = await payment.search({
        options: { external_reference: order_id, sort: 'date_created', criteria: 'desc' },
      });
      console.log('MP search results:', JSON.stringify(results?.results?.map((p) => ({ id: p.id, status: p.status })), null, 2));
      const approved = results.results?.find((p) => p.status === 'approved');
      if (!approved) {
        const rejected = results.results?.find((p) => p.status === 'rejected');
        if (rejected) {
          return res.json({ verified: false, status: 'rejected', statusDetail: rejected.status_detail ?? null });
        }
        return res.json({ verified: false, status: 'not_found' });
      }
      paymentData = approved;
    }

    if (paymentData.status !== 'approved') {
      return res.json({ verified: false, status: paymentData.status, statusDetail: paymentData.status_detail ?? null });
    }

    const orderId = parseInt(paymentData.external_reference);

    const existing = await getPrisma().order.findUnique({ where: { id: orderId } });
    if (existing?.status === 'PAID') return res.json({ verified: true, orderId });

    const order = await getPrisma().order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
      include: { user: true, items: { include: { comic: true } } },
    });

    await getPrisma().cartItem.deleteMany({ where: { userId: order.userId } });

    await triggerOrderInvoice(
      order.user.email, order.user.name, order.id,
      order.items.map((i) => ({ title: i.comic.title, quantity: i.quantity, price: Number(i.price) })),
      Number(order.total)
    );

    res.json({ verified: true, orderId });
  } catch (error) {
    console.error('verifyPayment error:', error);
    res.status(500).json({ error: 'Error al verificar el pago' });
  }
};

const getUserOrders = async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const orders = await getPrisma().order.findMany({
      where: { userId: req.session.userId },
      include: {
        items: {
          include: {
            comic: { select: { id: true, title: true, imageUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders.map(toOrderResponse));
  } catch (error) {
    console.error('getUserOrders error:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

const getReceipt = async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });

  try {
    const orderId = parseInt(req.params.id);
    const order = await getPrisma().order.findUnique({
      where: { id: orderId },
      include: { items: { include: { comic: true } }, user: true },
    });

    if (!order || order.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (order.status !== 'PAID') {
      return res.status(400).json({ error: 'La orden no está pagada' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `comprobante-CC-${String(orderId).padStart(5, '0')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // — Header —
    doc.rect(50, 50, 495, 60).fill('#930000');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22)
      .text('COMICS CORP', 50, 65, { align: 'center', width: 495 });
    doc.fillColor('#ffffff').font('Helvetica').fontSize(10)
      .text('Comprobante de compra', 50, 90, { align: 'center', width: 495 });

    doc.moveDown(3);

    // — Datos de la orden —
    doc.fillColor('#1e1c0e').font('Helvetica-Bold').fontSize(13)
      .text(`ORDEN #CC-${String(orderId).padStart(5, '0')}`, { continued: true })
      .font('Helvetica').fillColor('#5d3f3a').fontSize(11)
      .text(`   ${new Date(order.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });

    doc.moveDown(0.5);
    doc.fillColor('#1e1c0e').font('Helvetica').fontSize(11)
      .text(`Cliente: ${order.user.name}`)
      .text(`Email:   ${order.user.email}`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(2).strokeColor('#1e1c0e').stroke();
    doc.moveDown(0.5);

    // — Items —
    doc.fillColor('#1e1c0e').font('Helvetica-Bold').fontSize(12).text('PRODUCTOS');
    doc.moveDown(0.5);

    order.items.forEach((item) => {
      const subtotal = (Number(item.price) * item.quantity).toFixed(2);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e1c0e')
        .text(`• ${item.comic.title}`, { continued: true });
      if (item.quantity > 1) {
        doc.font('Helvetica').fillColor('#5d3f3a').text(` × ${item.quantity}`, { continued: true });
      }
      doc.font('Helvetica-Bold').fillColor('#930000')
        .text(`$${subtotal}`, { align: 'right' });
      doc.moveDown(0.3);
    });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(2).strokeColor('#1e1c0e').stroke();
    doc.moveDown(0.5);

    // — Total —
    doc.font('Helvetica-Bold').fontSize(15).fillColor('#1e1c0e')
      .text('TOTAL PAGADO', { continued: true })
      .fillColor('#930000').text(`  $${Number(order.total).toFixed(2)}`, { align: 'right' });

    doc.moveDown(2);

    // — Footer —
    doc.font('Helvetica').fontSize(9).fillColor('#926f69')
      .text('© Comics Corp — Todos los derechos reservados', { align: 'center' })
      .text('Este comprobante es válido como constancia de pago.', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('getReceipt error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar comprobante' });
  }
};

module.exports = { createPreference, handleWebhook, verifyPayment, getUserOrders, getReceipt };
