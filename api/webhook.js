// api/webhook.js
// Kiwify Webhook - ativa plano após pagamento

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const body = req.body
    console.log('Webhook Kiwify recebido:', JSON.stringify(body))

    const eventType = body.event
    const order = body.order || {}
    const customerId = order.customer_id || order.customer?.id
    const customerEmail = order.customer_email || order.customer?.email
    const productId = order.product_id
    const orderId = order.id

    console.log('Dados do pedido:', { eventType, customerId, customerEmail, productId, orderId })

    // Determinar tipo do plano pelo product_id
    let tipo_plano = null
    if (productId === 'UZVkAvI' || productId === 'UZVkAvI') {
      tipo_plano = 'pro'
    } else if (productId === 'rxjd1Xi') {
      tipo_plano = 'plus'
    } else if (productId === 'Pysxk5p' || productId === '4C6INLA') {
      tipo_plano = 'avulso'
    }

    if (eventType === 'order.completed' || eventType === 'payment_received' || eventType === 'order.approved') {
      console.log('Pagamento confirmado para:', tipo_plano)

      if (tipo_plano === 'pro') {
        // Buscar usuário pelo email
        let userId = customerId
        if (!userId && customerEmail) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customerEmail)
            .single()
          if (userData) userId = userData.id
        }

        await supabase
          .from('profiles')
          .upsert({
            id: userId || 'user_' + customerEmail,
            plano: 'pro',
            plano_ativo: true,
            plano_inicio: new Date().toISOString(),
            plano_expira: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })

        console.log('✅ Plano PRO ativado para:', userId || customerEmail)

      } else if (tipo_plano === 'plus') {
        let userId = customerId
        if (!userId && customerEmail) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customerEmail)
            .single()
          if (userData) userId = userData.id
        }

        await supabase
          .from('profiles')
          .upsert({
            id: userId || 'user_' + customerEmail,
            plano: 'plus',
            plano_ativo: true,
            plano_inicio: new Date().toISOString(),
            plano_expira: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })

        console.log('✅ Plano PLUS ativado para:', userId || customerEmail)

      } else if (tipo_plano === 'avulso') {
        await supabase
          .from('processos_avulsos')
          .insert({
            id: Date.now().toString(),
            usuario_id: customerId || 'anonimo',
            processo_hash: 'processo_' + orderId || 'processo_' + Date.now(),
            pago_em: new Date().toISOString(),
            expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })

        console.log('✅ Processo avulso ativado')
      }

      return res.status(200).json({ ok: true, activated: tipo_plano })
    }

    return res.status(200).json({ ok: true, evento: eventType })

  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: 'Erro no webhook', details: error.message })
  }
}