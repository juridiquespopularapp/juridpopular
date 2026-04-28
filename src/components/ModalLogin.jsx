import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ModalLogin({ onClose }) {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)

  async function handleEntrar() {
    if (!email || !senha) return setErro('Preencha e-mail e senha.')
    setCarregando(true)
    setErro(null)
    
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setCarregando(false)
    
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setErro('E-mail não confirmado. Clique em "Reenviar" abaixo.')
      } else if (error.message.includes('Invalid login credentials')) {
        setErro('E-mail ou senha incorretos.')
      } else {
        setErro('Erro: ' + error.message)
      }
      return
    }
    onClose()
  }

  async function handleCadastrar() {
    if (!email || !senha) return setErro('Preencha e-mail e senha.')
    if (senha.length < 6) return setErro('Senha deve ter pelo menos 6 caracteres.')
    
    setCarregando(true)
    setErro(null)
    
    const { error } = await supabase.auth.signUp({ 
      email, 
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}?login=sucesso`
      }
    })
    
    setCarregando(false)
    
    if (error) {
      if (error.message.includes('already registered')) {
        setErro('E-mail já cadastrado. Faça login ou recupere senha.')
        setModo('login')
      } else {
        setErro('Erro: ' + error.message)
      }
      return
    }
    
    setSucesso('Conta criada! Verifique seu e-mail (incluindo spam) para confirmar.')
    setModo('login')
  }

  async function handleRecuperar() {
    if (!email) return setErro('Digite seu e-mail primeiro.')
    setCarregando(true)
    setErro(null)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/resetar-senha`
    })
    
    setCarregando(false)
    
    if (error) {
      setErro('Erro ao enviar: ' + error.message)
      return
    }
    
    setSucesso('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
  }

  async function handleReenviarConfirmacao() {
    if (!email) return setErro('Digite seu e-mail primeiro.')
    setCarregando(true)
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    })
    
    setCarregando(false)
    
    if (error) {
      setErro('Erro: ' + error.message)
      return
    }
    
    setSucesso('Novo e-mail de confirmação enviado!')
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: '32px 24px',
        width: '100%', maxWidth: 400, position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', fontSize: 20, color: '#888', cursor: 'pointer'
        }}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            background: '#1a2b4a', borderRadius: 16, width: 60, height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 12px'
          }}>👤</div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif", textAlign: 'center',
            color: '#1a2b4a', fontSize: 22, fontWeight: 700, marginBottom: 6
          }}>
            {modo === 'login' ? 'Acesse sua Conta' : 'Criar nova conta'}
          </h2>
          <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 24 }}>
            {modo === 'login' ? 'Sincronize suas traduções e benefícios PRO' : 'Crie sua conta gratuitamente'}
          </p>
        </div>

        {erro && (
          <div style={{
            background: '#fff0f0', border: '1px solid #ffcccc',
            borderRadius: 8, padding: '10px 14px', color: '#cc0000',
            fontSize: 13, marginBottom: 16, textAlign: 'center'
          }}>{erro}</div>
        )}

        {sucesso && (
          <div style={{
            background: '#f0fff8', border: '1px solid #b3edd9',
            borderRadius: 8, padding: '10px 14px', color: '#0f7a5a',
            fontSize: 13, marginBottom: 16, textAlign: 'center'
          }}>{sucesso}</div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: '#888',
            letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6
          }}>E-MAIL</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={{
              width: '100%', background: '#f5f7fa', border: '1px solid #e0e0e0',
              borderRadius: 12, padding: '13px 16px', fontSize: 14, color: '#333',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: '#888',
            letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6
          }}>SENHA</label>
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="••••••"
            style={{
              width: '100%', background: '#f5f7fa', border: '1px solid #e0e0e0',
              borderRadius: 12, padding: '13px 16px', fontSize: 14, color: '#333',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={modo === 'login' ? handleEntrar : handleCadastrar}
          disabled={carregando}
          style={{
            width: '100%', background: '#1a2b4a', color: '#fff', border: 'none',
            borderRadius: 12, padding: 16, fontSize: 14, fontWeight: 700,
            letterSpacing: 1, cursor: 'pointer', marginBottom: 12,
            opacity: carregando ? 0.7 : 1
          }}>
          {carregando ? 'AGUARDE...' : modo === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
        </button>

        {modo === 'login' && (
          <>
            <button onClick={handleRecuperar} style={{
              width: '100%', background: '#e6f9f4', color: '#0f7a5a',
              border: 'none', borderRadius: 12, padding: 14, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', marginBottom: 8
            }}>
              🔄 RECUPERAR SENHA
            </button>
            
            <button onClick={handleReenviarConfirmacao} style={{
              width: '100%', background: '#f5f7fa', color: '#666',
              border: '1px solid #e0e0e0', borderRadius: 12, padding: 12,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 20
            }}>
              📧 REENVIAR CONFIRMAÇÃO
            </button>
          </>
        )}

        <div style={{ textAlign: 'center', fontSize: 13, color: '#888' }}>
          {modo === 'login' ? (
            <>Ainda não tem conta? <span onClick={() => { setModo('cadastro'); setErro(null); setSucesso(null) }} style={{ color: '#1aaa8a', fontWeight: 600, cursor: 'pointer' }}>Criar agora</span></>
          ) : (
            <>Já tem conta? <span onClick={() => { setModo('login'); setErro(null); setSucesso(null) }} style={{ color: '#1aaa8a', fontWeight: 600, cursor: 'pointer' }}>Fazer login</span></>
          )}
        </div>
      </div>
    </div>
  )
}