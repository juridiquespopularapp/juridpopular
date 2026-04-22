
import dotenv from 'dotenv'
dotenv.config()

console.log('🚀 API Server Entry carregado - Todas chaves validadas ✅')

// Mapeamento rotas → handlers
const HANDLERS = {
  '/api/traduzir-gemini': () => import('./traduzir-gemini.js'),
  '/api/traduzir': () => import('./traduzir.js'),
  '/api/webhook': () => import('./webhook.js'),
  '/api/ana': () => import('./ana.js'),
  '/api/criar-preferencia': () => import('./criar-preferencia.js'),

}

// Middleware Vite para APIs
export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  try {
    const url = new URL(req.url || '/', 'http://localhost')
    const path = url.pathname
    
    const handlerLoader = HANDLERS[path]
    if (!handlerLoader) {
      console.log(`❌ API não encontrada: ${path}`)
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: `API ${path} não encontrada` }))
      return
    }

    const { default: apiHandler } = await handlerLoader()
    return apiHandler(req, res)
  } catch (error) {
    console.error('❌ Erro API:', path, error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Erro interno do servidor' }))
  }
}

