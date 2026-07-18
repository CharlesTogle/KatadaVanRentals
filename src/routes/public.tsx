import { Route } from 'react-router-dom'
import Landing from '@/pages/landing'
import Login from '@/pages/login'
import Register from '@/pages/register'
import OurFleet from '@/pages/our-fleet'
import VehicleDetail from '@/pages/vehicle-detail'
import Contact from '@/pages/contact'
import Terms from '@/pages/terms'
import Privacy from '@/pages/privacy'
import VerifyEmail from '@/pages/verify-email'
import RegistrationAddress from '@/pages/registration-address'
import RegistrationDocuments from '@/pages/registration-documents'

export const publicRoutes = (
  <>
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
  </>
)
