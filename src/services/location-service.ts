import { supabase } from '@/lib/supabase'
import type {
  LocationSuggestion,
  RouteQuoteRequest,
  RouteQuoteResponse,
  TollEstimateCandidatesResponse,
  TollEstimateRequest,
  TollEstimateResponse,
  FunctionErrorResponse,
  MappedFunctionError,
} from '@/types/location'

function functionError(data: FunctionErrorResponse | null, fallback: string): MappedFunctionError {
  const error = new Error(data?.message || data?.error || fallback) as MappedFunctionError
  error.errorCode = data?.errorCode
  return error
}

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
  const { data, error } = await supabase.functions.invoke<RouteQuoteResponse | FunctionErrorResponse>('route-quote', {
    body: input,
  })

  if (error) throw functionError(data as FunctionErrorResponse | null, 'Failed to compute route quote')
  if (!data) throw new Error('Failed to compute route quote')
  if ('errorCode' in data || 'error' in data) throw functionError(data, 'Failed to compute route quote')
  return data as RouteQuoteResponse
}

export async function getNearestTollPlazas(input: TollEstimateRequest): Promise<TollEstimateCandidatesResponse> {
  const { data, error } = await supabase.functions.invoke<TollEstimateCandidatesResponse | FunctionErrorResponse>('toll-estimate', {
    body: input,
  })

  if (error) throw functionError(data as FunctionErrorResponse | null, 'Invalid toll plaza selection')
  if (!data) throw new Error('Failed to look up toll plazas')
  if ('errorCode' in data || 'error' in data) throw functionError(data, 'Invalid toll plaza selection')
  return data as TollEstimateCandidatesResponse
}

export async function calculateToll(input: TollEstimateRequest): Promise<TollEstimateResponse> {
  const { data, error } = await supabase.functions.invoke<TollEstimateResponse | FunctionErrorResponse>('toll-estimate', {
    body: input,
  })

  if (error) throw functionError(data as FunctionErrorResponse | null, 'Invalid toll plaza selection')
  if (!data) throw new Error('Failed to compute toll estimate')
  if ('errorCode' in data || 'error' in data) throw functionError(data, 'Invalid toll plaza selection')
  return data as TollEstimateResponse
}
