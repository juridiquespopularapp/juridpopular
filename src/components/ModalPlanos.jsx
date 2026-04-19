import { useState } from 'react'
import { iniciarPagamento } from '../lib/mercadopago'

export default function ModalPlanos({ onClose, usuario, onAbrirLogin }) {
  const [carregandoPagamento, setCarregandoPagamento] = useState(false)
  const [erroPagamento, setErroPagamento] = useState(null)

  const planos = [
    {
      id: 'gratuito',
      nome: 'Gratuito',
      preco: 'R$ 0',
      periodo: 'para sempre',
      cor: '#6b7280',
      corFundo: '#f9fafb',
      corBorda: '#e5e7eb',
      destaque: false,
      icone: '📄',
      recursos: [
        { texto: 'Até 12.800 caracteres por tradução', ok: true },
        { texto: 'Resumo do processo', ok: true },
        { texto: 'Tradução popular integral', ok: true },
        { texto: 'Acesso rápido aos tribunais', ok: true },
        { texto: 'Tradução ilimitada', ok: false },
        { texto: 'Download em PDF', ok: false },
        { texto: 'Ouvir tradução (voz)', ok: false },
        { texto: 'Assistente Ana', ok: false },
      ]
    },
    {
      id: 'pro',
      nome: 'PRO',
      preco: 'R$ 5,00',
      periodo: '/mês',
      cor: '#f47820',
      corFundo: '#fff7f0',
      corBorda: '#f47820',
      destaque: true,
      icone: '🔥',
      recursos: [
        { texto: 'Tudo do plano Gratuito', ok: true },
        { texto: 'Tradução ilimitada (sem limite)', ok: true },
        { texto: 'Download do resultado em PDF', ok: true },
        { texto: 'Ouvir tradução em voz (Text-to-Speech)', ok: true },
        { texto: 'Assistente Ana', ok: false },
      ]
    },
    {
      id: 'plus',
      nome: 'PLUS+',
      preco: 'R$ 5,00',
      periodo: '/mês',
      cor: '#1a2b4a',
      corFundo: '#f0f4ff',
      corBorda: '#1a2b4a',
      destaque: false,
      icone: '⭐',
      recursos: [
        { texto: 'Tudo do plano PRO', ok: true },
        { texto: 'Assistente Ana — tire dúvidas sobre seu documento', ok: true },
        { texto: 'Ana responde só dentro do documento (sem invenções)', ok: true },
        { texto: 'Prioridade no suporte', ok: true },
      ]
    }
  ]

  async function handleAssinar(planoId) {
    if (planoId === 'gratuito') { onClose(); return }
    if (!usuario) { onClose(); onAbrirLogin(); return }

    setCarregandoPagamento(true)
    setErroPagamento(null)

    try {
      const tipo = planoId === 'pro' ? 'pro_mensal' : 'plus_mensal'
      await iniciarPagamento({
        tipo,
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        processoHash: null
      })
    } catch (erro) {
      setErroPagamento(erro.message || 'Erro ao processar pagamento')
      setCarregandoPagamento(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.75)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      {/* Sheet que sobe de baixo — padrão mobile iOS/Android */}
      <div style={{
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        width: '100%',
        maxWidth: 560,
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '0 0 32px',
        WebkitOverflowScrolling: 'touch',
      }}>

        {/* Handle de arraste (visual) */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: '#e0e0e0' }} />
        </div>

        {/* Botão fechar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 0' }}>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 16, cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}>✕</button>
        </div>

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', padding: '8px 20px 20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e6f9f4', border: '1px solid #b3edd9', borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 600, color: '#0f7a5a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1aaa8a', display: 'inline-block' }}></span>
            Escolha seu plano
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: '#1a2b4a', margin: '0 0 6px', lineHeight: 1.2 }}>
            Acesso completo à<br /><span style={{ color: '#1aaa8a' }}>Justiça Simplificada</span>
          </h2>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Cancele quando quiser. Sem fidelidade.</p>
        </div>

        {/* Erro pagamento */}
        {erroPagamento && (
          <div style={{ margin: '0 16px 16px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 12, padding: 12, color: '#cc0000', fontSize: 13, textAlign: 'center' }}>
            {erroPagamento}
          </div>
        )}

        {/* Cards — empilhados verticalmente no mobile */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {planos.map(plano => (
            <div key={plano.id} style={{
              background: plano.corFundo,
              border: `2px solid ${plano.corBorda}`,
              borderRadius: 20,
              padding: '20px 18px',
              position: 'relative',
              boxShadow: plano.destaque ? '0 4px 20px rgba(244,120,32,0.15)' : 'none',
            }}>

              {/* Badge mais popular */}
              {plano.destaque && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#f47820', color: '#fff', borderRadius: 20, padding: '3px 14px', fontSize: 10, fontWeight: 700, letterSpacing: 1, whiteSpace: 'nowrap' }}>
                  ⭐ MAIS POPULAR
                </div>
              )}

              {/* Topo do card: ícone + nome + preço + botão na mesma linha */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{plano.icone}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: plano.cor, lineHeight: 1 }}>{plano.nome}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: '#1a2b4a' }}>{plano.preco}</span>
                      {plano.periodo}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleAssinar(plano.id)}
                  disabled={carregandoPagamento}
                  style={{
                    background: plano.id === 'gratuito' ? '#f0f0f0' : plano.cor,
                    color: plano.id === 'gratuito' ? '#555' : '#fff',
                    border: 'none', borderRadius: 12,
                    padding: '10px 16px', fontSize: 12, fontWeight: 700,
                    cursor: carregandoPagamento ? 'not-allowed' : 'pointer', letterSpacing: 0.5,
                    whiteSpace: 'nowrap', touchAction: 'manipulation',
                    minWidth: 90,
                    opacity: carregandoPagamento ? 0.6 : 1,
                  }}
                >
                  {carregandoPagamento ? '⏳ AGUARDE...' : plano.id === 'gratuito' ? 'GRÁTIS' : plano.id === 'pro' ? '🔥 ASSINAR' : '⭐ ASSINAR'}
                </button>
              </div>

              {/* Divisor */}
              <div style={{ height: 1, background: plano.id === 'gratuito' ? '#e5e7eb' : plano.id === 'pro' ? 'rgba(244,120,32,0.2)' : 'rgba(26,43,74,0.15)', marginBottom: 12 }} />

              {/* Lista de recursos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plano.recursos.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, opacity: r.ok ? 1 : 0.4 }}>
                    <div style={{
                      flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                      background: r.ok ? '#1aaa8a' : '#d0d0d0',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 1,
                    }}>
                      {r.ok ? '✓' : '✕'}
                    </div>
                    <span style={{ fontSize: 13, color: '#333', lineHeight: 1.4 }}>{r.texto}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div style={{ textAlign: 'center', padding: '20px 20px 0', fontSize: 11, color: '#aaa', lineHeight: 1.8 }}>
          🔒 Pagamento seguro via Mercado Pago<br />
          Ao assinar, você concorda com os Termos de Uso.
        </div>
      </div>
    </div>
  )
}
