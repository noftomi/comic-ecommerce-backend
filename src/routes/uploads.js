const express = require('express');
const multer = require('multer');
const { requireRoles } = require('../middleware/requireAuth');
const { uploadComicImage } = require('../controllers/uploadsController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'));
    }
    cb(null, true);
  },
});

const handleMulterError = (err, _req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'La imagen no puede superar 5MB' });
  }
  return res.status(400).json({ error: err.message || 'Archivo inválido' });
};

router.post(
  '/comic-image',
  requireRoles(['ADMIN', 'SELLER']),
  upload.single('image'),
  handleMulterError,
  uploadComicImage
);

module.exports = router;
