export const VEHICLE_TYPES = ['Car', 'Van', 'Truck', 'Mini Van', 'Mini Bus', 'Others'] as const

export type VehicleType = (typeof VEHICLE_TYPES)[number]
