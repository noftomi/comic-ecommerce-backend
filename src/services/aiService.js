const { callGemini, callGeminiChat } = require('./geminiClient')

const OFF_TOPIC_PATTERNS = [
  /código|programar|javascript|python|html/i,
  /política|elecciones|presidente|gobierno/i,
  /receta|cocina|ingredientes|gastronomía/i,
  /chiste|broma|humor/i,
  /clima|temperatura|pronóstico/i,
]

const OFF_TOPIC_REPLY = 'Solo puedo ayudarte con dudas sobre la tienda o recomendarte cómics 😊'

const COMICVERSE_SYSTEM_PROMPT = `Sos el asistente virtual de ComicVerse, una tienda de cómics online en Argentina.

Información de la tienda:
- Envíos: a todo el país vía correo privado, 3 a 7 días hábiles. CABA y GBA: 24 a 48 horas.
- Métodos de pago: MercadoPago (tarjeta de crédito/débito, transferencia bancaria y efectivo en puntos de pago).
- Devoluciones: se aceptan dentro de los 10 días de recibido el producto, sin uso y en embalaje original.
- Horarios de atención: lunes a viernes de 9:00 a 18:00 hs.
- Contacto: soporte@comicverse.com.ar

Reglas estrictas:
- Solo respondé preguntas sobre ComicVerse o sobre cómics en general.
- Si el usuario pide recomendaciones de cómics, respondé ÚNICAMENTE con este JSON y nada más: {"intent":"RECOMMEND"}
- Si la pregunta es sobre otro tema, respondé únicamente: ${OFF_TOPIC_REPLY}
- Tono: amigable, tuteo, máximo 3-4 oraciones por respuesta.`

async function chat(messages) {
  const lastText = messages[messages.length - 1].parts[0].text
  if (OFF_TOPIC_PATTERNS.some((p) => p.test(lastText))) return OFF_TOPIC_REPLY
  return callGeminiChat(messages, COMICVERSE_SYSTEM_PROMPT)
}

function buildDescriptionPrompt({ title, author, category, publisher, issueNumber, edition, language, pages }) {
  const fields = [
    `Título: ${title}`,
    author && `Autor: ${author}`,
    category && `Categoría: ${category}`,
    publisher && `Editorial: ${publisher}`,
    issueNumber && `Número de edición: ${issueNumber}`,
    edition && `Edición: ${edition}`,
    pages && `Páginas: ${pages}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `Escribí una descripción comercial atractiva para una tienda de cómics online.\n\n${fields}\n\nRequisitos:\n- Entre 500 y 600 caracteres exactos\n- Idioma: ${language || 'español'}\n- Tono entusiasta y comercial, sin spoilers\n- Solo devolvé la descripción, sin títulos, aclaraciones ni comillas`
}

async function generateDescription(fields) {
  const prompt = buildDescriptionPrompt(fields)
  return callGemini(prompt, '', { maxOutputTokens: 300, temperature: 0.8 })
}

module.exports = { chat, generateDescription }
