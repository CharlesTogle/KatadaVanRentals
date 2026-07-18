import { Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/protected-route'
import AdminLayout from '@/components/admin-layout'
import Dashboard from '@/pages/admin/dashboard'
import AdminBookings from '@/pages/admin/bookings'
import Customers from '@/pages/admin/customers'
import Fleet from '@/pages/admin/fleet'
import AdminSettings from '@/pages/admin/settings'
import RevenueReport from '@/pages/admin/revenue-report'
import UtilizationReport from '@/pages/admin/utilization-report'

const settingsTabs = [
  'password', 'business', 'team', 'payments', 'documents',
  'integrations', 'pickup', 'email-log', 'content', 'domain',
  'email', 'help',
] as const

export const adminRoutes = (
  <Route
    path="/admin"
    element={
      <ProtectedRoute adminOnly>
        <AdminLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Dashboard />} />
    <Route path="bookings" element={<AdminBookings />} />
    <Route path="customers" element={<Customers />} />
    <Route path="fleet" element={<Fleet />} />
    <Route path="settings" element={<AdminSettings />} />
    {settingsTabs.map((tab) => (
      <Route
        key={tab}
        path={`settings/${tab}`}
        element={<AdminSettings tab={tab} />}
      />
    ))}
    <Route path="reports/revenue" element={<RevenueReport />} />
    <Route path="reports/utilization" element={<UtilizationReport />} />
  </Route>
)
