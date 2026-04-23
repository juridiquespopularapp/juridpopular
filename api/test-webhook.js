// api/test-webhook.js
// Testa se o webhook está OK

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.json({
    status: 'OK',
    supabase: !!process.env.VITE_SUPABASE_URL,
    serviceKey: !!process.env.SUPABASE_SERVICE_KEY,
    mensagem: 'Webhook está configurado. Teste: curl -X POST https://www.juridiquespopular.com.br/api/webhook -H "Content-Type: application/json" -d \'{"event":"order.completed","order":{"id":"test123","product_id":"UZVkAvI","customer_email":"seu-email@email.com"}}\''
  })
}