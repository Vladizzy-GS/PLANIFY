'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Branch { id: string; name: string; short_code: string; color: string; lat?: number | null; lng?: number | null }
interface Supplier { id: string; name: string; category: string; city?: string | null; lat?: number | null; lng?: number | null }

// Verified city-center coordinates for each Quebec branch
// gat fixed: was Gatineau-sector/Maloney → now Hull downtown (City Hall, 25 Rue Laurier)
const BRANCH_COORDS: Record<string, [number, number]> = {
  mtl:  [45.5017, -73.5673],   // Montréal downtown
  lev:  [46.8036, -71.1756],   // Lévis city center
  drum: [45.8833, -72.4833],   // Drummondville city center
  gat:  [45.4253, -75.7011],   // Gatineau — Maison du Citoyen / Hull downtown (FIXED)
  ndp:  [46.0500, -73.4333],   // Notre-Dame-des-Prairies
  jon:  [48.4200, -71.2467],   // Jonquière city center
  ryn:  [48.2333, -79.0167],   // Rouyn-Noranda city center
  sca:  [45.4014, -73.5811],   // Sainte-Catherine
  sjr:  [45.7800, -74.0042],   // Saint-Jérôme city center
  she:  [45.4000, -71.8989],   // Sherbrooke city center
  tr:   [46.3500, -72.5500],   // Trois-Rivières city center
}

// Star-shaped DivIcon for branch markers
function starIcon(color: string, selected = false): L.DivIcon {
  const size = selected ? 30 : 22
  const glow = selected ? `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 2px ${color})` : `drop-shadow(0 0 1px rgba(0,0,0,0.5))`
  const html = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="filter:${glow};cursor:pointer">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
      fill="${color}" stroke="rgba(255,255,255,0.85)" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`
  return L.divIcon({
    html,
    iconSize:      [size, size],
    iconAnchor:    [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2) - 2],
    className: '',   // removes default white-box background
  })
}

// Smoothly flies map to new coords on each unique key
function FlyToController({ cmd }: { cmd: { coords: [number, number]; key: number; zoom?: number } | null }) {
  const map = useMap()
  const lastKey = useRef<number | null>(null)
  useEffect(() => {
    if (cmd && cmd.key !== lastKey.current) {
      lastKey.current = cmd.key
      map.flyTo(cmd.coords, cmd.zoom ?? 14, { duration: 1.2 })
    }
  }, [cmd, map])
  return null
}

// Flies back to initial bounds (all branches visible)
function ResetController({ resetKey, bounds }: { resetKey: number; bounds: L.LatLngBounds }) {
  const map = useMap()
  const lastKey = useRef(0)
  useEffect(() => {
    if (resetKey > 0 && resetKey !== lastKey.current) {
      lastKey.current = resetKey
      map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2 })
    }
  }, [resetKey, bounds, map])
  return null
}

export default function LeafletMap({
  branches,
  suppliers,
  selectedSupplierId,
  selectedBranchId,
  flyCmd,
  resetViewKey,
  onBranchClick,
}: {
  branches: Branch[]
  suppliers: Supplier[]
  selectedSupplierId: string | null
  selectedBranchId: string | null
  flyCmd: { coords: [number, number]; key: number; zoom?: number } | null
  resetViewKey?: number
  onBranchClick?: (id: string) => void
}) {
  // Compute bounding box from all known branch coordinates to fit all on initial load
  const allCoords: [number, number][] = branches
    .map(b => (b.lat && b.lng) ? [Number(b.lat), Number(b.lng)] as [number, number] : BRANCH_COORDS[b.id])
    .filter((c): c is [number, number] => c != null)

  const bounds = allCoords.length > 0
    ? L.latLngBounds(allCoords)
    : L.latLngBounds([[45.3, -79.2], [48.5, -71.0]])

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [40, 40] }}
      style={{ width: '100%', height: '100%', borderRadius: '12px' }}
      scrollWheelZoom
    >
      {/* CartoDB Voyager — clean, warm, readable (replaces dark CARTO) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        maxZoom={19}
      />

      <FlyToController cmd={flyCmd} />
      <ResetController resetKey={resetViewKey ?? 0} bounds={bounds} />

      {/* Branch markers — stars ★ */}
      {branches.map(b => {
        const coords = (b.lat && b.lng)
          ? [Number(b.lat), Number(b.lng)] as [number, number]
          : BRANCH_COORDS[b.id]
        if (!coords) return null
        const sel = selectedBranchId === b.id
        return (
          <Marker
            key={b.id}
            position={coords}
            icon={starIcon(b.color, sel)}
            eventHandlers={{ click: () => onBranchClick?.(b.id) }}
          >
            <Tooltip permanent={sel} direction="top">
              <strong style={{ color: b.color }}>{b.name}</strong>&nbsp;·&nbsp;{b.short_code}
            </Tooltip>
          </Marker>
        )
      })}

      {/* Supplier markers — circles (only geocoded ones) */}
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
              fillOpacity: sel ? 1 : 0.75,
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
