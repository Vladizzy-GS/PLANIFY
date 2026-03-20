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
type Branch = { id: string; name: string; short_code: string; color: string; lat: number | null; lng: number | null }

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: { city?: string; town?: string; village?: string }
}

// Mirror of LeafletMap hardcoded coords — used to fly on branch click
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

const EMPTY_FORM: { name: string; category: string; city: string; phone: string; email: string; address: string; lat: number | null; lng: number | null } = {
  name: '', category: SUP_CATS[0], city: '', phone: '', email: '',
  address: '', lat: null, lng: null,
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)',
  color: '#e8e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

export default function MapClient({ initialSuppliers, branches, isAdmin }: {
  initialSuppliers: Supplier[]
  branches: Branch[]
  isAdmin: boolean
}) {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Toutes les catégories')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [flyCmd, setFlyCmd] = useState<{ coords: [number, number]; key: number } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    return (s.name.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q)) &&
      (catFilter === 'Toutes les catégories' || s.category === catFilter)
  })

  function getBranchCoords(b: Branch): [number, number] | null {
    if (b.lat && b.lng) return [Number(b.lat), Number(b.lng)]
    return BRANCH_COORDS[b.id] ?? null
  }

  function handleSelectSupplier(id: string) {
    const next = id === selectedId ? null : id
    setSelectedId(next)
    if (next) {
      const s = suppliers.find(x => x.id === next)
      if (s?.lat && s?.lng) setFlyCmd({ coords: [Number(s.lat), Number(s.lng)], key: Date.now() })
    }
  }

  function handleBranchClick(id: string) {
    setSelectedBranchId(prev => prev === id ? null : id)
    const b = branches.find(x => x.id === id)
    if (!b) return
    const coords = getBranchCoords(b)
    if (coords) setFlyCmd({ coords, key: Date.now() })
  }

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('suppliers').insert({
      name: form.name,
      category: form.category,
      city: form.city || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      lat: form.lat ?? null,
      lng: form.lng ?? null,
    }).select().single()
    if (!error && data) {
      setSuppliers(prev => [...prev, data as Supplier].sort((a, b) => a.name.localeCompare(b.name)))
      setShowModal(false)
      setForm({ ...EMPTY_FORM })
      setSuggestions([])
      // Fly to new supplier if geocoded
      if ((data as Supplier).lat && (data as Supplier).lng) {
        setFlyCmd({ coords: [Number((data as Supplier).lat), Number((data as Supplier).lng)], key: Date.now() })
        setSelectedId((data as Supplier).id)
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

  // Debounced address autocomplete via /api/geocode
  function handleAddressInput(val: string) {
    setForm(f => ({ ...f, address: val, lat: null, lng: null }))
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 4) return
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}&limit=5`)
        const data = await res.json()
        setSuggestions(Array.isArray(data) ? data : [])
      } catch { /* silently ignore network errors */ }
    }, 450)
  }

  function selectSuggestion(item: NominatimResult) {
    const city = item.address?.city || item.address?.town || item.address?.village || ''
    setForm(f => ({
      ...f,
      address: item.display_name,
      city: city || f.city,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }))
    setSuggestions([])
  }

  function closeModal() {
    setShowModal(false)
    setForm({ ...EMPTY_FORM })
    setSuggestions([])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px 28px', gap: '20px', overflow: 'auto' }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Réseau</div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>Carte & Fournisseurs</h1>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>

        {/* ── Left column: map + branches ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>

          {/* Leaflet map */}
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

          {/* Branch list — clickable → fly to location */}
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', marginBottom: '14px' }}>
              Succursales &nbsp;<span style={{ fontWeight: 400, color: 'rgba(255,255,255,.25)' }}>— cliquer pour localiser</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {branches.map(b => {
                const active = selectedBranchId === b.id
                return (
                  <button
                    key={b.id}
                    onClick={() => handleBranchClick(b.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                      background: active ? `${b.color}18` : 'rgba(255,255,255,.03)',
                      border: `1px solid ${active ? b.color + '55' : 'rgba(255,255,255,.06)'}`,
                      textAlign: 'left', transition: 'all .15s',
                    }}
                  >
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: b.color, flexShrink: 0, boxShadow: active ? `0 0 6px ${b.color}` : 'none' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>{b.name}</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: b.color }}>{b.short_code}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right column: suppliers panel ── */}
        <div style={{
          width: '300px', flexShrink: 0, background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px',
          padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase' }}>
              Fournisseurs &nbsp;·&nbsp; {suppliers.length}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)' }}>
              {suppliers.filter(s => s.lat).length} géolocalisés
            </div>
          </div>

          <input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inp}
          />

          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            style={{ ...inp, cursor: 'pointer' }}
          >
            <option value="Toutes les catégories">Toutes les catégories</option>
            {SUP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Scrollable supplier list */}
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
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Dot: blue if geocoded, dim if not */}
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, marginTop: '1px', background: s.lat ? '#4CC9F0' : 'rgba(255,255,255,.2)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', marginLeft: '13px' }}>{s.category}</div>
                  {s.city && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', marginLeft: '13px' }}>{s.city}</div>}
                  {!s.lat && (
                    <div style={{ fontSize: '10px', color: 'rgba(255,165,0,.55)', marginLeft: '13px' }}>Non géolocalisé</div>
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

            {/* Address with live autocomplete */}
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', marginBottom: '5px' }}>
                Adresse&nbsp;
                {form.lat
                  ? <span style={{ color: '#06D6A0', fontWeight: 700 }}>✓ géolocalisée</span>
                  : <span style={{ color: 'rgba(255,165,0,.65)' }}>· tapez pour trouver</span>
                }
              </div>
              <input
                placeholder="Ex: 123 Rue Principale, Montréal…"
                value={form.address}
                onChange={e => handleAddressInput(e.target.value)}
                style={inp}
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: '#1c1c2e', border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: '8px', zIndex: 50, overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,.5)',
                }}>
                  {suggestions.map(item => (
                    <div
                      key={item.place_id}
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(item) }}
                      style={{ padding: '9px 12px', fontSize: '12px', color: 'rgba(255,255,255,.75)', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.06)', lineHeight: 1.4 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(76,201,240,.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      📍 {item.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input
              placeholder="Ville (remplie automatiquement)"
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              style={inp}
            />

            {form.lat && form.lng && (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', background: 'rgba(6,214,160,.06)', border: '1px solid rgba(6,214,160,.15)', borderRadius: '6px', padding: '6px 10px' }}>
                Coordonnées : {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button type="button" onClick={closeModal} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.6)', fontSize: '13px', cursor: 'pointer' }}>
                Annuler
              </button>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#4CC9F0', color: '#0a0a12', fontWeight: 700, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1 }}>
                {saving ? '…' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
