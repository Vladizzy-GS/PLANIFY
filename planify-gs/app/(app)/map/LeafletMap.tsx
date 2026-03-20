'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface Branch { id: string; name: string; short_code: string; color: string; lat?: number | null; lng?: number | null }
interface Supplier { id: string; name: string; category: string; city?: string | null; lat?: number | null; lng?: number | null }

// Accurate fallback coords for each Quebec branch
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

// Smoothly flies the map to new coords when flyCmd changes
function FlyToController({ cmd }: { cmd: { coords: [number, number]; key: number } | null }) {
  const map = useMap()
  const lastKey = useRef<number | null>(null)
  useEffect(() => {
    if (cmd && cmd.key !== lastKey.current) {
      lastKey.current = cmd.key
      map.flyTo(cmd.coords, 14, { duration: 1.2 })
    }
  }, [cmd, map])
  return null
}

export default function LeafletMap({
  branches,
  suppliers,
  selectedSupplierId,
  selectedBranchId,
  flyCmd,
  onBranchClick,
}: {
  branches: Branch[]
  suppliers: Supplier[]
  selectedSupplierId: string | null
  selectedBranchId: string | null
  flyCmd: { coords: [number, number]; key: number } | null
  onBranchClick?: (id: string) => void
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

      <FlyToController cmd={flyCmd} />

      {/* Branch markers */}
      {branches.map(b => {
        const coords = (b.lat && b.lng)
          ? [Number(b.lat), Number(b.lng)] as [number, number]
          : BRANCH_COORDS[b.id]
        if (!coords) return null
        const sel = selectedBranchId === b.id
        return (
          <CircleMarker
            key={b.id}
            center={coords}
            radius={sel ? 13 : 10}
            pathOptions={{
              color: b.color,
              fillColor: b.color,
              fillOpacity: sel ? 1 : 0.85,
              weight: sel ? 3 : 2,
            }}
            eventHandlers={{ click: () => onBranchClick?.(b.id) }}
          >
            <Tooltip permanent={sel} direction="top">
              <strong>{b.name}</strong><br />{b.short_code}
            </Tooltip>
          </CircleMarker>
        )
      })}

      {/* Supplier markers — only those with coordinates */}
      {suppliers.filter(s => s.lat && s.lng).map(s => {
        const sel = selectedSupplierId === s.id
        return (
          <CircleMarker
            key={s.id}
            center={[Number(s.lat), Number(s.lng)]}
            radius={sel ? 9 : 6}
            pathOptions={{
              color: '#4CC9F0',
              fillColor: '#4CC9F0',
              fillOpacity: sel ? 1 : 0.7,
              weight: sel ? 3 : 2,
            }}
          >
            <Tooltip direction="top" permanent={sel}>
              <strong>{s.name}</strong><br />{s.category}
              {s.city ? <><br />{s.city}</> : null}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
