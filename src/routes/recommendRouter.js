const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/requireAuth')
const { getRecommendations } = require('../services/recommender')

router.get('/', requireAuth, async (req, res) => {
  const userId = req.session.userId
  const mode = req.query.mode === 'explore' ? 'explore' : 'normal'
  try {
    const result = await getRecommendations(userId, mode)
    res.json(result)
  } catch (err) {
    console.error('recommendations error:', err)
    res.status(500).json({ error: 'Error al obtener recomendaciones' })
  }
})

module.exports = router
