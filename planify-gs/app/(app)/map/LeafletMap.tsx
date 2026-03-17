'use client'

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface Branch { id: string; name: string; short_code: string; color: string; lat?: number | null; lng?: number | null }
interface Supplier { id: string; name: string; category: string; lat?: number | null; lng?: number | null }

// Hardcoded fallback coords for known Quebec branches
const BRANCH_COORDS: Record<string, [number, number]> = {
  mtl:  [45.5017, -73.5673],
  lev:  [46.8036, -71.1756],
  drum: [45.8833, -72.4833],
  gat:  [45.4765, -75.7013],
  ndp:  [46.0500, -73.4333],
  jon:  [48.4200, -71.2467],
  ryn:  [48.2333, -79.0167],
  sca:  [45.4014, -73.5811],
  sjr:  [45.7800, -74.0042],
  she:  [45.4000, -71.8989],
  tr:   [46.3500, -72.5500],
}

export default function LeafletMap({ branches, suppliers, selectedSupplierId }: {
  branches: Branch[]
  suppliers: Supplier[]
  selectedSupplierId: string | null
}) {
  return (
    <MapContainer
      center={[47.0, -73.5]}
      zoom={6}
      style={{ width: '100%', height: '100%', borderRadius: '12px' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {branches.map(b => {
        const coords = (b.lat && b.lng)
          ? [Number(b.lat), Number(b.lng)] as [number, number]
          : BRANCH_COORDS[b.id]
        if (!coords) return null
        return (
          <CircleMarker
            key={b.id}
            center={coords}
            radius={10}
            pathOptions={{ color: b.color, fillColor: b.color, fillOpacity: 0.85, weight: 2 }}
          >
            <Tooltip permanent={false} direction="top">
              <strong>{b.name}</strong><br />{b.short_code}
            </Tooltip>
          </CircleMarker>
        )
      })}

      {suppliers.filter(s => s.lat && s.lng).map(s => (
        <CircleMarker
          key={s.id}
          center={[Number(s.lat), Number(s.lng)]}
          radius={selectedSupplierId === s.id ? 9 : 6}
          pathOptions={{ color: '#4CC9F0', fillColor: '#4CC9F0', fillOpacity: 0.7, weight: 2 }}
        >
          <Tooltip direction="top">
            <strong>{s.name}</strong><br />{s.category}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
