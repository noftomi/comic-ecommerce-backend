const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'llama3.2'

async function callGemini(prompt, systemPrompt = '', options = {}) {
  const { maxOutputTokens = 1024, temperature = 0.7 } = options

  const messages = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: { temperature, num_predict: maxOutputTokens },
    }),
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  return data.message.content
}

async function callGeminiChat(messages, systemPrompt = '') {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages debe ser un array no vacío')
  }

  // Convierte el formato Gemini {role, parts:[{text}]} → OpenAI {role, content}
  const converted = messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : m.role,
    content: m.parts?.[0]?.text ?? m.content ?? '',
  }))

  const payload = []
  if (systemPrompt) payload.push({ role: 'system', content: systemPrompt })
  payload.push(...converted)

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: payload,
      stream: false,
      options: { temperature: 0.7, num_predict: 1024 },
    }),
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  return data.message.content
}

module.exports = { callGemini, callGeminiChat }