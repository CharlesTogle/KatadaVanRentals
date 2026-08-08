import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendDiagnosticEvent } from '@/services/logging-service'

describe('logging service', () => {
  afterEach(() => {
    sessionStorage.clear()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('rejects HTTP error responses so the caller can report delivery failure', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    await expect(sendDiagnosticEvent('{}', 'request-1'))
      .rejects.toThrow('HTTP 503 (request-1)')
  })

  it('queues failed events and flushes them before the next event', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendDiagnosticEvent('{"event":"first"}', 'request-1')).rejects.toThrow()
    await sendDiagnosticEvent('{"event":"second"}', 'request-2')

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ body: '{"event":"first"}' })
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ body: '{"event":"second"}' })
  })

  it('serializes concurrent sends', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    let releaseFirst: () => void = () => {}
    const firstRequest = new Promise<void>((resolve) => { releaseFirst = resolve })
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => firstRequest.then(() => new Response(null, { status: 204 })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const first = sendDiagnosticEvent('{"event":"first"}', 'request-1')
    const second = sendDiagnosticEvent('{"event":"second"}', 'request-2')
    releaseFirst()
    await Promise.all([first, second])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ body: '{"event":"first"}' })
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ body: '{"event":"second"}' })
  })
})
