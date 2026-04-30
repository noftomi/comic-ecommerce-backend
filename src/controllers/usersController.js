const { getPrisma } = require('../lib/prisma');

const updateMe = async (req, res) => {
  try {
    const { name, phone } = req.body || {};
    const data = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío' });
      }
      data.name = name.trim();
    }

    if (phone !== undefined) {
      if (phone !== null && typeof phone !== 'string') {
        return res.status(400).json({ error: 'El teléfono debe ser una cadena de texto' });
      }
      data.phone = phone === null ? null : phone.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

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
