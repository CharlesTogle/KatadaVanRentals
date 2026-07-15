import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CalendarCheck } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    if (error) {
      setError(error.message)
    } else {
      setError('Check your email for a confirmation link.')
    }

    setLoading(false)
  }

  return (
    <div
      className="grid h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#f7f9ff] text-[#071f52] lg:grid-cols-[0.95fr_1.05fr]"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <section className="relative hidden overflow-hidden bg-[#071f52] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,217,35,0.34),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(233,41,53,0.38),transparent_30%)]" />
        <a href="/" className="relative z-10 flex w-fit items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/16">
          <ArrowLeft size={16} aria-hidden="true" />
          Back home
        </a>

        <div className="relative z-10">
          <div className="mb-6 overflow-hidden rounded-[32px] border-[10px] border-white/12 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
            <img src="/van-1.jpg" alt="Clean Katada van cabin seating" className="aspect-[5/4] w-full object-cover" />
          </div>
          <h1 className="max-w-[600px] text-4xl font-black leading-[0.98] tracking-[-0.055em] xl:text-5xl">
            Book faster when the road calls.
          </h1>
          <p className="mt-5 max-w-[480px] text-base font-medium leading-7 text-white/70">
            Create your profile once, then request vans for airport transfers, family trips, and group travel.
          </p>
        </div>
      </section>

      <section className="flex min-h-0 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6">
        <Card className="w-full max-w-[480px] rounded-[30px] border-[#071f52]/10 bg-white shadow-[0_24px_70px_rgba(7,31,82,0.16)]">
          <CardHeader className="space-y-2 px-7 pb-4 pt-7 sm:px-8 sm:pt-8">
            <a href="/" className="mb-5 flex w-fit items-center gap-3">
              <img src="/logo.jpg" alt="Katada Transportation Services" className="h-12 w-12 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
              <span className="text-sm font-black leading-tight text-[#071f52]">Katada Transportation</span>
            </a>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#ffd923]/70 px-4 py-2 text-xs font-black text-[#071f52]">
              <CalendarCheck size={15} aria-hidden="true" />
              Start your booking
            </div>
            <CardTitle className="text-3xl font-black tracking-[-0.04em] text-[#071f52]">
              Create an account
            </CardTitle>
            <CardDescription className="text-base font-medium leading-7 text-[#071f52]/66">
              Save your details once and make future van requests faster.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-7 pb-7 sm:px-8 sm:pb-8">
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className={cn(
                  'rounded-2xl border px-4 py-3 text-sm font-bold',
                  error.includes('confirmation')
                    ? 'border-[#071f52]/18 bg-[#ffd923]/28 text-[#071f52]'
                    : 'border-[#e92935]/30 bg-[#e92935]/8 text-[#b91c1c]'
                )}>
                  {error}
                </div>
              )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-bold text-[#071f52]">
                Full name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-bold text-[#071f52]">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-bold text-[#071f52]">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-[#e92935] text-white hover:bg-[#c91f2a] focus-visible:ring-[#ffd923]" size="lg">
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
            </form>

          <p className="mt-6 text-center text-sm font-medium text-[#071f52]/62">
            Already have an account?{' '}
            <a href="/login" className="font-black text-[#071f52] transition-colors hover:text-[#e92935]">
              Sign in
            </a>
          </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function cn(...inputs: (string | undefined | false | null)[]) {
  return inputs.filter(Boolean).join(' ')
}
