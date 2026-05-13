const express = require('express');
const router = express.Router();
const { createPreference, handleWebhook, verifyPayment, getUserOrders, getReceipt } = require('../controllers/ordersController');

router.get('/', getUserOrders);
router.post('/', createPreference);
router.post('/webhook', handleWebhook);
router.get('/verify', verifyPayment);
router.get('/:id/receipt', getReceipt);

module.exports = router;
