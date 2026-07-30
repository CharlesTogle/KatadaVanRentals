type RateLimitState = {
  attempts: number[]
  blockedUntil: number
}

type RateLimitConfig = {
  key: string
  maxAttempts: number
  windowMs: number
  cooldownMs: number
}

type RateLimitResult = {
  allowed: boolean
  retryAfterMs: number
}

const STORAGE_PREFIX = 'auth-rate-limit:'

function readState(key: string): RateLimitState {
  if (typeof window === 'undefined') return { attempts: [], blockedUntil: 0 }

  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`)
  if (!raw) return { attempts: [], blockedUntil: 0 }

  try {
    const parsed = JSON.parse(raw) as Partial<RateLimitState>
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts.filter((value) => typeof value === 'number') : [],
      blockedUntil: typeof parsed.blockedUntil === 'number' ? parsed.blockedUntil : 0,
    }
  } catch {
    return { attempts: [], blockedUntil: 0 }
  }
}

function writeState(key: string, state: RateLimitState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(state))
}

export function consumeRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const state = readState(config.key)
  const attempts = state.attempts.filter((attempt) => now - attempt < config.windowMs)

  if (state.blockedUntil > now) {
    return { allowed: false, retryAfterMs: state.blockedUntil - now }
  }

  if (attempts.length >= config.maxAttempts) {
    const blockedUntil = now + config.cooldownMs
    writeState(config.key, { attempts, blockedUntil })
    return { allowed: false, retryAfterMs: config.cooldownMs }
  }

  attempts.push(now)
  writeState(config.key, { attempts, blockedUntil: 0 })
  return { allowed: true, retryAfterMs: 0 }
}

export function formatRetryAfter(retryAfterMs: number) {
  const totalSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (!minutes) return `${totalSeconds}s`
  if (!seconds) return `${minutes}m`
  return `${minutes}m ${seconds}s`
}
