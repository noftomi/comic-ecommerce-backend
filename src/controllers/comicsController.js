const { getPrisma } = require('../lib/prisma');

const getAll = async (req, res) => {
  try {
    const prisma = getPrisma();
    const comics = await prisma.comic.findMany({ orderBy: { createdAt: 'desc' } });
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
    const comic = await prisma.comic.findUnique({ where: { id } });
    if (!comic) return res.status(404).json({ error: 'Comic no encontrado' });
    res.json({ ...comic, price: comic.price.toNumber() });
  } catch (err) {
    console.error('getById error:', err);
    res.status(500).json({ error: 'Error al obtener el cómic' });
  }
};

module.exports = { getAll, getById };
