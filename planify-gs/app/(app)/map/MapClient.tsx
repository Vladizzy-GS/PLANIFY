'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { SUP_CATS } from '@/types/database'

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.3)', fontSize: '14px', borderRadius: '12px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
      Chargement de la carte…
    </div>
  ),
})

type Supplier = {
  id: string; name: string; category: string; city: string | null
  phone: string | null; email: string | null; address: string | null
  lat: number | null; lng: number | null
}
type Branch = {
  id: string; name: string; short_code: string; color: string
  address: string | null; lat: number | null; lng: number | null
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    postcode?: string
  }
}

// Format as: "1755 Rue Sigouin, Drummondville, QC J2C 5R7"
function formatAddress(item: NominatimResult): string {
  const a = item.address
  if (!a) return item.display_name
  const street = [a.house_number, a.road].filter(Boolean).join(' ')
  const city = a.city || a.town || a.village || a.municipality || ''
  const postal = a.postcode || ''
  const parts = [street, city].filter(Boolean)
  if (postal) parts.push(`QC ${postal}`)
  return parts.join(', ') || item.display_name
}

// Must match LeafletMap.tsx (gat fixed to Hull downtown)
const BRANCH_COORDS: Record<string, [number, number]> = {
  mtl:  [45.5017, -73.5673],
  lev:  [46.8036, -71.1756],
  drum: [45.8833, -72.4833],
  gat:  [45.4253, -75.7011],   // Maison du Citoyen / Hull downtown (FIXED)
  ndp:  [46.0500, -73.4333],
  jon:  [48.4200, -71.2467],
  ryn:  [48.2333, -79.0167],
  sca:  [45.4014, -73.5811],
  sjr:  [45.7800, -74.0042],
  she:  [45.4000, -71.8989],
  tr:   [46.3500, -72.5500],
}

const EMPTY_FORM: { name: string; category: string; city: string; phone: string; email: string; address: string; lat: number | null; lng: number | null } = {
  name: '', category: SUP_CATS[0], city: '', phone: '', email: '',
  address: '', lat: null, lng: null,
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)',
  color: '#e8e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

// Reusable address autocomplete field
function AddressAutocomplete({
  value, onChange, onSelect, suggestions, label,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (item: NominatimResult) => void
  suggestions: NominatimResult[]
  label?: string
}) {
  const geocoded = suggestions.length === 0 && value.length > 4
  return (
    <div style={{ position: 'relative' }}>
      {label && (
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', marginBottom: '5px' }}>
          {label}
        </div>
      )}
      <input
        placeholder="Ex: 123 Rue Principale, Montréal…"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={inp}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#1c1c2e', border: '1px solid rgba(255,255,255,.15)',
          borderRadius: '8px', zIndex: 100, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,.5)',
        }}>
          {suggestions.map(item => (
            <div
              key={item.place_id}
              onMouseDown={e => { e.preventDefault(); onSelect(item) }}
              style={{ padding: '9px 12px', fontSize: '12px', color: 'rgba(255,255,255,.8)', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.06)', lineHeight: 1.4 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(76,201,240,.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              📍 {formatAddress(item)}
            </div>
          ))}
        </div>
      )}
      {geocoded && (
        <div style={{ fontSize: '10px', color: 'rgba(255,165,0,.6)', marginTop: '4px' }}>
          Aucune suggestion — vérifiez l'adresse
        </div>
      )}
    </div>
  )
}

export default function MapClient({ initialSuppliers, branches: initBranches, isAdmin }: {
  initialSuppliers: Supplier[]
  branches: Branch[]
  isAdmin: boolean
}) {
  const supabase = createClient()

  // ── Core state ────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [branches, setBranches] = useState(initBranches)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Toutes les catégories')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [flyCmd, setFlyCmd] = useState<{ coords: [number, number]; key: number } | null>(null)

  // ── Add supplier modal ────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Branch address edit modal ─────────────────────────────────
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [branchAddr, setBranchAddr] = useState('')
  const [branchGeo, setBranchGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [branchSuggestions, setBranchSuggestions] = useState<NominatimResult[]>([])
  const [branchSaving, setBranchSaving] = useState(false)
  const branchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Supplier per-row geocoding ────────────────────────────────
  const [geocodingId, setGeocodingId] = useState<string | null>(null)

  // ── Helpers ───────────────────────────────────────────────────
  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    return (s.name.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q)) &&
      (catFilter === 'Toutes les catégories' || s.category === catFilter)
  })

  function getBranchCoords(b: Branch): [number, number] | null {
    if (b.lat && b.lng) return [Number(b.lat), Number(b.lng)]
    return BRANCH_COORDS[b.id] ?? null
  }

  function fly(coords: [number, number]) {
    setFlyCmd({ coords, key: Date.now() })
  }

  function handleSelectSupplier(id: string) {
    const next = id === selectedId ? null : id
    setSelectedId(next)
    if (next) {
      const s = suppliers.find(x => x.id === next)
      if (s?.lat && s?.lng) fly([Number(s.lat), Number(s.lng)])
    }
  }

  function handleBranchClick(id: string) {
    setSelectedBranchId(prev => prev === id ? null : id)
    const b = branches.find(x => x.id === id)
    if (!b) return
    const coords = getBranchCoords(b)
    if (coords) fly(coords)
  }

  // ── Debounced geocode search ──────────────────────────────────
  function makeAddressHandler(
    setter: (v: string) => void,
    geoSetter: (g: { lat: number; lng: number } | null) => void,
    sugSetter: (s: NominatimResult[]) => void,
    ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) {
    return (val: string) => {
      setter(val)
      geoSetter(null)
      sugSetter([])
      if (ref.current) clearTimeout(ref.current)
      if (val.length < 4) return
      ref.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}&limit=5`)
          const data = await res.json()
          sugSetter(Array.isArray(data) ? data : [])
        } catch { /* ignore */ }
      }, 450)
    }
  }

  const handleAddressInput = makeAddressHandler(
    v => setForm(f => ({ ...f, address: v, lat: null, lng: null })),
    () => {},
    setSuggestions,
    debounceRef,
  )

  const handleBranchAddressInput = makeAddressHandler(
    setBranchAddr,
    setBranchGeo,
    setBranchSuggestions,
    branchDebounce,
  )

  function selectSuggestion(item: NominatimResult) {
    const city = item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || ''
    setForm(f => ({ ...f, address: formatAddress(item), city: city || f.city, lat: parseFloat(item.lat), lng: parseFloat(item.lon) }))
    setSuggestions([])
  }

  function selectBranchSuggestion(item: NominatimResult) {
    setBranchAddr(formatAddress(item))
    setBranchGeo({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) })
    setBranchSuggestions([])
  }

  // ── Add supplier ──────────────────────────────────────────────
  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('suppliers').insert({
      name: form.name, category: form.category,
      city: form.city || null, phone: form.phone || null,
      email: form.email || null, address: form.address || null,
      lat: form.lat ?? null, lng: form.lng ?? null,
    }).select().single()
    if (!error && data) {
      const added = data as Supplier
      setSuppliers(prev => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)))
      setShowModal(false)
      setForm({ ...EMPTY_FORM })
      setSuggestions([])
      if (added.lat && added.lng) {
        fly([Number(added.lat), Number(added.lng)])
        setSelectedId(added.id)
      }
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce fournisseur ?')) return
    await supabase.from('suppliers').delete().eq('id', id)
    setSuppliers(prev => prev.filter(s => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  // ── Geocode existing supplier by name + city ──────────────────
  async function geocodeSupplier(s: Supplier) {
    if (geocodingId) return
    setGeocodingId(s.id)
    try {
      const q = [s.name, s.city, 'Québec', 'Canada'].filter(Boolean).join(', ')
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=1`)
      const data = await res.json()
      if (Array.isArray(data) && data[0]) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('suppliers').update({ lat, lng }).eq('id', s.id)
        setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, lat, lng } : x))
      }
    } catch { /* ignore */ }
    setGeocodingId(null)
  }

  // ── Save branch address ───────────────────────────────────────
  async function saveBranchAddress(e: React.FormEvent) {
    e.preventDefault()
    if (!editingBranch || !branchAddr) return
    setBranchSaving(true)
    try {
      const body: Record<string, unknown> = { id: editingBranch.id, address: branchAddr }
      if (branchGeo) { body.lat = branchGeo.lat; body.lng = branchGeo.lng }
      const res = await fetch('/api/admin/branches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setBranches(prev => prev.map(b => b.id === editingBranch.id ? { ...b, ...updated } : b))
        if (branchGeo) fly([branchGeo.lat, branchGeo.lng])
      }
    } catch { /* ignore */ }
    setBranchSaving(false)
    setEditingBranch(null)
    setBranchAddr('')
    setBranchGeo(null)
    setBranchSuggestions([])
  }

  function openBranchEdit(b: Branch) {
    setEditingBranch(b)
    setBranchAddr(b.address ?? '')
    setBranchGeo(b.lat && b.lng ? { lat: Number(b.lat), lng: Number(b.lng) } : null)
    setBranchSuggestions([])
  }

  function closeBranchEdit() {
    setEditingBranch(null)
    setBranchAddr('')
    setBranchGeo(null)
    setBranchSuggestions([])
  }

  function closeModal() {
    setShowModal(false)
    setForm({ ...EMPTY_FORM })
    setSuggestions([])
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px 28px', gap: '20px', overflow: 'auto' }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Réseau</div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>Carte & Fournisseurs</h1>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>

        {/* ── Left: map + branches ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

          {/* Map */}
          <div style={{ height: '420px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)' }}>
            <LeafletMap
              branches={branches}
              suppliers={suppliers}
              selectedSupplierId={selectedId}
              selectedBranchId={selectedBranchId}
              flyCmd={flyCmd}
              onBranchClick={handleBranchClick}
            />
          </div>

          {/* Branch list */}
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', marginBottom: '14px' }}>
              Succursales &nbsp;<span style={{ fontWeight: 400, color: 'rgba(255,255,255,.25)' }}>— cliquer pour localiser</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {branches.map(b => {
                const active = selectedBranchId === b.id
                return (
                  <div
                    key={b.id}
                    style={{
                      borderRadius: '8px', overflow: 'hidden',
                      background: active ? `${b.color}14` : 'rgba(255,255,255,.03)',
                      border: `1px solid ${active ? b.color + '50' : 'rgba(255,255,255,.06)'}`,
                      transition: 'all .15s',
                    }}
                  >
                    {/* Clickable name row */}
                    <button
                      onClick={() => handleBranchClick(b.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
                    >
                      {/* Star dot replaced by branch color indicator */}
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: b.color, flexShrink: 0, boxShadow: active ? `0 0 6px ${b.color}` : 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8f0' }}>{b.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: b.color, marginLeft: '6px' }}>({b.short_code})</span>
                      </div>
                    </button>

                    {/* Address row */}
                    <div style={{ padding: '0 12px 8px 31px' }}>
                      {b.address ? (
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', lineHeight: 1.4 }}>
                          {b.address}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'rgba(255,165,0,.45)' }}>Adresse non renseignée</div>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => openBranchEdit(b)}
                          style={{ marginTop: '4px', fontSize: '10px', color: 'rgba(255,255,255,.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                        >
                          {b.address ? 'Modifier' : '+ Ajouter adresse'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right: suppliers panel ── */}
        <div style={{
          width: '300px', flexShrink: 0, background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px',
          padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase' }}>
              Fournisseurs · {suppliers.length}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)' }}>
              {suppliers.filter(s => s.lat).length} géolocalisés
            </div>
          </div>

          <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={inp} />

          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="Toutes les catégories">Toutes les catégories</option>
            {SUP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Supplier list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filtered.map(s => (
              <div
                key={s.id}
                onClick={() => handleSelectSupplier(s.id)}
                style={{
                  padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                  background: selectedId === s.id ? 'rgba(76,201,240,.1)' : 'transparent',
                  border: `1px solid ${selectedId === s.id ? 'rgba(76,201,240,.3)' : 'transparent'}`,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, marginTop: '1px', background: s.lat ? '#4CC9F0' : 'rgba(255,255,255,.2)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', marginLeft: '13px' }}>{s.category}</div>
                  {s.city && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', marginLeft: '13px' }}>{s.city}</div>}
                  {!s.lat && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '13px', marginTop: '2px' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,165,0,.55)' }}>Non géolocalisé</span>
                      {isAdmin && s.city && (
                        <button
                          onClick={e => { e.stopPropagation(); geocodeSupplier(s) }}
                          disabled={geocodingId === s.id}
                          style={{
                            fontSize: '10px', padding: '1px 6px', borderRadius: '4px', cursor: 'pointer',
                            background: 'rgba(76,201,240,.15)', border: '1px solid rgba(76,201,240,.3)',
                            color: '#4CC9F0', opacity: geocodingId === s.id ? .5 : 1,
                          }}
                        >
                          {geocodingId === s.id ? '…' : '📍 Géolocaliser'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.2)', fontSize: '16px', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}
                  >×</button>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: '13px', padding: '24px 0' }}>Aucun résultat</div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,.15)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
          >
            + Ajouter un fournisseur
          </button>
        </div>
      </div>

      {/* ── Add supplier modal ── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <form
            onSubmit={handleAddSupplier}
            style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '16px', padding: '24px', width: '460px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>Nouveau fournisseur</h2>

            <input required placeholder="Nom *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              {SUP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Téléphone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inp} />
            <input placeholder="Courriel" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />

            <AddressAutocomplete
              label={`Adresse ${form.lat ? '✓ géolocalisée' : '· tapez pour trouver'}`}
              value={form.address}
              onChange={handleAddressInput}
              onSelect={selectSuggestion}
              suggestions={suggestions}
            />

            <input placeholder="Ville (remplie automatiquement)" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={inp} />

            {form.lat && form.lng && (
              <div style={{ fontSize: '11px', color: '#06D6A0', background: 'rgba(6,214,160,.06)', border: '1px solid rgba(6,214,160,.15)', borderRadius: '6px', padding: '6px 10px' }}>
                ✓ Coordonnées : {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button type="button" onClick={closeModal} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.6)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#4CC9F0', color: '#0a0a12', fontWeight: 700, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1 }}>
                {saving ? '…' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit branch address modal ── */}
      {editingBranch && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) closeBranchEdit() }}
        >
          <form
            onSubmit={saveBranchAddress}
            style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '16px', padding: '24px', width: '460px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: '#e8e8f0' }}>
                Adresse — {editingBranch.name}
                <span style={{ fontSize: '13px', color: editingBranch.color, marginLeft: '8px' }}>({editingBranch.short_code})</span>
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', marginTop: '4px' }}>
                Entrez l'adresse complète pour géolocaliser la succursale sur la carte.
              </p>
            </div>

            <AddressAutocomplete
              label={branchGeo ? '✓ Adresse géolocalisée' : 'Adresse complète'}
              value={branchAddr}
              onChange={handleBranchAddressInput}
              onSelect={selectBranchSuggestion}
              suggestions={branchSuggestions}
            />

            {branchGeo && (
              <div style={{ fontSize: '11px', color: '#06D6A0', background: 'rgba(6,214,160,.06)', border: '1px solid rgba(6,214,160,.15)', borderRadius: '6px', padding: '6px 10px' }}>
                ✓ Coordonnées : {branchGeo.lat.toFixed(5)}, {branchGeo.lng.toFixed(5)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={closeBranchEdit} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.6)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={branchSaving || !branchAddr} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: editingBranch.color, color: '#0a0a12', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: branchSaving || !branchAddr ? .5 : 1 }}>
                {branchSaving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
