import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// basename via BASE_URL (não hardcoded): em dev é "/", em produção no GitHub
// Pages é "/master-nfc-central/" (ver vite.config.js `base`) — sem isso a
// navegação interna do React Router ia pedir caminho a partir da raiz do
// domínio, que no Pages de projeto não existe.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
