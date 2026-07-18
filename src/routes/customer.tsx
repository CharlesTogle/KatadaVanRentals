import { Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/protected-route'
import CustomerLayout from '@/components/customer-layout'
import CustomerDashboard from '@/pages/customer-dashboard'
import BookingForm from '@/pages/booking-form'
import BookingDetail from '@/pages/booking-detail'
import Notifications from '@/pages/notifications'
import Profile from '@/pages/profile'
import MyBookings from '@/pages/my-bookings'
import Documents from '@/pages/documents'

export const customerRoutes = (
  <Route
    element={
      <ProtectedRoute>
        <CustomerLayout />
      </ProtectedRoute>
    }
  >
    <Route path="/dashboard" element={<CustomerDashboard />} />
    <Route path="/dashboard/book/:vehicleId" element={<BookingForm />} />
    <Route path="/dashboard/bookings/:id" element={<BookingDetail />} />
    <Route path="/dashboard/notifications" element={<Notifications />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/bookings" element={<MyBookings />} />
    <Route path="/documents" element={<Documents />} />
  </Route>
)
