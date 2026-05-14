const { getPrisma } = require('../lib/prisma');

const getAll = async (req, res) => {
  try {
    const prisma = getPrisma();
    const comics = await prisma.comic.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(comics.map((c) => ({ ...c, price: c.price.toNumber() })));
  } catch (err) {
    console.error('getAll error:', err);
    res.status(500).json({ error: 'Error al obtener cómics' });
  }
};

const getById = async (req, res) => {
  try {
    const prisma = getPrisma();
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const comic = await prisma.comic.findFirst({ where: { id, isActive: true } });
    if (!comic) return res.status(404).json({ error: 'Comic no encontrado' });
    res.json({ ...comic, price: comic.price.toNumber() });
  } catch (err) {
    console.error('getById error:', err);
    res.status(500).json({ error: 'Error al obtener el cómic' });
  }
};

const getRelated = async (req, res) => {
  try {
    const prisma = getPrisma()
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

    const comic = await prisma.comic.findFirst({ where: { id, isActive: true } })
    if (!comic) return res.status(404).json({ error: 'Comic no encontrado' })

    const orConditions = []
    if (comic.category) orConditions.push({ category: comic.category })
    if (comic.author) orConditions.push({ author: comic.author })

    if (orConditions.length === 0) {
      return res.json([])
    }

    const related = await prisma.comic.findMany({
      where: {
        isActive: true,
        id: { not: id },
        OR: orConditions,
      },
      include: { reviews: { select: { rating: true } } },
      take: 20,
    })

    const withAvg = related.map((c) => {
      const { reviews: comicReviews, ...rest } = c
      const avgRating =
        comicReviews.length > 0
          ? comicReviews.reduce((sum, r) => sum + r.rating, 0) / comicReviews.length
          : 0
      return { ...rest, price: rest.price.toNumber(), avgRating }
    })

    res.json(withAvg.sort((a, b) => b.avgRating - a.avgRating).slice(0, 10))
  } catch (err) {
    console.error('getRelated error:', err)
    res.status(500).json({ error: 'Error al obtener cómics relacionados' })
  }
}

module.exports = { getAll, getById, getRelated };
