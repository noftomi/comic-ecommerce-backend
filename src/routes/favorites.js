const express = require('express');
const router = express.Router();
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoritesController');
const { requireAuth } = require('../middleware/requireAuth');

router.get('/', requireAuth, getFavorites);
router.post('/:comicId', requireAuth, addFavorite);
router.delete('/:comicId', requireAuth, removeFavorite);

module.exports = router;