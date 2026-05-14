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
    const { comicId, quantity = 1 } = req.body;
    const qty = parseInt(quantity);
    if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Cantidad inválida' });

    const comic = await getPrisma().comic.findUnique({ where: { id: comicId } });
    if (!comic) return res.status(404).json({ error: 'Producto no encontrado' });
    if (comic.stock <= 0) return res.status(400).json({ error: 'Sin stock disponible' });

    const existing = await getPrisma().cartItem.findUnique({
      where: { userId_comicId: { userId: req.session.userId, comicId } },
    });

    const currentQty = existing?.quantity ?? 0;
    const newQty = currentQty + qty;

    if (newQty > comic.stock) {
      return res.status(400).json({ error: `Stock insuficiente. Disponible: ${comic.stock - currentQty}` });
    }

    if (existing) {
      await getPrisma().cartItem.update({
        where: { userId_comicId: { userId: req.session.userId, comicId } },
        data: { quantity: newQty },
      });
    } else {
      await getPrisma().cartItem.create({
        data: { userId: req.session.userId, comicId, quantity: qty },
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
    const delta = parseInt(req.body.delta);
    if (!Number.isInteger(delta) || delta === 0) return res.status(400).json({ error: 'Delta inválido' });

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
      if (delta > 0) {
        const comic = await getPrisma().comic.findUnique({ where: { id: comicId }, select: { stock: true } });
        if (newQty > comic.stock) {
          return res.status(400).json({ error: `Stock insuficiente. Disponible: ${comic.stock - existing.quantity}` });
        }
      }
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

const clearCart = async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    await getPrisma().cartItem.deleteMany({ where: { userId: req.session.userId } });
    res.json({ ok: true });
  } catch (error) {
    console.error('clearCart error:', error);
    res.status(500).json({ error: 'Error al vaciar el carrito' });
  }
};

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
