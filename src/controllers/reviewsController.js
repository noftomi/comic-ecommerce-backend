const { getPrisma } = require('../lib/prisma');

const getReviews = async (req, res) => {
  try {
    const comicId = parseInt(req.params.comicId);
    if (isNaN(comicId)) return res.status(400).json({ error: 'ID de cómic inválido' });

    const reviews = await getPrisma().review.findMany({
      where: { comicId },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    console.error('getReviews error:', error);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
};

const createReview = async (req, res) => {
  try {
    const comicId = parseInt(req.params.comicId);
    if (isNaN(comicId)) return res.status(400).json({ error: 'ID de cómic inválido' });

    const { rating, comment } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La puntuación debe ser un número entero entre 1 y 5' });
    }

    const comic = await getPrisma().comic.findUnique({ where: { id: comicId } });
    if (!comic) return res.status(404).json({ error: 'Cómic no encontrado' });

    const existing = await getPrisma().review.findUnique({
      where: { userId_comicId: { userId: req.session.userId, comicId } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Ya escribiste una reseña para este cómic' });
    }

    const review = await getPrisma().review.create({
      data: {
        userId: req.session.userId,
        comicId,
        rating,
        comment: comment || null
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    });
    res.status(201).json(review);
  } catch (error) {
    console.error('createReview error:', error);
    res.status(500).json({ error: 'Error al crear reseña' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    if (isNaN(reviewId)) return res.status(400).json({ error: 'ID de reseña inválido' });

    const review = await getPrisma().review.findUnique({ where: { id: reviewId } });

    if (!review) return res.status(404).json({ error: 'Reseña no encontrada' });
    if (review.userId !== req.session.userId) return res.status(403).json({ error: 'No podés eliminar esta reseña' });

    await getPrisma().review.delete({ where: { id: reviewId } });
    res.json({ message: 'Reseña eliminada' });
  } catch (error) {
    console.error('deleteReview error:', error);
    res.status(500).json({ error: 'Error al eliminar reseña' });
  }
};

module.exports = { getReviews, createReview, deleteReview };