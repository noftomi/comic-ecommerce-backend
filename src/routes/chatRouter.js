const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/requireAuth')
const { chat } = require('../services/aiService')

router.post('/', requireAuth, async (req, res) => {
  const { messages } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages requerido' })
  }
  try {
    const reply = await chat(messages)
    res.json({ reply })
  } catch (err) {
    console.error('chat error:', err)
    res.status(500).json({ error: 'Error al procesar el mensaje' })
  }
})

module.exports = router
