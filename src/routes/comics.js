const express = require('express');
const router = express.Router();
const { getAll, getById, getRelated } = require('../controllers/comicsController');

router.get('/', getAll);
router.get('/:id/related', getRelated);
router.get('/:id', getById);

module.exports = router;
