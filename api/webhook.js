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
    const productId = order.product_id
    const extraRef = order.extra_ref

    let tipo_plano = null
    let usuario_id = customerId
    let processo_hash = null

    if (extraRef) {
      try {
        const ref = JSON.parse(extraRef)
        tipo_plano = ref.tipo
        usuario_id = ref.usuarioId || customerId
        processo_hash = ref.processoHash
      } catch (e) {
        console.log('extra_ref não é JSON:', extraRef)
      }
    }

    if (!customerId && !usuario_id) {
      return res.status(400).json({ error: 'Cliente não identificado' })
    }

    if (eventType === 'order.completed' || eventType === 'payment_received') {
      console.log('Pagamento confirmado:', { usuario_id, tipo_plano, productId })

      if (!usuario_id) {
        console.log('⚠️ Pagamento sem usuário - criando perfil anônimo')
      }

      if (tipo_plano === 'pro_mensal' || productId === 'UZVkAvI') {
        await supabase
          .from('profiles')
          .upsert({
            id: usuario_id || 'anonimo_' + Date.now(),
            plano: 'pro',
            plano_ativo: true,
            plano_inicio: new Date().toISOString(),
            plano_expira: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }, { onConflict: 'id' })

        console.log('✅ Plano PRO ativado para:', usuario_id)

      } else if (tipo_plano === 'plus_mensal' || productId === 'rxjd1Xi') {
        await supabase
          .from('profiles')
          .upsert({
            id: usuario_id || 'anonimo_' + Date.now(),
            plano: 'plus',
            plano_ativo: true,
            plano_inicio: new Date().toISOString(),
            plano_expira: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }, { onConflict: 'id' })

        console.log('✅ Plano PLUS ativado para:', usuario_id)

      } else if (tipo_plano === 'avulso' || productId === 'Pysxk5p' || productId === '4C6INLA') {
        await supabase
          .from('processos_avulsos')
          .upsert({
            id: Date.now().toString(),
            usuario_id: usuario_id || 'anonimo',
            processo_hash: processo_hash || 'processo_' + Date.now(),
            pago_em: new Date().toISOString(),
            expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }, { onConflict: 'id' })

        console.log('✅ Processo avulso ativado para:', usuario_id)
      }

      return res.status(200).json({ ok: true })
    }

    return res.status(200).json({ ok: true, evento: eventType })

  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: 'Erro no webhook' })
  }
}