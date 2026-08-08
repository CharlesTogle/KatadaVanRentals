import { sendDiagnosticEvent } from '@/services/logging-service'

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

type ErrorPayload = {
  name: string
  message: string
  reason: string
  stack?: string
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
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      reason: err.message || err.name,
      stack: err.stack,
    }
  }

  if (err && typeof err === 'object') {
    const value = err as Record<string, unknown>
    const message = typeof value.message === 'string' ? value.message : String(err)
    return {
      name: typeof value.name === 'string' ? value.name : 'UnknownError',
      message,
      reason: typeof value.reason === 'string' ? value.reason : message,
      stack: typeof value.stack === 'string' ? value.stack : undefined,
      code: typeof value.code === 'string' ? value.code : undefined,
    }
  }

  const reason = String(err)
  return { name: 'UnknownError', message: reason, reason }
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
    sendDiagnosticEvent(output, sessionRequestId).catch(() => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        service: 'client-logger',
        message: 'Diagnostic event delivery failed',
        requestId: sessionRequestId,
        payload: output.slice(0, 2000),
      }))
    })
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
