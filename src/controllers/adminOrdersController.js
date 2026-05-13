const { Prisma } = require('@prisma/client');
const { getPrisma } = require('../lib/prisma');

const ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const toOrderResponse = (order) => ({
  ...order,
  total: order.total?.toNumber ? order.total.toNumber() : Number(order.total),
  items: order.items.map((item) => ({
    ...item,
    price: item.price?.toNumber ? item.price.toNumber() : Number(item.price),
  })),
});

const getAllOrders = async (_req, res) => {
  try {
    const orders = await getPrisma().order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            comic: { select: { id: true, title: true, imageUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders.map(toOrderResponse));
  } catch (error) {
    console.error('getAllOrders error:', error);
    res.status(500).json({ error: 'Error al obtener ordenes' });
  }
};

const getOrderStats = async (_req, res) => {
  try {
    const prisma = getPrisma();
    const paidStatuses = ['PAID', 'SHIPPED', 'DELIVERED'];

    const [salesAggregate, ordersCount, paidItems] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: paidStatuses } },
        _sum: { total: true },
      }),
      prisma.order.count(),
      prisma.orderItem.findMany({
        where: { order: { status: { in: paidStatuses } } },
        include: {
          comic: { select: { id: true, title: true, imageUrl: true } },
        },
      }),
    ]);

    const topComicsById = paidItems.reduce((acc, item) => {
      const current = acc.get(item.comicId) || {
        comicId: item.comicId,
        title: item.comic?.title || 'Comic eliminado',
        imageUrl: item.comic?.imageUrl || null,
        quantitySold: 0,
        revenue: 0,
      };
      current.quantitySold += item.quantity;
      current.revenue += Number(item.price) * item.quantity;
      acc.set(item.comicId, current);
      return acc;
    }, new Map());

    res.json({
      totalSales: salesAggregate._sum.total?.toNumber ? salesAggregate._sum.total.toNumber() : Number(salesAggregate._sum.total || 0),
      ordersCount,
      topComics: [...topComicsById.values()]
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 5),
    });
  } catch (error) {
    console.error('getOrderStats error:', error);
    res.status(500).json({ error: 'Error al obtener estadisticas' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID invalido' });
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Estado invalido' });
    }

    const order = await getPrisma().order.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            comic: { select: { id: true, title: true, imageUrl: true } },
          },
        },
      },
    });

    res.json(toOrderResponse(order));
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    res.status(500).json({ error: 'Error al actualizar orden' });
  }
};

module.exports = {
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
};
