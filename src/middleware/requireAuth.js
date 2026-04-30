const { getPrisma } = require('../lib/prisma');

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  next();
};

const requireAdmin = async (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const user = await getPrisma().user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, role: true }
    });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('requireAdmin error:', error);
    res.status(500).json({ error: 'Error de autenticación' });
  }
};

module.exports = { requireAuth, requireAdmin };
