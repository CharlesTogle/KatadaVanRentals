import { Outlet } from 'react-router-dom'
import { CustomerShellFrame } from '@/components/customer-shell-frame'

export default function CustomerLayout() {
  return (
    <CustomerShellFrame>
      <Outlet />
    </CustomerShellFrame>
  )
}
