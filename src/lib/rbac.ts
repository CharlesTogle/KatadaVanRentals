import type { AccountRole } from '@/types/profile'

export function isAdminRole(role?: AccountRole | null) {
  return role === 'admin' || role === 'manager' || role === 'staff'
}
