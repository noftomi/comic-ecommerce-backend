const express = require('express');
const router = express.Router({ mergeParams: true });
const { getReviews, createReview, deleteReview } = require('../controllers/reviewsController');
const { requireAuth } = require('../middleware/requireAuth');

router.get('/', getReviews);
router.post('/', requireAuth, createReview);
router.delete('/:id', requireAuth, deleteReview);

module.exports = router;