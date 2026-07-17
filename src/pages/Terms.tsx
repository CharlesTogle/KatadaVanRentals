import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function Terms() {
  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-[800px] px-4 py-10 sm:px-6 sm:py-14">
        <Link to="/" className="mb-6 flex w-fit items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
          <ArrowLeft size={16} /> Back home
        </Link>

        <h1 className="text-4xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">Terms and Conditions</h1>
        <p className="mt-3 text-sm font-medium text-[#071f52]/48">Last updated: July 15, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-[#071f52]/72">
          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">1. Booking and Reservation</h2>
            <p>All bookings are subject to vehicle availability and confirmation by Katada Transportation Services. A booking is confirmed only after the customer receives a confirmation notice. Katada reserves the right to decline or cancel bookings due to vehicle unavailability, incomplete documentation, or payment issues.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">2. Rental Types</h2>
            <p><strong>All In:</strong> Includes van, driver, fuel estimate, and toll estimate. Actual fuel and toll are reconciled after the trip.</p>
            <p className="mt-2"><strong>All Out:</strong> Includes van and driver only. Fuel and toll are the customer's responsibility.</p>
            <p className="mt-2"><strong>Self Drive:</strong> Includes van only. A valid driver's license and valid ID must be uploaded before booking. Optional delivery and recovery fees may apply.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">3. Payment Terms</h2>
            <p>Payments can be made via bank transfer (BDO) or e-wallet (G-Cash). Self Drive bookings require a non-refundable down payment of 10% of the base rental. Remaining balances are due at pickup or vehicle release. All Out and All In bookings may require a deposit as determined by Katada.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">4. Cancellation Policy</h2>
            <p>Cancellations must be made in writing. Refund eligibility depends on the timing of cancellation and the rental type. Down payments for Self Drive bookings are non-refundable. Katada reserves the right to cancel bookings due to force majeure, safety concerns, or violation of terms.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">5. Customer Responsibilities</h2>
            <p>Customers must provide accurate information during booking. Self Drive customers must hold a valid driver's license and follow all traffic laws. The customer is responsible for any damage to the vehicle during the rental period, subject to assessment by Katada.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">6. Limitation of Liability</h2>
            <p>Katada Transportation Services shall not be liable for indirect, incidental, or consequential damages arising from the use of its vehicles or services. Total liability shall not exceed the total booking amount paid.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">7. Contact</h2>
            <p>For questions about these terms, contact us at tadsuu@gmail.com or +63 906 496 1248.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
