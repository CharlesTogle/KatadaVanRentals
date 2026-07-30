import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

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
            Email verification
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#071f52]">Your email has been verified</h1>
          <p className="mt-2 text-sm font-medium leading-7 text-[#071f52]/58">
            Your account is ready. Continue to your dashboard to finish setting up your profile and bookings.
          </p>

          <Button onClick={() => navigate('/dashboard')} className="mt-8 w-full bg-[#e92935] text-white hover:bg-[#c91f2a]" size="lg">
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
