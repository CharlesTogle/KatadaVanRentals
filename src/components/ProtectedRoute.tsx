import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { supabase } from '@/lib/supabase'

export function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setRole(null)
      return
    }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setRole(data?.role || 'customer')
      })
  }, [user])

  const fetchingRole = !!user && role === null

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
