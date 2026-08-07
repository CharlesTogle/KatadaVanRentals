import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { showError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CalendarCheck, Check, Eye, EyeOff, X } from 'lucide-react'
import { consumeRateLimit, formatRetryAfter } from '@/lib/auth-rate-limit'
import { useAppSettings } from '@/hooks/use-app-settings'
import { cn } from '@/lib/utils'
import { getPasswordRequirementChecks, isValidEmail, isValidPassword } from '@/lib/validation'
import { AUTH_MESSAGES } from '@/constants/auth'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { data: settings } = useAppSettings()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loading, setLoading] = useState(false)
  const passwordChecks = getPasswordRequirementChecks(password)
  const trimmedEmail = email.trim()
  const canSubmit = isValidEmail(trimmedEmail) && isValidPassword(password) && !loading

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setShowLoginPrompt(false)
    setLoading(true)

    if (!isValidPassword(password)) {
      setError(AUTH_MESSAGES.errors.weak_password)
      setLoading(false)
      return
    }

    const rateLimit = consumeRateLimit({
      key: `register:${trimmedEmail.toLowerCase() || 'unknown'}`,
      maxAttempts: 3,
      windowMs: 15 * 60 * 1000,
      cooldownMs: 15 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      setError(`Too many sign-up attempts. Try again in ${formatRetryAfter(rateLimit.retryAfterMs)}.`)
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: new URL('/verify-email', window.location.origin).toString(),
      },
    })

    if (error) {
      setError(showError(error))
    } else if (data.user?.identities?.length === 0) {
      setError('This email already exists. Do you want to log in instead?')
      setShowLoginPrompt(true)
    } else {
      setSuccess(AUTH_MESSAGES.success.confirmation_link_sent)
    }

    setLoading(false)
  }

  return (
    <div
      className="grid h-[100dvh] bg-[#f7f9ff] text-[#071f52] lg:grid-cols-[0.95fr_1.05fr]"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <section className="relative hidden overflow-hidden bg-[#071f52] p-8 text-white lg:flex lg:flex-col lg:gap-10 xl:p-10 xl:gap-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,217,35,0.34),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(233,41,53,0.38),transparent_30%)]" />
        <a href="/" className="relative z-10 flex w-fit items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/16">
          <ArrowLeft size={16} aria-hidden="true" />
          Back home
        </a>

        <div className="relative z-10">
          <div className="mb-6 overflow-hidden rounded-[32px] border-[10px] border-white/12 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
            <img src="/van-1.jpg" alt="Clean Katada van cabin seating" className="max-h-[50vh] w-full object-cover" />
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
              <img src={settings?.logo_url || '/logo.jpg'} alt={settings?.business_name || 'Katada Transportation Services'} className="h-12 w-12 rounded-2xl object-cover ring-1 ring-[#071f52]/10" />
              <span className="text-sm font-black leading-tight text-[#071f52]">{settings?.business_name || 'Katada Van Rentals'}</span>
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
              {(error || success) && (
                <div className={cn(
                  'rounded-2xl border px-4 py-3 text-sm font-bold',
                  success
                    ? 'border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d]'
                    : 'border-[#e92935]/30 bg-[#e92935]/8 text-[#b91c1c]'
                )}>
                  {success || error}
                  {showLoginPrompt && (
                    <div className="mt-3">
                      <Link to="/login" className="font-black underline underline-offset-4 transition-colors hover:text-[#071f52]">
                        Go to login
                      </Link>
                    </div>
                  )}
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

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-bold text-[#071f52]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  className={cn(
                    'block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 pr-10 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:border-[#071f52] focus:ring-[#ffd923]/60',
                    password && (isValidPassword(password)
                       ? 'border-[#16a34a] focus:border-[#16a34a] focus:ring-[#16a34a]/30'
                       : 'border-[#e92935] focus:border-[#e92935] focus:ring-[#e92935]/30'),
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#071f52]/38 hover:text-[#071f52]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="space-y-1 pt-2">
                {passwordChecks.map((requirement) => (
                  <div key={requirement.label} className={cn('flex items-center gap-2 text-xs font-bold', requirement.satisfied ? 'text-[#16a34a]' : 'text-[#e92935]')}>
                    {requirement.satisfied ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                    <span>{requirement.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={!canSubmit} className="w-full bg-[#e92935] text-white hover:bg-[#c91f2a] focus-visible:ring-[#ffd923]" size="lg">
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
            </form>

          <p className="mt-6 text-center text-sm font-medium text-[#071f52]/62">
            Already have an account?{' '}
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
