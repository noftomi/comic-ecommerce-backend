const { GoogleGenerativeAI } = require('@google/generative-ai')

let genAI

function getGenAI() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
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
