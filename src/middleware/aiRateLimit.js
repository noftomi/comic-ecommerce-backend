const rateLimit = require('express-rate-limit')

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas solicitudes. Esperá un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = aiRateLimit
