import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Bell, CheckCheck } from 'lucide-react'

export default function Notifications() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[100dvh] bg-[#f7f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-[800px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-[-0.03em] text-[#071f52]">Notifications</h1>
            <p className="mt-1 text-sm font-medium text-[#071f52]/58">Stay updated on your bookings and account.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <CheckCheck size={14} /> Mark all read
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-[#071f52]/10 bg-white p-8 text-center shadow-[0_8px_24px_rgba(7,31,82,0.06)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f7f9ff]">
            <Bell size={24} className="text-[#071f52]/30" />
          </div>
          <p className="mt-4 text-sm font-bold text-[#071f52]">No notifications yet</p>
          <p className="mt-1 text-sm font-medium text-[#071f52]/48">
            You will see updates about your bookings here.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="mt-6 bg-[#071f52] text-white hover:bg-[#112458]" size="sm">
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
