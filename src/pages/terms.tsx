import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { CustomerShellFrame } from '@/components/customer-shell-frame'
import { useAuth } from '@/contexts/useAuth'
import { useBusinessInfo } from '@/hooks/use-business-info'
import { useProfile } from '@/hooks/use-profile'
import { isAdminRole } from '@/lib/rbac'

export default function Terms() {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const business = useBusinessInfo()
  const inCustomerShell = !!user && !isAdminRole(profile?.role)

  const content = (
    <div className="mx-auto max-w-[800px] px-4 py-10 sm:px-6 sm:py-14">
      <Link to="/" className="mb-6 flex w-fit items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
        <ArrowLeft size={16} /> Back home
      </Link>

      <h1 className="text-4xl font-black tracking-[-0.04em] text-[#071f52] sm:text-5xl">Terms and Conditions</h1>
      <p className="mt-3 text-sm font-medium text-[#071f52]/48">Last updated: August 10, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-[#071f52]/72">
        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">1. Booking and Reservation</h2>
          <p>All bookings are subject to vehicle availability and confirmation by the Admins. A booking is confirmed only after the customer receives a confirmation notice. The Admins reserve the right to decline or cancel bookings due to vehicle unavailability, incomplete documentation, or payment issues.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">2. Rental Types</h2>
          <p><strong>All In:</strong> Includes van and driver. Fuel and toll amounts shown before the trip are estimates only. Katada records the actual fuel and toll amounts when the trip is completed and adds the reconciliation to the final booking total. Any resulting balance is due when the vehicle is returned.</p>
          <p className="mt-2"><strong>All Out:</strong> Includes van and driver only. Fuel and toll are the customer's responsibility.</p>
          <p className="mt-2"><strong>Self Drive:</strong> Includes van only. A valid driver's license, valid government ID, and proof of billing must be uploaded before booking. Optional delivery and recovery fees may apply.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">3. Payment Terms</h2>
          <p>Payments can be made via bank transfer (BDO) or e-wallet (GCash). Bookings require a down payment based on the reservation percentage configured for the selected booking. The applicable percentage and amount are shown during booking. The remaining balance is due at pickup or vehicle release. Any separate security deposit, if applicable, is shown in the booking price breakdown and may be applied to eligible charges under these terms.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">4. Cancellation Policy</h2>
          <p>Customers may request cancellation while a booking is in For Review, Awaiting Documents, Pending Price Approval, or Confirmed, provided the booking is otherwise eligible for cancellation. Pending Price Approval cancellations are available only when the booking includes a price adjustment awaiting the customer's decision. All In and All Out bookings canceled in For Review or Awaiting Documents are placed into refund review. A refund review may result in a full or partial refund of the recorded down payment, up to the applicable security deposit amount, or no refund. Pending Price Approval and Confirmed cancellations are non-refundable. The Admins will record the refund decision and reason; if processed, the refunded payment and any available refund proof will be reflected in the booking record. Self Drive payments are non-refundable regardless of booking status. Once a trip has started, customer cancellations are not available. The Admins may cancel a booking due to force majeure, safety concerns, vehicle or operational requirements, or violation of these terms. Any refund resulting from an Admin cancellation will be determined based on the circumstances and applicable refund review.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">5. Customer Responsibilities</h2>
          <p>Customers must provide accurate information during booking. Self Drive customers must hold a valid driver's license and follow all traffic laws. The customer is responsible for damage to the vehicle beyond ordinary wear and tear when caused during the rental period by the customer or the customer's use of the vehicle. Katada may document the vehicle's condition and notify the customer of any damage claim. Charges will be based on reasonable repair, replacement, cleaning, or related recovery costs, and customers may contact Katada to question or dispute a claim.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">6. Limitation of Liability</h2>
          <p>To the extent permitted by law, Katada Transportation Services shall not be liable for indirect, incidental, or consequential loss arising from the use of its vehicles or services. Nothing in these terms excludes or limits liability for fraud, willful misconduct, gross negligence, death or personal injury caused by negligence, or any liability that cannot legally be excluded or limited. Subject to those exceptions and applicable consumer rights, total liability shall not exceed the total booking amount paid.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-black tracking-[-0.02em] text-[#071f52]">7. Contact</h2>
          <p>These terms are governed by the laws of the Philippines. Customers should first contact Katada Transportation Services at {business.support_email} or {business.support_phone} to raise a complaint or dispute. Katada will review the concern and respond through the contact details provided by the customer. If the matter cannot be resolved, it may be brought before the appropriate courts or government consumer-protection authority in Pasay City, Metro Manila, subject to any mandatory consumer remedies or venue rules under applicable law.</p>
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
