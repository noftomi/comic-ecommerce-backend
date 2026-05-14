const { getPrisma } = require('../lib/prisma')

async function buildHeatMap(userId) {
  const prisma = getPrisma()

  const [favorites, reviews, orderItems, cartItems] = await Promise.all([
    prisma.user
      .findUnique({
        where: { id: userId },
        select: { favorites: { select: { id: true, category: true, author: true, publisher: true } } },
      })
      .then((u) => u?.favorites ?? []),
    prisma.review.findMany({
      where: { userId },
      select: { rating: true, comic: { select: { id: true, category: true, author: true, publisher: true } } },
    }),
    prisma.orderItem.findMany({
      where: { order: { userId } },
      select: { comicId: true, comic: { select: { id: true, category: true, author: true, publisher: true } } },
    }),
    prisma.cartItem.findMany({
      where: { userId },
      select: { comicId: true, comic: { select: { id: true, category: true, author: true, publisher: true } } },
    }),
  ])

  const heatMap = {}
  const excludedIds = new Set()

  function accumulate(comic, weight) {
    if (!comic) return
    if (comic.category) heatMap[comic.category] = (heatMap[comic.category] || 0) + weight
    if (comic.author) heatMap[comic.author] = (heatMap[comic.author] || 0) + weight * 0.8
    if (comic.publisher) heatMap[comic.publisher] = (heatMap[comic.publisher] || 0) + weight * 0.5
  }

  for (const comic of favorites) accumulate(comic, 5.0)
  for (const review of reviews) accumulate(review.comic, (review.rating / 5) * 4)
  for (const item of orderItems) {
    accumulate(item.comic, 3.0)
    excludedIds.add(item.comicId)
  }
  for (const item of cartItems) {
    accumulate(item.comic, 1.5)
    excludedIds.add(item.comicId)
  }

  return { heatMap, excludedIds }
}

async function getRecommendations(userId, mode = 'normal') {
  const prisma = getPrisma()
  const { heatMap, excludedIds } = await buildHeatMap(userId)
  const hasHistory = Object.keys(heatMap).length > 0

  const allComics = await prisma.comic.findMany({
    where: { isActive: true },
    include: { reviews: { select: { rating: true } } },
  })

  const candidates = allComics
    .filter((c) => !excludedIds.has(c.id))
    .map((c) => {
      const { reviews: comicReviews, ...rest } = c
      const avgRating =
        comicReviews.length > 0
          ? comicReviews.reduce((sum, r) => sum + r.rating, 0) / comicReviews.length
          : 0
      return { ...rest, price: rest.price.toNumber(), avgRating }
    })

  if (!hasHistory) {
    return {
      recommendations: candidates.sort((a, b) => b.avgRating - a.avgRating).slice(0, 6),
      mode: 'popular',
    }
  }

  if (mode === 'explore') {
    const cold = candidates.filter((c) => !c.category || (heatMap[c.category] || 0) < 1.0)
    return {
      recommendations: cold.sort((a, b) => b.avgRating - a.avgRating).slice(0, 6),
      mode: 'explore',
    }
  }

  const scored = candidates.map((c) => ({
    ...c,
    score:
      (heatMap[c.category] || 0) +
      (heatMap[c.author] || 0) * 0.8 +
      (heatMap[c.publisher] || 0) * 0.5 +
      (c.avgRating / 5) * 2,
  }))

  return {
    recommendations: scored.sort((a, b) => b.score - a.score).slice(0, 6),
    mode: 'normal',
  }
}

module.exports = { getRecommendations }
