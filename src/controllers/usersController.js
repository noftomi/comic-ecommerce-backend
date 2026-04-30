const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

let prisma;
function getPrisma() {
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

const updateMe = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;

    const user = await getPrisma().user.update({
      where: { id: req.session.userId },
      data,
      select: { id: true, email: true, name: true, role: true, phone: true, avatarUrl: true },
    });
    res.json(user);
  } catch (error) {
    console.error('updateMe error:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

module.exports = { updateMe };
