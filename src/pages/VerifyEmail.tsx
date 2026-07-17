import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

export default function VerifyEmail() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (i: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const next = [...otp]
    next[i] = value
    setOtp(next)
    if (value && i < 5) {
      const input = document.getElementById(`otp-${i + 1}`)
      input?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // ponytail: actual OTP verification against Supabase
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    navigate('/dashboard')
  }

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
          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#071f52]">Check your email</h1>
          <p className="mt-2 text-sm font-medium leading-7 text-[#071f52]/58">
            Enter the 6-digit code sent to your email address.
          </p>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  className="h-12 w-11 rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] text-center text-lg font-black text-[#071f52] transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60 sm:h-14 sm:w-13"
                />
              ))}
            </div>

            <Button type="submit" disabled={loading || otp.some((d) => !d)} className="mt-8 w-full bg-[#e92935] text-white hover:bg-[#c91f2a]" size="lg">
              {loading ? 'Verifying...' : 'Verify email'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm font-medium text-[#071f52]/48">
            Did not get a code?{' '}
            <button type="button" className="font-black text-[#071f52] transition-colors hover:text-[#e92935]">
              Resend
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
