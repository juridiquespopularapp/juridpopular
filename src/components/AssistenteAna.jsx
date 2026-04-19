// src/components/AssistenteAna.jsx
import { useState, useRef, useEffect } from 'react'

const SYSTEM_PROMPT = `Voce e Ana, assistente juridica do Juridiques Popular.

REGRAS ABSOLUTAS:
- Fale APENAS o que esta no processo fornecido
- Respon duvidas sobre o conteudo do processo
- Traduza linguagem juridica para linguagem simples
- Se nao souber: "Nao esta no processo. Nao posso falar sobre isso."

LINGUAGEM:
- Portugues brasileiro simples
- Compreensivel por quem tem ensino fundamental
- Respostas curtas e diretas`

export default function AssistenteAna({ textoOriginal, resumo, traducao }) {
  const [mensagens, setMensagens] = useState([
    {
      role: 'assistant',
      content: 'Ola! Sou a Ana, sua assistente juridica. Posso responder perguntas sobre o documento. O que quer saber?'
    }
  ])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const fimRef = useRef(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function enviarMensagem() {
    if (!input.trim() || carregando) return

    const pergunta = input.trim()
    setInput('')
    setMensagens(prev => [...prev, { role: 'user', content: pergunta }])
    setCarregando(true)

    try {
      const contexto = `PROCESSO ATUAL:

=== RESUMO ===
${resumo}

=== TRADUCAO POPULAR ===
${traducao}

Pergunta: ${pergunta}`

      const resposta = await fetch('/api/ana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pergunta: contexto,
          historico: mensagens.slice(1)
        })
      })

      const dados = await resposta.json()

      if (!resposta.ok) throw new Error(dados.error || 'Erro ao consultar')

      setMensagens(prev => [...prev, { role: 'assistant', content: dados.resposta }])

    } catch (err) {
      setMensagens(prev => [...prev, {
        role: 'assistant',
        content: err.message || 'Ocorreu um erro. Tente novamente.'
      }])
    } finally {
      setCarregando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #1a2b4a', overflow: 'hidden', marginTop: 14 }}>
      <div style={{ background: '#1a2b4a', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: '#1aaa8a', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          JA
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Assistente Ana</div>
          <div style={{ fontSize: 11, color: '#1aaa8a', fontWeight: 600 }}>Tire duvidas - PLUS+</div>
        </div>
        <div style={{ marginLeft: 'auto', background: 'rgba(26,170,138,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#1aaa8a' }}>
          ONLINE
        </div>
      </div>

      <div style={{ height: 320, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc' }}>
        {mensagens.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%',
              background: msg.role === 'user' ? '#1a2b4a' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#333',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '10px 14px',
              fontSize: 13,
              lineHeight: 1.6,
              border: msg.role === 'assistant' ? '1px solid #e8e8e8' : 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}>
              {msg.role === 'assistant' && (
                <div style={{ fontSize: 10, fontWeight: 700, color: '#1aaa8a', marginBottom: 4 }}>ANA</div>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {carregando && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', fontSize: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1aaa8a', marginBottom: 4 }}>ANA</div>
              <span style={{ color: '#888' }}>Consultando...</span>
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <div style={{ padding: 12, background: '#fff', borderTop: '1px solid #e8e8e8', display: 'flex', gap: 8 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre o documento..."
          rows={2}
          style={{
            flex: 1, border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '10px 12px',
            fontSize: 13, fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none',
            color: '#333', lineHeight: 1.5
          }}
        />
        <button
          onClick={enviarMensagem}
          disabled={carregando || !input.trim()}
          style={{
            background: carregando || !input.trim() ? '#ccc' : '#1aaa8a',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '0 16px', fontSize: 18, cursor: 'pointer',
            flexShrink: 0, transition: 'background 0.2s'
          }}
        >
          Enviar
        </button>
      </div>

      <div style={{ padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #f0f0f0', fontSize: 10, color: '#aaa', textAlign: 'center' }}>
        Ana responde apenas sobre o documento - Nao substitui advogado
      </div>
    </div>
  )
}