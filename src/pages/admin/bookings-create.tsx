import { Link } from 'react-router-dom'
import { BookingCreateForm } from '@/components/admin/booking-create-form'

export default function AdminBookingsCreate() {
  return (
    <div className="px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#071f52]/48">Admin bookings</p>
          <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Create booking</h1>
        </div>
        <Link to="/admin/bookings" className="text-sm font-bold text-[#071f52]/60 hover:text-[#071f52]">Back to bookings</Link>
      </div>
      <div className="mt-6">
        <BookingCreateForm />
      </div>
    </div>
  )
}
