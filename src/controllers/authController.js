const bcrypt = require('bcryptjs');
const { getPrisma } = require('../lib/prisma');

const register = async (req, res) => {
  try {
    const { email, password, name, esSeller, cuil, telefono, pais } = req.body;
    const normalizedCuil    = typeof cuil     === 'string' ? cuil.replace(/\D/g, '')  : '';
    const normalizedPhone   = typeof telefono === 'string' ? telefono.trim()           : '';
    const normalizedCountry = typeof pais     === 'string' ? pais.trim()               : '';

    const existing = await getPrisma().user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'El email ya está registrado' });

    if (esSeller) {
      if (!normalizedCuil || normalizedCuil.length !== 11) {
        return res.status(400).json({ error: 'El CUIL debe tener 11 dígitos' });
      }
      const existingByCuil = await getPrisma().user.findUnique({ where: { cuil: normalizedCuil } });
      if (existingByCuil) {
        return res.status(400).json({ error: 'El CUIL ya está registrado' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await getPrisma().user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: esSeller ? 'SELLER' : 'CLIENT',
        cuil:      esSeller ? normalizedCuil    : null,
        phone:     normalizedPhone              || null,
        country:   normalizedCountry            || null,
      },
      select: { id: true, email: true, name: true, role: true, phone: true, avatarUrl: true, cuil: true }
    });
    req.session.userId = user.id;
    res.status(201).json(user);
  } catch (error) {
    console.error('register error:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getPrisma().user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    req.session.userId = user.id;
    const { password: _pw, createdAt: _ca, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('logout error:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Sesión cerrada' });
  });
};

const me = async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const user = await getPrisma().user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, email: true, name: true, role: true, phone: true, avatarUrl: true }
    });
    res.json(user);
  } catch (error) {
    console.error('me error:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

module.exports = { register, login, logout, me };
