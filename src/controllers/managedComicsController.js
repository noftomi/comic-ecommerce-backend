const { Prisma } = require('@prisma/client');
const { getPrisma } = require('../lib/prisma');

const requiredStringFields = ['title', 'author'];

const toComicResponse = (comic) => ({
  ...comic,
  price: comic.price?.toNumber ? comic.price.toNumber() : Number(comic.price),
});

const parsePositiveDecimal = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const parseNonNegativeInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  return value.trim() || null;
};

const buildComicData = (body, { partial = false } = {}) => {
  const errors = {};
  const data = {};

  for (const field of requiredStringFields) {
    if (body[field] !== undefined || !partial) {
      if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
        errors[field] = 'Campo obligatorio';
      } else {
        data[field] = body[field].trim();
      }
    }
  }

  if (body.price !== undefined || !partial) {
    const price = parsePositiveDecimal(body.price);
    if (price === null) errors.price = 'El precio debe ser mayor a 0';
    else data.price = new Prisma.Decimal(price);
  }

  if (body.stock !== undefined || !partial) {
    const stock = parseNonNegativeInteger(body.stock);
    if (stock === null) errors.stock = 'El stock debe ser un entero mayor o igual a 0';
    else data.stock = stock;
  }

  if (body.pages !== undefined) {
    if (body.pages === null || body.pages === '') {
      data.pages = null;
    } else {
      const pages = parseNonNegativeInteger(body.pages);
      if (pages === null) errors.pages = 'Las páginas deben ser un entero mayor o igual a 0';
      else data.pages = pages;
    }
  }

  const optionalStringFields = [
    'description',
    'imageUrl',
    'category',
    'language',
    'publisher',
    'edition',
    'issueNumber',
  ];

  for (const field of optionalStringFields) {
    if (body[field] !== undefined) {
      data[field] = normalizeOptionalString(body[field]);
    }
  }

  return { data, errors };
};

const getOwnershipWhere = (user) => {
  if (user.role === 'ADMIN') return { isActive: true };
  return { sellerId: user.id, isActive: true };
};

const getManagedComics = async (req, res) => {
  try {
    const comics = await getPrisma().comic.findMany({
      where: getOwnershipWhere(req.user),
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(comics.map(toComicResponse));
  } catch (error) {
    console.error('getManagedComics error:', error);
    res.status(500).json({ error: 'Error al obtener cómics' });
  }
};

const createManagedComic = async (req, res) => {
  try {
    const { data, errors } = buildComicData(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', errors });
    }

    if (req.user.role === 'SELLER') {
      data.sellerId = req.user.id;
    }

    const comic = await getPrisma().comic.create({
      data,
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
    });
    res.status(201).json(toComicResponse(comic));
  } catch (error) {
    console.error('createManagedComic error:', error);
    res.status(500).json({ error: 'Error al crear cómic' });
  }
};

const updateManagedComic = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    const existing = await getPrisma().comic.findFirst({
      where: { id, ...getOwnershipWhere(req.user) },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Cómic no encontrado' });

    const { data, errors } = buildComicData(req.body, { partial: true });
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', errors });
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    const comic = await getPrisma().comic.update({
      where: { id },
      data,
      include: {
        seller: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(toComicResponse(comic));
  } catch (error) {
    console.error('updateManagedComic error:', error);
    res.status(500).json({ error: 'Error al actualizar cómic' });
  }
};

const deleteManagedComic = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    const existing = await getPrisma().comic.findFirst({
      where: { id, ...getOwnershipWhere(req.user) },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Cómic no encontrado' });

    await getPrisma().comic.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ message: 'Cómic eliminado' });
  } catch (error) {
    console.error('deleteManagedComic error:', error);
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'No se puede eliminar un cómic con referencias asociadas' });
    }
    res.status(500).json({ error: 'Error al eliminar cómic' });
  }
};

module.exports = {
  getManagedComics,
  createManagedComic,
  updateManagedComic,
  deleteManagedComic,
};
