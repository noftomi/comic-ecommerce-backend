const { getPrisma } = require('../lib/prisma');

const getCart = async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const items = await getPrisma().cartItem.findMany({
      where: { userId: req.session.userId },
      include: { comic: true },
    });
    res.json(items.map((item) => ({
      id: item.comicId,
      title: item.comic.title,
      price: Number(item.comic.price),
      qty: item.quantity,
      imageUrl: item.comic.imageUrl,
      publisher: item.comic.publisher,
    })));
  } catch (error) {
    console.error('getCart error:', error);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
};

const addItem = async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const { comicId } = req.body;

    const comic = await getPrisma().comic.findUnique({ where: { id: comicId } });
    if (!comic) return res.status(404).json({ error: 'Producto no encontrado' });

    const existing = await getPrisma().cartItem.findUnique({
      where: { userId_comicId: { userId: req.session.userId, comicId } },
    });

    if (existing) {
      await getPrisma().cartItem.update({
        where: { userId_comicId: { userId: req.session.userId, comicId } },
        data: { quantity: existing.quantity + 1 },
      });
    } else {
      await getPrisma().cartItem.create({
        data: { userId: req.session.userId, comicId, quantity: 1 },
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('addItem error:', error);
    res.status(500).json({ error: 'Error al agregar al carrito' });
  }
};

const updateItem = async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const comicId = parseInt(req.params.comicId);
    const { delta } = req.body;

    const existing = await getPrisma().cartItem.findUnique({
      where: { userId_comicId: { userId: req.session.userId, comicId } },
    });

    if (!existing) return res.status(404).json({ error: 'Item no encontrado' });

    const newQty = existing.quantity + delta;

    if (newQty <= 0) {
      await getPrisma().cartItem.delete({
        where: { userId_comicId: { userId: req.session.userId, comicId } },
      });
    } else {
      await getPrisma().cartItem.update({
        where: { userId_comicId: { userId: req.session.userId, comicId } },
        data: { quantity: newQty },
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('updateItem error:', error);
    res.status(500).json({ error: 'Error al actualizar carrito' });
  }
};

const removeItem = async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const comicId = parseInt(req.params.comicId);
    await getPrisma().cartItem.deleteMany({
      where: { userId: req.session.userId, comicId },
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('removeItem error:', error);
    res.status(500).json({ error: 'Error al eliminar del carrito' });
  }
};

module.exports = { getCart, addItem, updateItem, removeItem };
