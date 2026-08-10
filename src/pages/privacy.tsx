import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { CustomerShellFrame } from '@/components/customer-shell-frame'
import { useAuth } from '@/contexts/useAuth'
import { useBusinessInfo } from '@/hooks/use-business-info'
import { useProfile } from '@/hooks/use-profile'
import { isAdminRole } from '@/lib/rbac'

export default function Privacy() {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const business = useBusinessInfo()
  const inCustomerShell = !!user && !isAdminRole(profile?.role)

  const content = (
    <div className="mx-auto max-w-[800px] px-4 py-10 sm:px-6 sm:py-14">
      <Link to="/" className="mb-6 flex w-fit items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
        <ArrowLeft size={16} /> Back home
      </Link>

      <h1 className="text-4xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">Privacy Policy</h1>
      <p className="mt-3 text-sm font-medium text-[#071f52]/48">Last updated: August 10, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-[#071f52]/72">
        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">1. Who We Are</h2>
          <p>Katada Transportation Services, operating as Katada Van Rentals, is responsible for the personal information processed through this service. Our business address is {business.business_address}, {business.city}, {business.province}. For privacy questions, contact us using the details in Section 11.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">2. Information We Collect</h2>
          <p>We collect information you provide during registration and booking, including your name, email address, phone number, home address, driver's license, other valid government ID, proof of billing, and booking preferences. We also collect pickup and drop-off locations, travel dates, rental details, payment method, payment amount, payment reference, and payment receipts you submit. A driver's license and government-issued ID may be sensitive personal information under Philippine law.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">3. How We Use Your Information and Legal Bases</h2>
          <p>We use your information to create and manage accounts, process and verify bookings, confirm identity and eligibility, communicate trip details, record payments, provide customer support, improve our services, prevent fraud, and comply with legal obligations. Processing is based on the steps needed to provide our booking service or perform a contract, compliance with legal obligations, our legitimate interests where those interests do not override your rights, and consent where consent is required. We do not sell your personal information.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">4. Sharing and Service Providers</h2>
          <p>We may disclose information to authorized Katada personnel and service providers that help us operate the service, including hosting, storage, email, security, and payment-recording providers. We may also disclose information when required by law, court order, or lawful government request, or when necessary to establish, exercise, or defend legal claims. These providers may process information outside the Philippines. We remain responsible for using appropriate contractual or other safeguards when information is transferred to third parties.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">5. Data Storage and Security</h2>
          <p>We use Supabase and other service providers to host and process information on our behalf. We apply reasonable and appropriate organizational, physical, and technical safeguards against unauthorized access, alteration, disclosure, loss, destruction, and other unlawful processing. Document uploads are protected by restricted access controls. No internet transmission or storage system can be guaranteed to be completely secure.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">6. Document Retention</h2>
          <p>Uploaded documents, including driver's licenses, valid IDs, and proofs of billing, are retained only for as long as necessary for booking administration, identity verification, dispute resolution, legitimate business purposes, and legal or regulatory obligations. We securely delete or anonymize documents when they are no longer required. You may request deletion, subject to legal or operational exceptions, by contacting us.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">7. Cookies and Similar Technologies</h2>
          <p>We use necessary cookies and similar browser technologies to support account sessions, security, and core site functionality. If optional analytics or other tracking technologies are enabled, we will provide appropriate notice and request consent where required. You can also manage cookies through your browser settings, although disabling necessary cookies may affect the service.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">8. Your Rights</h2>
          <p>Subject to applicable law, you may ask whether we process your information, request access to it and information about its source and recipients, request correction of inaccurate information, request deletion or blocking when the information is no longer necessary or was unlawfully processed, object to certain processing, withdraw consent where consent is the legal basis, and request a copy in a structured electronic format. You may also lodge a complaint with the National Privacy Commission. To exercise these rights, contact us at {business.support_email}.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">9. Security Incidents</h2>
          <p>We investigate suspected privacy and security incidents. Where required by Philippine law, we will notify the National Privacy Commission and affected individuals of a personal data breach and the measures taken to address it.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">10. Retention and Policy Changes</h2>
          <p>We retain personal information only for as long as needed for the purposes described here, including completing bookings, maintaining business and tax records, resolving disputes, and complying with legal obligations. We may update this policy when our processing practices or legal obligations change. We will post the updated version on this page and revise the date above.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">11. Contact and Complaints</h2>
          <p>For privacy-related inquiries or requests, contact Katada Transportation Services at {business.support_email} or {business.support_phone}. You may also contact the National Privacy Commission through its official website at <a href="https://privacy.gov.ph/" target="_blank" rel="noreferrer" className="font-bold text-[#e92935] hover:underline">privacy.gov.ph</a> if you believe your privacy rights have been violated.</p>
        </section>
      </div>
    </div>
  )

  return inCustomerShell
    ? <CustomerShellFrame>{content}</CustomerShellFrame>
    : (
      <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <AppHeader />
        {content}
      </div>
    )
}
