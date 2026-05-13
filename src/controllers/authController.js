const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPrisma } = require('../lib/prisma');
const { triggerEmailVerification, triggerPasswordReset } = require('../lib/n8n');

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
    const verificationToken = crypto.randomUUID();

    await getPrisma().user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: esSeller ? 'SELLER' : 'CLIENT',
        cuil:      esSeller ? normalizedCuil    : null,
        phone:     normalizedPhone              || null,
        country:   normalizedCountry            || null,
        verificationToken,
      },
    });

    await triggerEmailVerification(email, name, verificationToken);

    res.status(201).json({ message: 'Cuenta creada. Revisá tu email para verificarla.' });
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

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Debes verificar tu email antes de iniciar sesión.' });
    }

    req.session.userId = user.id;
    const { password: _pw, createdAt: _ca, verificationToken: _vt, passwordResetToken: _prt, passwordResetExpires: _pre, ...safeUser } = user;
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
      select: { id: true, email: true, name: true, role: true, phone: true, avatarUrl: true },
    });
    res.json(user);
  } catch (error) {
    console.error('me error:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token requerido' });

    console.log('verifyEmail: token recibido:', JSON.stringify(token));

    const user = await getPrisma().user.findUnique({ where: { verificationToken: token } });

    console.log('verifyEmail: usuario encontrado:', user ? user.email : 'NO ENCONTRADO');

    if (!user) return res.status(400).json({ error: 'Token inválido o expirado' });

    await getPrisma().user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationToken: null },
    });

    res.json({ message: 'Email verificado correctamente' });
  } catch (error) {
    console.error('verifyEmail error:', error);
    res.status(500).json({ error: 'Error al verificar email' });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const user = await getPrisma().user.findUnique({ where: { email } });

    if (!user || user.emailVerified) {
      return res.json({ message: 'Si el email está pendiente de verificación, recibirás un nuevo enlace.' });
    }

    const verificationToken = crypto.randomUUID();
    await getPrisma().user.update({
      where: { id: user.id },
      data: { verificationToken },
    });

    await triggerEmailVerification(user.email, user.name, verificationToken);

    res.json({ message: 'Email de verificación reenviado.' });
  } catch (error) {
    console.error('resendVerification error:', error);
    res.status(500).json({ error: 'Error al reenviar verificación' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await getPrisma().user.findUnique({ where: { email } });

    // Siempre responder igual para no revelar si el email existe
    if (!user) return res.json({ message: 'Si el email está registrado, recibirás un enlace.' });

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await getPrisma().user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    await triggerPasswordReset(user.email, user.name, token);
    res.json({ message: 'Si el email está registrado, recibirás un enlace.' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token y contraseña requeridos' });

    const user = await getPrisma().user.findUnique({ where: { passwordResetToken: token } });
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await getPrisma().user.update({
      where: { id: user.id },
      data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
};

module.exports = { register, login, logout, me, verifyEmail, resendVerification, forgotPassword, resetPassword };
