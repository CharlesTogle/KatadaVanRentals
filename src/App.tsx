import { BrowserRouter, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider } from './contexts/auth-context'
import { ErrorBoundary } from './components/error-boundary'
import { publicRoutes } from './routes/public'
import { customerRoutes } from './routes/customer'
import { adminRoutes } from './routes/admin'

export default function App() {
  const [globalError, setGlobalError] = useState(false)

  useEffect(() => {
    const handleGlobalError = () => {
      setGlobalError(true)
      window.setTimeout(() => setGlobalError(false), 8000)
    }
    window.addEventListener('app:unhandled-error', handleGlobalError)
    return () => window.removeEventListener('app:unhandled-error', handleGlobalError)
  }, [])

  return (
    <ErrorBoundary>
      {globalError ? <div role="alert" className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-[#e92935]/25 bg-white px-4 py-3 text-sm font-bold text-[#b91c1c] shadow-lg">Something went wrong. Please retry or contact support.</div> : null}
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {publicRoutes}
            {customerRoutes}
            {adminRoutes}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
