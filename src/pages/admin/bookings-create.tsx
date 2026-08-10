import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { BookingCreateForm } from '@/components/admin/booking-create-form'

export default function AdminBookingsCreate() {
  const { search } = useLocation()

  return (
    <div className="mx-auto max-w-[1240px] py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Link to={`/admin/bookings${search}`} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#071f52]">
        <ArrowLeft size={16} /> Back to bookings
      </Link>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Create booking</h1>
        </div>
      </div>
      <BookingCreateForm />
    </div>
  )
}
