import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function CenterUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true })
  }, [lat, lng, map])
  return null
}

interface ServiceAreaMapProps {
  lat: number
  lng: number
  radiusKm: number
}

export function ServiceAreaMap({ lat, lng, radiusKm }: ServiceAreaMapProps) {
  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-[#071f52]/10">
      <MapContainer
        center={[lat, lng]}
        zoom={4}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <CenterUpdater lat={lat} lng={lng} />
        <Circle
          center={[lat, lng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#071f52',
            fillColor: '#071f52',
            fillOpacity: 0.08,
            weight: 2,
          }}
        />
      </MapContainer>
    </div>
  )
}
