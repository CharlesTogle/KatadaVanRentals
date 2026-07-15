import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import CustomerLayout from './components/CustomerLayout'
import AdminLayout from './components/AdminLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
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

          <Route
            element={
              <ProtectedRoute>
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/profile" element={<Profile />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/documents" element={<Documents />} />
          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="customers" element={<Customers />} />
            <Route path="fleet" element={<Fleet />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
