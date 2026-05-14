const express = require('express')
const router = express.Router()
const { requireRoles } = require('../middleware/requireAuth')
const { generateDescription } = require('../services/aiService')

router.post('/', requireRoles(['ADMIN', 'SELLER']), async (req, res) => {
  const { title, author, category, publisher, issueNumber, edition, language, pages } = req.body
  if (!title) return res.status(400).json({ error: 'El campo title es requerido' })
  try {
    const description = await generateDescription({ title, author, category, publisher, issueNumber, edition, language, pages })
    res.json({ description })
  } catch (err) {
    console.error('generateDescription error:', err)
    res.status(500).json({ error: 'Error al generar la descripción' })
  }
})

module.exports = router
