import { Outlet } from 'react-router-dom'
import { CustomerHeader } from '@/components/customer-header'

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <CustomerHeader />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
