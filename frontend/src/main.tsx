import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { ConnectionProvider } from './context/ConnectionContext.jsx'
import { TemaProvider, leerTemaGuardado } from './context/TemaContext.jsx'
import './styles/index.css'
import App from './App.tsx'

// Aplicar el tema ANTES del primer render para evitar el destello
// del color incorrecto mientras React monta
document.documentElement.dataset.tema = leerTemaGuardado()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ConnectionProvider>
        <AuthProvider>
          <CartProvider>
            <TemaProvider>
              <App />
            </TemaProvider>
          </CartProvider>
        </AuthProvider>
      </ConnectionProvider>
    </BrowserRouter>
  </StrictMode>,
)