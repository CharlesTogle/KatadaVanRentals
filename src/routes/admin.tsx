import { Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/protected-route'
import AdminLayout from '@/components/admin-layout'
import Dashboard from '@/pages/admin/dashboard'
import AdminBookings from '@/pages/admin/bookings'
import AdminBookingsCreate from '@/pages/admin/bookings-create'
import BookingDetail from '@/pages/admin/booking-detail'
import Customers from '@/pages/admin/customers'
import CustomerDetail from '@/pages/admin/customer-detail'
import Fleet from '@/pages/admin/fleet'
import FleetNew from '@/pages/admin/fleet/new'
import AdminSettings from '@/pages/admin/settings'
import RevenueReport from '@/pages/admin/revenue-report'
import UtilizationReport from '@/pages/admin/utilization-report'
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
    <Route path="bookings/create" element={<AdminBookingsCreate />} />
    <Route path="bookings/:bookingNumber" element={<BookingDetail />} />
    <Route path="customers" element={<Customers />} />
    <Route path="customers/:customerId" element={<CustomerDetail />} />
    <Route path="fleet" element={<Fleet />} />
    <Route path="fleet/new" element={<FleetNew />} />
    <Route path="settings" element={<AdminSettings />} />
    <Route path="reports/revenue" element={<RevenueReport />} />
    <Route path="reports/utilization" element={<UtilizationReport />} />
  </Route>
)
