import { supabase } from '@/lib/supabase'
import type {
  LocationSuggestion,
  RouteQuoteRequest,
  RouteQuoteResponse,
  TollEstimateCandidatesResponse,
  TollEstimateRequest,
  TollEstimateResponse,
} from '@/types/location'

export async function suggestLocations(query: string): Promise<LocationSuggestion[]> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length < 3) return []

  const { data, error } = await supabase.functions.invoke<{ suggestions: LocationSuggestion[] }>('location-suggest', {
    body: { query: trimmedQuery },
  })

  if (error) throw error
  return data?.suggestions ?? []
}

export async function getRouteQuote(input: RouteQuoteRequest): Promise<RouteQuoteResponse> {
  const { data, error } = await supabase.functions.invoke<RouteQuoteResponse | { error?: string }>('route-quote', {
    body: input,
  })

  if (error) throw new Error((data as { error?: string } | null)?.error || error.message)
  if (!data) throw new Error('Failed to compute route quote')
  if ('error' in data && data.error) throw new Error(data.error)
  return data as RouteQuoteResponse
}

export async function getNearestTollPlazas(input: TollEstimateRequest): Promise<TollEstimateCandidatesResponse> {
  const { data, error } = await supabase.functions.invoke<TollEstimateCandidatesResponse>('toll-estimate', {
    body: input,
  })

  if (error) throw error
  if (!data) throw new Error('Failed to look up toll plazas')
  return data
}

export async function calculateToll(input: TollEstimateRequest): Promise<TollEstimateResponse> {
  const { data, error } = await supabase.functions.invoke<TollEstimateResponse>('toll-estimate', {
    body: input,
  })

  if (error) throw error
  if (!data) throw new Error('Failed to compute toll estimate')
  return data
}
