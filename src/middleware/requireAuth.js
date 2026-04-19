const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acceso denegado' });
  next();
};

module.exports = { requireAuth, requireAdmin };
