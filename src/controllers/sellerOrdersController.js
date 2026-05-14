const { getPrisma } = require('../lib/prisma');

const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const orders = await getPrisma().order.findMany({
      where: {
        items: { some: { comic: { sellerId } } },
      },
      include: {
        user: { select: { name: true } },
        items: {
          where: { comic: { sellerId } },
          include: {
            comic: { select: { id: true, title: true, imageUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response = orders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      buyerName: order.user?.name ?? 'Usuario',
      items: order.items.map((item) => ({
        comicId: item.comicId,
        comicTitle: item.comic?.title ?? 'Cómic eliminado',
        imageUrl: item.comic?.imageUrl ?? null,
        quantity: item.quantity,
        price: item.price?.toNumber ? item.price.toNumber() : Number(item.price),
      })),
      subtotal: order.items.reduce((sum, item) => {
        const price = item.price?.toNumber ? item.price.toNumber() : Number(item.price);
        return sum + price * item.quantity;
      }, 0),
    }));

    res.json(response);
  } catch (error) {
    console.error('getSellerOrders error:', error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

module.exports = { getSellerOrders };
