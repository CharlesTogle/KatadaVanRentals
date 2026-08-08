interface QueuedDiagnosticEvent {
  payload: string
  requestId: string
}

const QUEUE_KEY = 'katada:diagnostic-events'
const MAX_QUEUE_SIZE = 10

function functionsUrl(): string | null {
  if (typeof import.meta === 'undefined') return null
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  return base ? `${base}/functions/v1/log-event` : null
}

function readQueue(): QueuedDiagnosticEvent[] {
  try {
    const value = sessionStorage.getItem(QUEUE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is QueuedDiagnosticEvent => (
      item && typeof item === 'object'
      && typeof item.payload === 'string'
      && typeof item.requestId === 'string'
    )) : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedDiagnosticEvent[]) {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)))
  } catch {
    // Storage is optional; the console fallback remains available.
  }
}

function enqueue(payload: string, requestId: string) {
  writeQueue([...readQueue(), { payload, requestId }])
}

async function post(url: string, payload: string, requestId: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': requestId,
    },
    body: payload,
  })

  if (!response.ok) throw new Error(`Diagnostic event rejected with HTTP ${response.status} (${requestId})`)
}

async function flushQueue(url: string) {
  const queue = readQueue()
  while (queue.length) {
    const event = queue[0]
    await post(url, event.payload, event.requestId)
    queue.shift()
    writeQueue(queue)
  }
}

async function sendDiagnosticEventNow(payload: string, requestId: string): Promise<void> {
  const url = functionsUrl()
  if (!url) return

  try {
    await flushQueue(url)
    await post(url, payload, requestId)
  } catch (error) {
    enqueue(payload, requestId)
    throw error
  }
}

let sendChain = Promise.resolve()

export function sendDiagnosticEvent(payload: string, requestId: string): Promise<void> {
  const next = sendChain.then(
    () => sendDiagnosticEventNow(payload, requestId),
    () => sendDiagnosticEventNow(payload, requestId),
  )
  sendChain = next.catch(() => {})
  return next
}

if (typeof window !== 'undefined') {
  const url = functionsUrl()
  if (url) sendChain = flushQueue(url).catch(() => {})
}
