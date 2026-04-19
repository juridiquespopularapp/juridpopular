// api/criar-preferencia.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido' })
  }

  const { tipo, usuarioId, usuarioEmail } = req.body

  // Verificar env vars - retorna na resposta
  const clientId = process.env.KIWIFY_CLIENT_ID
  const clientSecret = process.env.KIWIFY_CLIENT_SECRET
  
  return res.status(200).json({ 
    debug: {
      temClientId: !!clientId,
      temClientSecret: !!clientSecret,
      clientIdPrefix: clientId ? clientId.slice(0, 8) : null,
      tipo: tipo,
      usuarioId: usuarioId,
      usuarioEmail: usuarioEmail
    }
  })
}