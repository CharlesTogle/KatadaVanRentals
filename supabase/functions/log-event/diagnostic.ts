export interface DiagnosticLogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR'
  environment: string
  service: string
  reason: string
  requestId: string
  context?: { userId?: string; path?: string }
  errorName?: string
  errorMessage?: string
  errorReason?: string
  errorStack?: string
  errorCode?: string
}

export function bounded(value: unknown, max: number): string | undefined {
  return typeof value === 'string' ? value.slice(0, max) : undefined
}

export function parseDiagnosticBody(raw: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {}
}

export function normalizeDiagnosticEvent(body: Record<string, unknown>, requestId: string, environment: string): DiagnosticLogEntry {
  const error = body.error && typeof body.error === 'object' ? body.error as Record<string, unknown> : null
  const context = body.context && typeof body.context === 'object' ? body.context as Record<string, unknown> : null

  return {
    timestamp: new Date().toISOString(),
    level: body.level === 'WARN' || body.level === 'INFO' ? body.level : 'ERROR',
    environment,
    service: bounded(body.service, 50) ?? 'client',
    reason: bounded(body.message, 200) ?? 'Client error event',
    requestId,
    ...(context ? { context: { userId: bounded(context.userId, 100), path: bounded(context.path, 200) } } : {}),
    ...(error ? {
      errorName: bounded(error.name, 100),
      errorMessage: bounded(error.message, 500),
      errorReason: bounded(error.reason, 500),
      errorStack: bounded(error.stack, 10_000),
      errorCode: bounded(error.code, 100),
    } : {}),
  }
}
