const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireAuth');
const { updateMe } = require('../controllers/usersController');

router.patch('/me', requireAuth, updateMe);

module.exports = router;
