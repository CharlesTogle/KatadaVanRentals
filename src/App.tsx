import { BrowserRouter, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/auth-context'
import { ErrorBoundary } from './components/error-boundary'
import { publicRoutes } from './routes/public'
import { customerRoutes } from './routes/customer'
import { adminRoutes } from './routes/admin'

export default function App() {
  return (
    <ErrorBoundary>
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
