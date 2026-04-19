export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  res.json({
    env: {
      KIWIFY_CLIENT_ID: !!process.env.KIWIFY_CLIENT_ID ? 'OK' : 'MISSING',
      KIWIFY_CLIENT_SECRET: !!process.env.KIWIFY_CLIENT_SECRET ? 'OK' : 'MISSING',
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY ? 'OK' : 'MISSING'
    },
    api_files: ['criar-preferencia.js', 'webhook.js', 'index.js'],
    message: 'Teste env + proxy OK. Configure .env e teste /api/criar-preferencia'
  })
}
