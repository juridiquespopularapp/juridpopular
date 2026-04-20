import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { verificarPlano } from '../../lib/kiwify'

export default function PagamentoSucesso() {
  const [carregando, setCarregando] = useState(true)
  const [plano, setPlano] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    async function verificar() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { plano: p, ativo } = await verificarPlano(supabase, session.user.id)
          setPlano({ plano: p, ativo })
        }
      } catch (err) {
        setErro(err.message)
      } finally {
        setCarregando(false)
      }
    }
    verificar()
  }, [])

  if (carregando) {
    return (
      <div style={{ background: '#1a2b4a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
          <div style={{ fontSize: 18 }}>Verificando pagamento...</div>
        </div>
      </div>
    )
  }

  if (!plano?.ativo) {
    return (
      <div style={{ background: '#1a2b4a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 400, margin: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h2 style={{ color: '#1a2b4a', marginBottom: 12 }}>Pagamento em análise</h2>
          <p style={{ color: '#666', fontSize: 14 }}>
            Seu pagamento está sendo processado. Em até 48 horas você receberá a confirmação por e-mail.
          </p>
          <a href="/" style={{ display: 'block', marginTop: 24, background: '#1aaa8a', color: '#fff', borderRadius: 12, padding: '14px 0', textDecoration: 'none', fontWeight: 700 }}>
            Voltar ao Início
          </a>
        </div>
      </div>
    )
  }

  const nomePlano = plano.plano === 'plus' ? 'PLUS+' : 'PRO'

  return (
    <div style={{ background: '#1a2b4a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 400, margin: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: '#1aaa8a', marginBottom: 12 }}>Pagamento confirmado!</h2>
        <p style={{ color: '#666', fontSize: 14 }}>
          Bem-vindo ao plano <strong>{nomePlano}</strong>! Agora você tem acesso completo a todas as funcionalidades.
        </p>
        <a href="/" style={{ display: 'block', marginTop: 24, background: '#1aaa8a', color: '#fff', borderRadius: 12, padding: '14px 0', textDecoration: 'none', fontWeight: 700 }}>
          Começar a usar
        </a>
      </div>
    </div>
  )
}