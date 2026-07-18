import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { logError, logFatal, resetRequestId } from './lib/logger'

resetRequestId()

window.addEventListener('error', (event) => {
  logFatal('client', 'Uncaught error', event.error ?? event.message, {
    path: window.location.pathname,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  logError('client', 'Unhandled promise rejection', event.reason, {
    path: window.location.pathname,
  })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
