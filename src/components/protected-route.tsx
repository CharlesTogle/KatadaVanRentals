import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { useProfile } from '@/hooks/use-profile'

export function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth()

  const { data: profile, isLoading: fetchingRole } = useProfile(user?.id)
  const role = profile?.role

  if (loading || fetchingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const isAdmin = role === 'admin' || role === 'manager' || role === 'staff'

  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  if (!adminOnly && isAdmin) return <Navigate to="/admin" replace />

  return <>{children}</>
}
