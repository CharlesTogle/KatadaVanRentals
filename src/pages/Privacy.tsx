import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Privacy() {
  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-[800px] px-4 py-10 sm:px-6 sm:py-14">
        <Link to="/" className="mb-6 flex w-fit items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
          <ArrowLeft size={16} /> Back home
        </Link>

        <h1 className="text-4xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm font-medium text-[#071f52]/48">Last updated: July 15, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-[#071f52]/72">
          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">1. Information We Collect</h2>
            <p>We collect personal information you provide during registration and booking, including your name, email address, phone number, home address, driver's license, valid ID, proof of billing, and payment details. We also collect booking data such as pickup and drop-off locations, travel dates, and rental preferences.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">2. How We Use Your Information</h2>
            <p>Your information is used to process bookings, verify identity, communicate trip details, process payments, comply with legal obligations, and improve our services. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">3. Data Storage and Security</h2>
            <p>Your data is stored securely on Supabase servers. We implement reasonable security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. Document uploads are stored with restricted access controls.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">4. Document Retention</h2>
            <p>Uploaded documents (driver's license, valid ID, proof of billing) are retained while your account is active and for a reasonable period after account closure to comply with legal and regulatory requirements. You may request deletion of your documents by contacting us.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">5. Cookies and Tracking</h2>
            <p>We may use cookies and similar tracking technologies to improve your browsing experience and analyze site usage. You can control cookie preferences through your browser settings.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">6. Your Rights</h2>
            <p>You have the right to access, update, or delete your personal information. You may also request a copy of the data we hold about you. To exercise these rights, contact us at tadsuu@gmail.com.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">7. Contact</h2>
            <p>For privacy-related inquiries, contact Katada Transportation Services at tadsuu@gmail.com or +63 906 496 1248.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
