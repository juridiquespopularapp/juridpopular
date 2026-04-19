// src/lib/mercadopago.js
// Funções do frontend para iniciar pagamentos

// ── Cria sessão e abre o Stripe Checkout ────────────────────────
export async function iniciarPagamento({ tipo, usuarioId, usuarioEmail, processoHash }) {
  try {
    console.log('Iniciando pagamento:', tipo, usuarioId)
    
    const resposta = await fetch('/api/criar-preferencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, usuarioId, usuarioEmail, processoHash })
    })

    const dados = await resposta.json()
    console.log('Resposta API:', dados)

    if (!resposta.ok) {
      throw new Error(dados.error || 'Erro ao criar pagamento')
    }

    // Redireciona para o Stripe Checkout
    if (dados.url) {
      window.location.href = dados.url
    } else {
      throw new Error('URL de pagamento não retornada')
    }

    return dados

  } catch (erro) {
    console.error('Erro ao iniciar pagamento:', erro)
    throw erro
  }
}

// ── Verifica se o usuário tem plano ativo no Supabase ─────────────
export async function verificarPlano(supabase, usuarioId) {
  if (!usuarioId) return { plano: 'gratuito', ativo: false }

  const { data, error } = await supabase
    .from('profiles')
    .select('plano, plano_ativo, plano_expira')
    .eq('id', usuarioId)
    .single()

  if (error || !data) return { plano: 'gratuito', ativo: false }

  // Verifica se o plano ainda está dentro da validade
  if (data.plano_ativo && data.plano_expira) {
    const expira = new Date(data.plano_expira)
    if (expira > new Date()) {
      return { plano: data.plano, ativo: true }
    }
  }

  return { plano: 'gratuito', ativo: false }
}

// ── Verifica se o usuário pagou por um processo avulso ────────────
export async function verificarProcessoAvulso(supabase, usuarioId, processoHash) {
  if (!usuarioId || !processoHash) return false

  const { data, error } = await supabase
    .from('processos_avulsos')
    .select('id, expira_em')
    .eq('usuario_id', usuarioId)
    .eq('processo_hash', processoHash)
    .single()

  if (error || !data) return false

  // Verifica se ainda está dentro do prazo de 7 dias
  const expira = new Date(data.expira_em)
  return expira > new Date()
}