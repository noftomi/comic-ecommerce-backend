const express = require('express');
const router = express.Router();
const { requireRoles } = require('../middleware/requireAuth');
const {
  getManagedComics,
  createManagedComic,
  updateManagedComic,
  deleteManagedComic,
} = require('../controllers/managedComicsController');

router.use(requireRoles(['ADMIN', 'SELLER']));

router.get('/', getManagedComics);
router.post('/', createManagedComic);
router.patch('/:id', updateManagedComic);
router.delete('/:id', deleteManagedComic);

module.exports = router;
