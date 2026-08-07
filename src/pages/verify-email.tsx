import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react'

export default function VerifyEmail() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f9ff] px-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-full max-w-[440px]">
        <a href="/" className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
          <ArrowLeft size={16} /> Back home
        </a>

        <div className="rounded-[28px] border border-[#071f52]/10 bg-white p-8 shadow-[0_20px_60px_rgba(7,31,82,0.14)]">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#ffd923]/70 px-4 py-2 text-xs font-black text-[#071f52]">
            <ShieldCheck size={15} />
            Account checkpoint
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#071f52]">Your account is ready for setup</h1>
          <p className="mt-2 text-sm font-medium leading-7 text-[#071f52]/58">
            Your email is verified. Complete a short onboarding flow before you start exploring vans and making bookings.
          </p>

          <div className="mt-7 space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-[#16a34a]/20 bg-[#16a34a]/8 px-4 py-3">
              <CheckCircle2 size={18} className="shrink-0 text-[#16a34a]" />
              <div>
                <p className="text-sm font-black text-[#071f52]">Email verified</p>
                <p className="text-xs font-medium text-[#071f52]/52">Your account is confirmed.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#071f52]/12 bg-[#f7f9ff] px-4 py-3">
              <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#071f52] text-[10px] font-black text-white">2</div>
              <div>
                <p className="text-sm font-black text-[#071f52]">Finish your onboarding</p>
                <p className="text-xs font-medium text-[#071f52]/52">Confirm your details and rental preference.</p>
              </div>
            </div>
          </div>

          <Button onClick={() => navigate('/onboarding')} className="mt-7 w-full bg-[#e92935] text-white hover:bg-[#c91f2a]" size="lg">
            Continue to onboarding <ChevronRight size={17} />
          </Button>
        </div>
      </div>
    </div>
  )
}
