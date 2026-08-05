import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { consumeRateLimit, formatRetryAfter } from '@/lib/auth-rate-limit'
import { supabase } from '@/lib/supabase'
import { showError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAppSettings } from '@/hooks/use-app-settings'
import { isValidEmail } from '@/lib/validation'

export default function ForgotPassword() {
  const { data: settings } = useAppSettings()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const trimmedEmail = email.trim()
  const canSubmit = isValidEmail(trimmedEmail) && !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const rateLimit = consumeRateLimit({
      key: `forgot-password:${trimmedEmail.toLowerCase() || 'unknown'}`,
      maxAttempts: 3,
      windowMs: 15 * 60 * 1000,
      cooldownMs: 15 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      setError(`Too many reset requests. Try again in ${formatRetryAfter(rateLimit.retryAfterMs)}.`)
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: new URL('/password/reset', window.location.origin).toString(),
    })

    if (error) {
      setError(showError(error))
    } else {
      setMessage('Check your email for a password reset link.')
    }

    setLoading(false)
  }

  return (
    <div
      className="grid h-[100dvh] bg-[#f7f9ff] text-[#071f52] lg:grid-cols-[0.95fr_1.05fr]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <section className="relative hidden overflow-hidden bg-[#071f52] p-8 text-white lg:flex lg:flex-col lg:gap-10 xl:p-10 xl:gap-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,217,35,0.34),transparent_28%),radial-gradient(circle_at_85%_75%,rgba(233,41,53,0.38),transparent_30%)]" />
        <Link to="/login" className="relative z-10 flex w-fit items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/16">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to sign in
        </Link>

        <div className="relative z-10">
          <div className="mb-6 overflow-hidden rounded-[32px] border-[10px] border-white/12 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
            <img src="/vehicle-sample.jpg" alt="Katada van interior with reclining seats" className="max-h-[50vh] w-full object-cover [object-position:center_30%]" />
          </div>
          <h1 className="max-w-[620px] text-4xl font-black leading-[0.98] tracking-[-0.055em] xl:text-5xl">
            Reset access without losing your trip details.
          </h1>
          <p className="mt-5 max-w-[480px] text-base font-medium leading-7 text-white/70">
            We&apos;ll send a secure link so you can get back to bookings, passengers, and upcoming travel plans.
          </p>
        </div>
      </section>

      <section className="flex min-h-0 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6">
        <Card className="w-full max-w-[460px] rounded-[30px] border-[#071f52]/10 bg-white shadow-[0_24px_70px_rgba(7,31,82,0.16)]">
          <CardHeader className="space-y-2 px-7 pb-4 pt-7 sm:px-8 sm:pt-8">
            <a href="/" className="mb-5 flex w-fit items-center gap-3">
              <img src={settings?.logo_url || '/logo.jpg'} alt={settings?.business_name || 'Katada Transportation Services'} className="h-12 w-12 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
              <span className="text-sm font-black leading-tight text-[#071f52]">{settings?.business_name || 'Katada Van Rentals'}</span>
            </a>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#ffd923]/70 px-4 py-2 text-xs font-black text-[#071f52]">
              <ShieldCheck size={15} aria-hidden="true" />
              Password reset
            </div>
            <CardTitle className="text-3xl font-black tracking-[-0.04em] text-[#071f52]">
              Forgot your password?
            </CardTitle>
            <CardDescription className="text-base font-medium leading-7 text-[#071f52]/66">
              Enter your account email and we&apos;ll send you a reset link.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-7 pb-7 sm:px-8 sm:pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {(error || message) && (
                <div className={cn(
                  'rounded-2xl border px-4 py-3 text-sm font-bold',
                  message
                    ? 'border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d]'
                    : 'border-[#e92935]/30 bg-[#e92935]/8 text-[#b91c1c]',
                )}>
                  {message || error}
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
                  autoComplete="email"
                  className={cn(
                    'block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:border-[#071f52] focus:ring-[#ffd923]/60',
                    trimmedEmail && (isValidEmail(trimmedEmail)
                      ? 'border-[#16a34a] focus:border-[#16a34a] focus:ring-[#16a34a]/30'
                      : 'border-[#e92935] focus:border-[#e92935] focus:ring-[#e92935]/30'),
                  )}
                />
              </div>

              <Button type="submit" disabled={!canSubmit} className="w-full bg-[#e92935] text-white hover:bg-[#c91f2a] focus-visible:ring-[#ffd923]" size="lg">
                {loading ? 'Sending reset link...' : 'Send reset link'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm font-medium text-[#071f52]/62">
              Remembered your password?{' '}
              <Link to="/login" className="font-black text-[#071f52] transition-colors hover:text-[#e92935]">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
