export interface LocationSuggestion {
  id: string
  label: string
  address: string
  lat: number
  lng: number
}

export interface FunctionErrorResponse {
  errorCode?: string
  error?: string
  message?: string
}

export interface MappedFunctionError extends Error {
  errorCode?: string
}

export interface SelectedLocation {
  address: string
  lat: number | null
  lng: number | null
}

export interface TollSegment {
  name: string
  amount: number
  currency: string
}

export interface TollRfidBreakdownItem {
  system: string
  amount: number
}

export interface TollPlazaOption {
  id: string
  name: string
  expressway: string
  label: string
  distanceKm: number
}

export interface RouteQuoteResponse {
  distanceKm: number
  durationMinutes: number
  routeGeometry?: Array<{ lat: number; lng: number }>
  tollEstimateAmount: number
  tollSegments: TollSegment[]
  fuelEstimateLiters: number
  fuelEstimateAmount: number
  tollEntryPlaza: string | null
  tollEntryExpressway: string | null
  tollExitPlaza: string | null
  tollExitExpressway: string | null
  tollVehicleClass: 1 | 2 | 3
  tollRfidBreakdown: TollRfidBreakdownItem[]
  inServiceArea: boolean
}

export interface ServiceArea {
  id: string
  label: string
  address: string
  lat: number | null
  lng: number | null
  radius_km: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RouteQuoteRequest {
  pickup: SelectedLocation
  destination?: SelectedLocation
  dropoff: SelectedLocation
  vehicleId: string
  rentalModel: 'all_in' | 'all_out' | 'self_drive'
}

export interface TollEstimateRequest {
  pickup: Pick<SelectedLocation, 'lat' | 'lng'>
  destination?: Pick<SelectedLocation, 'lat' | 'lng'>
  dropoff: Pick<SelectedLocation, 'lat' | 'lng'>
  routeGeometry?: Array<{ lat: number; lng: number }>
  entryPlaza?: string
  exitPlaza?: string
  returnEntryPlaza?: string
  returnExitPlaza?: string
  returnTrip?: boolean
  vehicleClass?: 1 | 2 | 3
  inServiceArea?: boolean
}

export interface TollEstimateCandidatesResponse {
  entryCandidates: TollPlazaOption[]
  exitCandidates: TollPlazaOption[]
}

export interface TollEstimateResponse {
  tollEstimateAmount: number
  tollSegments: TollSegment[]
  tollEntryPlaza: string
  tollEntryExpressway: string
  tollExitPlaza: string
  tollExitExpressway: string
  tollVehicleClass: 1 | 2 | 3
  tollRfidBreakdown: TollRfidBreakdownItem[]
}
