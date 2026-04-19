export default function PagamentoPendente() {
  return (
    <div style={{ background: '#1a2b4a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 400, margin: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 style={{ color: '#f47820', marginBottom: 12 }}>Aguardando pagamento</h2>
        <p style={{ color: '#666', fontSize: 14 }}>
          Seu pagamento ainda está sendo processado. Você receberá uma confirmação por e-mail quando for aprovado.
        </p>
        <a href="/" style={{ display: 'block', marginTop: 24, background: '#1aaa8a', color: '#fff', borderRadius: 12, padding: '14px 0', textDecoration: 'none', fontWeight: 700 }}>
          Voltar ao Início
        </a>
      </div>
    </div>
  )
}