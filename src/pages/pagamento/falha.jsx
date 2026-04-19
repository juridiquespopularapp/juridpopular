export default function PagamentoFalha() {
  return (
    <div style={{ background: '#1a2b4a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 400, margin: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😞</div>
        <h2 style={{ color: '#cc0000', marginBottom: 12 }}>Pagamento não concluído</h2>
        <p style={{ color: '#666', fontSize: 14 }}>
          O pagamento não foi processado. Tente novamente ou escolha outro método de pagamento.
        </p>
        <a href="/" style={{ display: 'block', marginTop: 24, background: '#1aaa8a', color: '#fff', borderRadius: 12, padding: '14px 0', textDecoration: 'none', fontWeight: 700 }}>
          Tentar novamente
        </a>
      </div>
    </div>
  )
}