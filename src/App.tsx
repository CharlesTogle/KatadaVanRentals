import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import CustomerLayout from './components/CustomerLayout'
import AdminLayout from './components/AdminLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import OurFleet from './pages/OurFleet'
import VehicleDetail from './pages/VehicleDetail'
import Contact from './pages/Contact'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import VerifyEmail from './pages/VerifyEmail'
import RegistrationAddress from './pages/RegistrationAddress'
import RegistrationDocuments from './pages/RegistrationDocuments'
import CustomerDashboard from './pages/CustomerDashboard'
import BookingForm from './pages/BookingForm'
import BookingDetail from './pages/BookingDetail'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import MyBookings from './pages/MyBookings'
import Documents from './pages/Documents'
import Dashboard from './pages/admin/Dashboard'
import AdminBookings from './pages/admin/Bookings'
import Customers from './pages/admin/Customers'
import Fleet from './pages/admin/Fleet'
import AdminSettings from './pages/admin/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/our-fleet" element={<OurFleet />} />
          <Route path="/our-fleet/:slug" element={<VehicleDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/registration/address" element={<RegistrationAddress />} />
          <Route path="/registration/documents" element={<RegistrationDocuments />} />

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
            <Route path="settings/password" element={<AdminSettings tab="password" />} />
            <Route path="settings/business" element={<AdminSettings tab="business" />} />
            <Route path="settings/team" element={<AdminSettings tab="team" />} />
            <Route path="settings/payments" element={<AdminSettings tab="payments" />} />
            <Route path="settings/documents" element={<AdminSettings tab="documents" />} />
            <Route path="settings/integrations" element={<AdminSettings tab="integrations" />} />
            <Route path="settings/pickup" element={<AdminSettings tab="pickup" />} />
            <Route path="settings/email-log" element={<AdminSettings tab="email-log" />} />
            <Route path="settings/content" element={<AdminSettings tab="content" />} />
            <Route path="settings/domain" element={<AdminSettings tab="domain" />} />
            <Route path="settings/email" element={<AdminSettings tab="email" />} />
            <Route path="settings/help" element={<AdminSettings tab="help" />} />
            <Route path="reports/revenue" element={<div className="px-4 py-8"><h1 className="text-2xl font-bold text-gray-900">Revenue Report</h1><div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">No payment data for this period.</div></div>} />
            <Route path="reports/utilization" element={<div className="px-4 py-8"><h1 className="text-2xl font-bold text-gray-900">Vehicle Utilization</h1><div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">No data yet.</div></div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
