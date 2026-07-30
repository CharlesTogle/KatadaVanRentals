import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, X } from 'lucide-react'
import { consumeRateLimit, formatRetryAfter } from '@/lib/auth-rate-limit'
import { supabase } from '@/lib/supabase'
import { showError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AUTH_MESSAGES } from '@/constants/auth'
import { getPasswordRequirementChecks, isValidPassword } from '@/lib/validation'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const passwordChecks = getPasswordRequirementChecks(password)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')

    if (errorDescription) {
      setError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')))
      setReady(false)
      return
    }

    const hasRecoveryTokens = (
      hashParams.has('access_token')
      || hashParams.get('type') === 'recovery'
      || searchParams.get('type') === 'recovery'
      || searchParams.has('code')
      || searchParams.has('token_hash')
    )

    setReady(hasRecoveryTokens)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!isValidPassword(password)) {
      setError(AUTH_MESSAGES.errors.weak_password)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const rateLimit = consumeRateLimit({
      key: 'reset-password',
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      cooldownMs: 15 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      setError(`Too many password reset attempts. Try again in ${formatRetryAfter(rateLimit.retryAfterMs)}.`)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(showError(error))
      setLoading(false)
      return
    }

    setMessage('Your password has been updated.')
    setLoading(false)
    window.setTimeout(() => navigate('/login', { replace: true }), 1200)
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f9ff] px-4 py-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Card className="w-full max-w-[480px] rounded-[30px] border-[#071f52]/10 bg-white shadow-[0_24px_70px_rgba(7,31,82,0.16)]">
        <CardHeader className="space-y-2 px-7 pb-4 pt-7 sm:px-8 sm:pt-8">
          <Link to="/login" className="mb-5 flex w-fit items-center gap-3 text-sm font-bold text-[#071f52]/60 transition-colors hover:text-[#e92935]">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to sign in
          </Link>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#ffd923]/70 px-4 py-2 text-xs font-black text-[#071f52]">
            <KeyRound size={15} aria-hidden="true" />
            New password
          </div>
          <CardTitle className="text-3xl font-black tracking-[-0.04em] text-[#071f52]">
            Reset your password
          </CardTitle>
          <CardDescription className="text-base font-medium leading-7 text-[#071f52]/66">
            Choose a new password for your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-7 pb-7 sm:px-8 sm:pb-8">
          {!ready && !message ? (
            <div className="rounded-2xl border border-[#071f52]/10 bg-[#f7f9ff] px-4 py-4 text-sm font-medium text-[#071f52]/72">
              {error || 'Open this page from the password reset email so we can verify your request.'}
            </div>
          ) : (
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
                <label htmlFor="password" className="text-sm font-bold text-[#071f52]">
                  New password
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

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-bold text-[#071f52]">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="block w-full rounded-2xl border border-[#071f52]/14 bg-[#f7f9ff] px-4 py-3 pr-10 text-sm font-semibold text-[#071f52] placeholder:text-[#071f52]/38 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:border-[#071f52] focus:ring-[#ffd923]/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#071f52]/38 hover:text-[#071f52]"
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-[#e92935] text-white hover:bg-[#c91f2a] focus-visible:ring-[#ffd923]" size="lg">
                {loading ? 'Updating password...' : 'Update password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
