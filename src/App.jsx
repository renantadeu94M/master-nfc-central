import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import NfcCentralPage from './pages/NfcCentralPage'
import './App.css'

// Uma rota só por enquanto. O roteador já está aqui de propósito: a central vai
// ganhar irmãs (relatório de toques, checklist de limpeza), e a estrutura é a
// mesma do Master Lock Automation pra que as telas possam migrar entre os dois
// projetos sem reescrita.
//
// Sem lazy loading ainda — com uma página só, o chunk separado só adicionaria
// um round-trip antes do primeiro paint.

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<NfcCentralPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
