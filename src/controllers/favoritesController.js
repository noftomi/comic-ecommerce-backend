const { getPrisma } = require('../lib/prisma');

const getFavorites = async (req, res) => {
  try {
    const user = await getPrisma().user.findUnique({
      where: { id: req.session.userId },
      select: {
        favorites: {
          select: {
            id: true,
            title: true,
            author: true,
            price: true,
            imageUrl: true,
            category: true,
          }
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user.favorites);
  } catch (error) {
    console.error('getFavorites error:', error);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
};

const addFavorite = async (req, res) => {
  try {
    const comicId = parseInt(req.params.comicId);
    await getPrisma().user.update({
      where: { id: req.session.userId },
      data: { favorites: { connect: { id: comicId } } }
    });
    res.status(201).json({ message: 'Agregado a favoritos' });
  } catch (error) {
    console.error('addFavorite error:', error);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const comicId = parseInt(req.params.comicId);
    await getPrisma().user.update({
      where: { id: req.session.userId },
      data: { favorites: { disconnect: { id: comicId } } }
    });
    res.json({ message: 'Quitado de favoritos' });
  } catch (error) {
    console.error('removeFavorite error:', error);
    res.status(500).json({ error: 'Error al quitar favorito' });
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite };