// src/lib/kiwify.js
// Funções do frontend para iniciar pagamentos via Kiwify

const KIWIFY_URLS = {
  avulso: 'https://pay.kiwify.com.br/Pysxk5p',
  pro_mensal: 'https://pay.kiwify.com.br/UZVkAvI',
  plus_mensal: 'https://pay.kiwify.com.br/rxjd1Xi'
}

const APP_URL = window.location.origin

function salvarProcessoPendente(texto, resumo, tipo) {
  localStorage.setItem('processo_pendente', JSON.stringify({
    texto,
    resumo,
    tipo,
    timestamp: Date.now()
  }))
}

export function verificarProcessoPendente() {
  const salvo = localStorage.getItem('processo_pendente')
  if (!salvo) return null
  const data = JSON.parse(salvo)
  const agora = Date.now()
  const vigencia = 30 * 60 * 1000
  
  if (agora - data.timestamp > vigencia) {
    localStorage.removeItem('processo_pendente')
    return null
  }
  
  return data
}

export function limparProcessoPendente() {
  localStorage.removeItem('processo_pendente')
}

export async function iniciarPagamento({ tipo, usuarioId, usuarioEmail, texto, resumo }) {
  const url = KIWIFY_URLS[tipo]
  if (!url) {
    throw new Error('Tipo de plano inválido')
  }

  if (texto && resumo) {
    salvarProcessoPendente(texto, resumo, tipo)
  }

  const returnUrl = encodeURIComponent(`${APP_URL}?pagamento=sucesso&tipo=${tipo}`)
  const cancelUrl = encodeURIComponent(`${APP_URL}?pagamento=cancelado`)

  const urlComParams = `${url}?app_ref=${encodeURIComponent(usuarioId || 'anonimo')}&return_url=${returnUrl}&cancel_url=${cancelUrl}`

  window.location.href = urlComParams
}

export async function verificarPlano(supabase, usuarioId) {
  if (!usuarioId) return { plano: 'gratuito', ativo: false }

  const { data, error } = await supabase
    .from('profiles')
    .select('plano, plano_ativo, plano_expira')
    .eq('id', usuarioId)
    .single()

  if (error || !data) return { plano: 'gratuito', ativo: false }

  if (data.plano_ativo && data.plano_expira) {
    const expira = new Date(data.plano_expira)
    if (expira > new Date()) {
      return { plano: data.plano, ativo: true }
    }
  }

  return { plano: 'gratuito', ativo: false }
}

export async function verificarProcessoAvulso(supabase, usuarioId, processoHash) {
  if (!usuarioId || !processoHash) return false

  const { data, error } = await supabase
    .from('processos_avulsos')
    .select('id, expira_em')
    .eq('usuario_id', usuarioId)
    .eq('processo_hash', processoHash)
    .single()

  if (error || !data) return false

  const expira = new Date(data.expira_em)
  return expira > new Date()
}