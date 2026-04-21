// src/lib/kiwify.js
// Funções do frontend para iniciar pagamentos via Kiwify

const KIWIFY_URLS = {
  avulso: 'https://pay.kiwify.com.br/Pysxk5',
  pro_mensal: 'https://pay.kiwify.com.br/UZVkAvI',
  plus_mensal: 'https://pay.kiwify.com.br/rxjd1Xi'
}

export async function iniciarPagamento({ tipo, usuarioId, usuarioEmail }) {
  const url = KIWIFY_URLS[tipo]
  if (!url) {
    throw new Error('Tipo de plano inválido')
  }
  window.location.href = url
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