const express = require('express');
const router = express.Router();
const { requireRoles } = require('../middleware/requireAuth');
const { getSellerOrders } = require('../controllers/sellerOrdersController');

router.use(requireRoles(['SELLER']));
router.get('/', getSellerOrders);

module.exports = router;
