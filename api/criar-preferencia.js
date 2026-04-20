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

  console.log('Body recibido:', req.body)

  const { tipo, usuarioId, usuarioEmail, processoHash } = req.body || {}

  const clientId = process.env.KIWIFY_CLIENT_ID
  const clientSecret = process.env.KIWIFY_CLIENT_SECRET

  console.log('KIWIFY_CLIENT_ID:', clientId ? 'EXISTS' : 'MISSING')
  console.log('KIWIFY_CLIENT_SECRET:', clientSecret ? 'EXISTS' : 'MISSING')

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Credenciais Kiwify nao configuradas', envCheck: { clientId: !!clientId, clientSecret: !!clientSecret } })
  }

  console.log('Tipo recebido:', tipo)

  // Mapeamento de produtos Kiwify
  const produtos = {
    avulso: '4C6INLA',
    pro_mensal: 'UZVkAvI',
    plus_mensal: 'rxjd1Xi'
  }

  const productId = produtos[tipo]
  console.log('ProductID:', productId)
  
  if (!productId) {
    return res.status(400).json({ error: 'Tipo de plano invalido', tipoRecebido: tipo, produtos })
  }

  try {
    // Obter token de acesso Kiwify
    const tokenResponse = await fetch('https://api.kiwify.com.br/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      })
    })

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text()
      return res.status(400).json({ error: 'Erro ao autenticar Kiwify', details: err })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Criar checkout
    const checkoutResponse = await fetch('https://api.kiwify.com.br/v1/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        product_id: productId,
        email: usuarioEmail || 'cliente@juridiquespopular.com.br',
        customer: { id: usuarioId },
        order: {
          extra_ref: JSON.stringify({ tipo, usuarioId, processoHash })
        }
      })
    })

    if (!checkoutResponse.ok) {
      const err = await checkoutResponse.text()
      return res.status(400).json({ error: 'Erro ao criar checkout', details: err })
    }

    const checkoutData = await checkoutResponse.json()

    return res.status(200).json({ 
      url: checkoutData.url,
      checkoutId: checkoutData.id
    })

  } catch (error) {
    console.error('Erro Kiwify:', error)
    return res.status(500).json({ error: 'Erro interno', details: error.message })
  }
}
