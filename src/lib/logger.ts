type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

type ErrorPayload = {
  message: string
  code?: string
}

type LogContext = {
  userId?: string
  path?: string
  requestId?: string
}

function generateId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
}

function isProduction(): boolean {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_VERCEL_ENV === 'production') return true
    if (import.meta.env.MODE === 'production') return true
  }
  return false
}

function env(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_VERCEL_ENV) return import.meta.env.VITE_VERCEL_ENV
    if (import.meta.env.MODE === 'production') return 'production'
    return import.meta.env.MODE
  }
  return 'unknown'
}

function functionsUrl(): string | null {
  if (typeof import.meta === 'undefined') return null
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  return base ? `${base}/functions/v1/log-event` : null
}

let sessionRequestId = generateId()

export function setRequestId(id: string) {
  sessionRequestId = id
}

export function resetRequestId() {
  sessionRequestId = generateId()
}

export function getRequestId(): string {
  return sessionRequestId
}

function payload(err: unknown): ErrorPayload {
  return {
    message: err instanceof Error ? err.message : String(err),
    code: err && typeof err === 'object' && 'code' in err ? String((err as any).code) : undefined,
  }
}

function log(
  level: LogLevel,
  service: string,
  message: string,
  error?: ErrorPayload,
  context?: LogContext,
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    environment: env(),
    service,
    message,
    error,
    context: {
      requestId: sessionRequestId,
      ...context,
    },
  }

  const output = JSON.stringify(entry)

  if (isProduction()) {
    const url = functionsUrl()
    if (url) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: output,
      }).catch(() => {})
    }
  } else {
    if (level === 'ERROR' || level === 'FATAL') {
      console.error(output)
    } else if (level === 'WARN') {
      console.warn(output)
    } else {
      console.log(output)
    }
  }
}

export function logError(
  service: string,
  message: string,
  err: unknown,
  context?: LogContext,
) {
  log('ERROR', service, message, payload(err), context)
}

export function logFatal(
  service: string,
  message: string,
  err: unknown,
  context?: LogContext,
) {
  log('FATAL', service, message, payload(err), context)
}
