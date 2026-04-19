// api/webhook.js
// Stripe Webhook - ativa plano após pagamento

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const sig = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    // Verifica se tem signature (produção) ou não (teste)
    if (endpointSecret && sig) {
      event = req.body // Em produção, o Stripe assina o corpo
    } else {
      // Modo teste - aceita qualquer evento
      event = req.body
    }
  } catch (err) {
    console.error('Webhook parse error:', err.message)
    return res.status(400).json({ error: 'Webhook parse error' })
  }

  // Só processa checkout.session.completed
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ ok: true, evento: event.type })
  }

  const session = event.data.object

  try {
    const usuario_id = session.metadata?.usuario_id
    const tipo_plano = session.metadata?.tipo_plano
    const processo_hash = session.metadata?.processo_hash

    console.log('Pagamento aprovado:', { usuario_id, tipo_plano })

    if (!usuario_id || !tipo_plano) {
      return res.status(400).json({ error: 'Metadata incompleto' })
    }

    // Ativa o plano no Supabase
    if (tipo_plano === 'pro_mensal') {
      await supabase
        .from('profiles')
        .update({
          plano: 'pro',
          plano_ativo: true,
          plano_inicio: new Date().toISOString(),
          plano_expira: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', usuario_id)

    } else if (tipo_plano === 'plus_mensal') {
      await supabase
        .from('profiles')
        .update({
          plano: 'plus',
          plano_ativo: true,
          plano_inicio: new Date().toISOString(),
          plano_expira: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', usuario_id)

    } else if (tipo_plano === 'avulso') {
      await supabase
        .from('processos_avulsos')
        .insert({
          usuario_id,
          processo_hash,
          pago_em: new Date().toISOString(),
          expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
    }

    return res.status(200).json({ ok: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: 'Erro no webhook' })
  }
}