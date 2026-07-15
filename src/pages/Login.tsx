import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div
      className="grid min-h-[100dvh] bg-[#f7f9ff] text-[#071f52] lg:grid-cols-[0.95fr_1.05fr]"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <section className="relative hidden overflow-hidden bg-[#071f52] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,217,35,0.34),transparent_28%),radial-gradient(circle_at_85%_75%,rgba(233,41,53,0.38),transparent_30%)]" />
        <a href="/" className="relative z-10 flex w-fit items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/16">
          <ArrowLeft size={16} aria-hidden="true" />
          Back home
        </a>

        <div className="relative z-10">
          <div className="mb-8 overflow-hidden rounded-[32px] border-[10px] border-white/12 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
            <img src="/vehicle-sample.jpg" alt="Katada van interior with reclining seats" className="aspect-[5/4] w-full object-cover" />
          </div>
          <h1 className="max-w-[620px] text-5xl font-black leading-[0.98] tracking-[-0.055em]">
            Your booked trips stay in one place.
          </h1>
          <p className="mt-5 max-w-[480px] text-base font-medium leading-7 text-white/70">
            Sign in to check requests, passenger details, and upcoming Katada travel plans.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-[460px] rounded-[30px] border-[#071f52]/10 bg-white shadow-[0_24px_70px_rgba(7,31,82,0.16)]">
          <CardHeader className="space-y-2 px-7 pb-4 pt-7 sm:px-8 sm:pt-8">
            <a href="/" className="mb-5 flex w-fit items-center gap-3">
              <img src="/logo.jpg" alt="Katada Transportation Services" className="h-12 w-12 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
              <span className="text-sm font-black leading-tight text-[#071f52]">Katada Transportation</span>
            </a>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#ffd923]/70 px-4 py-2 text-xs font-black text-[#071f52]">
              <ShieldCheck size={15} aria-hidden="true" />
              Secure customer access
            </div>
            <CardTitle className="text-3xl font-black tracking-[-0.04em] text-[#071f52]">
              Welcome back
            </CardTitle>
            <CardDescription className="text-base font-medium leading-7 text-[#071f52]/66">
              Sign in to manage bookings and travel details.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-7 pb-7 sm:px-8 sm:pb-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-[#e92935]/30 bg-[#e92935]/8 px-4 py-3 text-sm font-bold text-[#b91c1c]">
                {error}
              </div>
            )}

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
                placeholder="Enter your password"
                className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:border-[#071f52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd923]/60"
              />
            </div>

            <div className="flex justify-end">
              <a
                href="/password/email"
                className="text-[13px] font-bold text-[#e92935] transition-colors hover:text-[#c91f2a]"
              >
                Forgot password?
              </a>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-[#e92935] text-white hover:bg-[#c91f2a] focus-visible:ring-[#ffd923]" size="lg">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm font-medium text-[#071f52]/62">
            Don&apos;t have an account?{' '}
            <a href="/register" className="font-black text-[#071f52] transition-colors hover:text-[#e92935]">
              Create one
            </a>
          </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
