const { GoogleGenerativeAI } = require('@google/generative-ai')

let genAI

function getGenAI() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'REPLACE_WITH_KEY') {
      throw new Error('GEMINI_API_KEY no está configurada en .env')
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return genAI
}

async function callGemini(prompt, systemPrompt = '', options = {}) {
  const { maxOutputTokens = 1024, temperature = 0.7 } = options
  try {
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-1.5-flash',
      ...(systemPrompt && { systemInstruction: systemPrompt }),
      generationConfig: { maxOutputTokens, temperature },
    })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (err) {
    console.error('Gemini error:', err.message)
    throw new Error('Error al conectar con el asistente')
  }
}

async function callGeminiChat(messages, systemPrompt = '') {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages debe ser un array no vacío')
  }
  try {
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-1.5-flash',
      ...(systemPrompt && { systemInstruction: systemPrompt }),
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    })
    const history = messages.slice(0, -1)
    const lastMessage = messages[messages.length - 1].parts[0].text
    const chatSession = model.startChat({ history })
    const result = await chatSession.sendMessage(lastMessage)
    return result.response.text()
  } catch (err) {
    console.error('Gemini chat error:', err.message)
    throw new Error('Error al conectar con el asistente')
  }
}

module.exports = { callGemini, callGeminiChat }
