import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center', 
          background: '#fff', 
          borderRadius: 16, 
          margin: '20px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#cc0000', marginBottom: 12, fontFamily: "'Playfair Display', serif" }}>
            Algo deu errado
          </h2>
          <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>
            Erro: {this.state.error?.message || 'Erro desconhecido'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#1aaa8a', 
              color: 'white', 
              border: 'none', 
              borderRadius: 12, 
              padding: '12px 24px', 
              fontSize: 14, 
              fontWeight: 700, 
              cursor: 'pointer'
            }}
          >
            🔄 Recarregar Página
          </button>
          <details style={{ marginTop: 20, textAlign: 'left', fontSize: 12, color: '#888' }}>
            <summary>Detalhes técnicos (clique para expandir)</summary>
            <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 8, overflow: 'auto', maxHeight: 200 }}>
{this.state.error?.stack || 'Sem stack trace'}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

