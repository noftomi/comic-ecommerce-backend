const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

let prisma;
function getPrisma() {
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

const register = async (req, res) => {
  try {
    const { email, password, name, esSeller } = req.body;
    const existing = await getPrisma().user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'El email ya está registrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await getPrisma().user.create({
      data: { email, password: hashedPassword, name, role: esSeller ? 'SELLER' : 'CLIENT' }
    });
    req.session.userId = user.id;
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
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
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
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
      select: { id: true, email: true, name: true, role: true }
    });
    res.json(user);
  } catch (error) {
    console.error('me error:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

module.exports = { register, login, logout, me };