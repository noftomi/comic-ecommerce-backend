const express = require('express');
const router = express.Router();
const { getCart, addItem, updateItem, removeItem } = require('../controllers/cartController');

router.get('/', getCart);
router.post('/', addItem);
router.patch('/:comicId', updateItem);
router.delete('/:comicId', removeItem);

module.exports = router;
