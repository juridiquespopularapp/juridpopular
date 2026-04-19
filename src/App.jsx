import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import PagamentoSucesso from './pages/pagamento/sucesso'
import PagamentoFalha from './pages/pagamento/falha'
import PagamentoPendente from './pages/pagamento/pendente'
import ErrorBoundary from './ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pagamento/sucesso" element={<PagamentoSucesso />} />
        <Route path="/pagamento/falha" element={<PagamentoFalha />} />
        <Route path="/pagamento/pendente" element={<PagamentoPendente />} />
      </Routes>
    </ErrorBoundary>
  )
}
