const express = require('express');
const { requireAdmin } = require('../middleware/requireAuth');
const {
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
} = require('../controllers/adminOrdersController');

const router = express.Router();

router.use(requireAdmin);

router.get('/', getAllOrders);
router.get('/stats', getOrderStats);
router.patch('/:id/status', updateOrderStatus);

module.exports = router;
