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
  notes: string | null; lat: number | null; lng: number | null
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
    house_number?: string; road?: string
    city?: string; town?: string; village?: string; municipality?: string
    postcode?: string
  }
}

// Fallback coords for branches without DB lat/lng
const BRANCH_COORDS: Record<string, [number, number]> = {
  mtl: [45.5017, -73.5673],
  lev: [46.7124, -71.3750],
  drum: [45.8700, -72.5225],
  gat: [45.4448, -75.7382],
  ndp: [46.0539, -73.4354],
  jon: [48.4059, -71.2498],
  ryn: [48.2013, -79.0822],
  sca: [45.4026, -73.5791],
  sjr: [45.7800, -74.0042],
  she: [45.4000, -71.8989],
  tr: [46.3500, -72.5500],
}

const BRANCH_COLORS = [
  '#FF0000', '#FF4D6D', '#F77F00', '#FCBF49', '#4CC9F0', '#7B2FBE',
  '#06D6A0', '#EF233C', '#3A86FF', '#FB5607', '#8338EC',
  '#06A77D', '#FF006E', '#FFD700', '#00CED1',
]

function pickNextColor(existingBranches: { color: string }[]): string {
  const used = new Set(existingBranches.map(b => b.color.toUpperCase()))
  for (const c of BRANCH_COLORS) {
    if (!used.has(c.toUpperCase())) return c
  }
  // All palette colors used — generate a deterministic unique one
  return `hsl(${(existingBranches.length * 47) % 360}, 80%, 55%)`
}

type SupForm = { name: string; category: string; city: string; phone: string; email: string; address: string; notes: string; lat: number | null; lng: number | null }
const EMPTY_SUP: SupForm = {
  name: '', category: SUP_CATS[0], city: '', phone: '', email: '',
  address: '', notes: '', lat: null, lng: null,
}

const EMPTY_NEW_BRANCH = {
  name: '', short_code: '', color: BRANCH_COLORS[0], address: '', lat: null as number | null, lng: null as number | null,
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)',
  color: '#e8e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

// ── Confirm delete modal ────────────────────────────────────
function ConfirmModal({ name, onConfirm, onCancel }: {
  name: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#13131f', border: '1px solid rgba(255,77,109,.25)', borderRadius: '18px', padding: '28px 32px', width: '380px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.7)' }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,77,109,.12)', border: '1px solid rgba(255,77,109,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 16px' }}>
          🗑
        </div>
        <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: '17px', fontWeight: 800, color: '#e8e8f0', marginBottom: '8px' }}>
          Supprimer ce fournisseur ?
        </h3>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)', marginBottom: '24px', lineHeight: 1.5 }}>
          <span style={{ color: '#e8e8f0', fontWeight: 600 }}>{name}</span> sera supprimé définitivement.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.7)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >Annuler</button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#c0392b)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >Supprimer</button>
        </div>
      </div>
    </div>
  )
}

// ── Address autocomplete field ──────────────────────────────
function AddressField({
  value, onChange, onSelect, suggestions, label, geocoded,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (item: NominatimResult) => void
  suggestions: NominatimResult[]
  label?: string
  geocoded?: boolean
}) {
  return (
    <div style={{ position: 'relative' }}>
      {label && (
        <div style={{ fontSize: '11px', color: geocoded ? '#06D6A0' : 'rgba(255,255,255,.4)', marginBottom: '5px' }}>
          {label}
        </div>
      )}
      <input
        placeholder="Ex: 1755 Rue Sigouin, Drummondville…"
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
          {suggestions.map(item => {
            const a = item.address
            const street = a ? [a.house_number, a.road].filter(Boolean).join(' ') : ''
            const city = a ? (a.city || a.town || a.village || a.municipality || '') : ''
            const postal = a?.postcode || ''
            const label = [street, city, postal ? `QC ${postal}` : ''].filter(Boolean).join(', ') || item.display_name
            return (
              <div
                key={item.place_id}
                onMouseDown={e => { e.preventDefault(); onSelect(item) }}
                style={{ padding: '9px 12px', fontSize: '12px', color: 'rgba(255,255,255,.8)', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.06)', lineHeight: 1.4 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(76,201,240,.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                📍 {label}
              </div>
            )
          })}
        </div>
      )}
      {!geocoded && suggestions.length === 0 && value.length > 4 && (
        <div style={{ fontSize: '10px', color: 'rgba(255,165,0,.6)', marginTop: '4px' }}>
          Aucune suggestion — vérifiez l'adresse
        </div>
      )}
    </div>
  )
}

// ── Debounced address search ────────────────────────────────
function useAddressSearch() {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [geocoded, setGeocoded] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function search(val: string) {
    setGeocoded(false)
    setSuggestions([])
    if (debounce.current) clearTimeout(debounce.current)
    if (val.length < 4) return
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}&limit=5`)
        const data = await res.json()
        setSuggestions(Array.isArray(data) ? data : [])
      } catch { /* ignore */ }
    }, 450)
  }

  function pick(item: NominatimResult): { lat: number; lng: number; city: string } {
    setSuggestions([])
    setGeocoded(true)
    const a = item.address
    const city = a ? (a.city || a.town || a.village || a.municipality || '') : ''
    return { lat: parseFloat(item.lat), lng: parseFloat(item.lon), city }
  }

  function reset() { setSuggestions([]); setGeocoded(false) }

  return { suggestions, geocoded, search, pick, reset }
}

// ─── Main component ─────────────────────────────────────────
export default function MapClient({ initialSuppliers, branches: initBranches, isAdmin }: {
  initialSuppliers: Supplier[]
  branches: Branch[]
  isAdmin: boolean
}) {
  const supabase = createClient()

  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [branches, setBranches] = useState(initBranches)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Toutes les catégories')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [flyCmd, setFlyCmd] = useState<{ coords: [number, number]; key: number } | null>(null)
  const [resetViewKey, setResetViewKey] = useState(0)

  // ── Add supplier modal ──────────────────────────────────
  const [showSupModal, setShowSupModal] = useState(false)
  const [supForm, setSupForm] = useState<SupForm>({ ...EMPTY_SUP })
  const [supSaving, setSupSaving] = useState(false)
  const supAddr = useAddressSearch()

  // ── Edit supplier modal ─────────────────────────────────
  const [editSup, setEditSup] = useState<Supplier | null>(null)
  const [editSupForm, setEditSupForm] = useState<SupForm>({ ...EMPTY_SUP })
  const [editSupSaving, setEditSupSaving] = useState(false)
  const editSupAddr = useAddressSearch()

  // ── Branch address edit modal ───────────────────────────
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [editAddr, setEditAddr] = useState('')
  const [editGeo, setEditGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const editAddrSearch = useAddressSearch()

  // ── Delete supplier confirm ─────────────────────────────
  const [confirmDeleteSup, setConfirmDeleteSup] = useState<Supplier | null>(null)

  // ── New branch modal ────────────────────────────────────
  const [showNewBranch, setShowNewBranch] = useState(false)
  const [newBranch, setNewBranch] = useState({ ...EMPTY_NEW_BRANCH })
  const [newBranchSaving, setNewBranchSaving] = useState(false)
  const newBranchAddr = useAddressSearch()

  // ── Helpers ─────────────────────────────────────────────
  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    return (s.name.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q)) &&
      (catFilter === 'Toutes les catégories' || s.category === catFilter)
  })

  function getBranchCoords(b: Branch): [number, number] | null {
    if (b.lat && b.lng) return [Number(b.lat), Number(b.lng)]
    return BRANCH_COORDS[b.id] ?? null
  }

  function fly(coords: [number, number]) { setFlyCmd({ coords, key: Date.now() }) }

  function handleSelectSupplier(id: string) {
    const deselecting = id === selectedId
    const next = deselecting ? null : id
    setSelectedId(next)
    if (next) {
      const s = suppliers.find(x => x.id === next)
      if (s?.lat && s?.lng) fly([Number(s.lat), Number(s.lng)])
    } else {
      setResetViewKey(k => k + 1)
    }
  }

  function handleBranchClick(id: string) {
    const deselecting = selectedBranchId === id
    setSelectedBranchId(deselecting ? null : id)
    if (deselecting) { setResetViewKey(k => k + 1); return }
    const b = branches.find(x => x.id === id)
    if (!b) return
    const coords = getBranchCoords(b)
    if (coords) fly(coords)
  }

  // ── Supplier CRUD ────────────────────────────────────────
  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault()
    setSupSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('suppliers').insert({
      name: supForm.name, category: supForm.category,
      city: supForm.city || null, phone: supForm.phone || null,
      email: supForm.email || null, address: supForm.address || null,
      notes: supForm.notes || null,
      lat: supForm.lat ?? null, lng: supForm.lng ?? null,
    }).select().single()
    if (!error && data) {
      const added = data as Supplier
      setSuppliers(prev => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)))
      setShowSupModal(false)
      setSupForm({ ...EMPTY_SUP })
      supAddr.reset()
      if (added.lat && added.lng) { fly([Number(added.lat), Number(added.lng)]); setSelectedId(added.id) }
    }
    setSupSaving(false)
  }

  function handleDeleteSup(id: string) {
    const sup = suppliers.find(s => s.id === id) ?? null
    setConfirmDeleteSup(sup)
  }

  async function doDeleteSup() {
    if (!confirmDeleteSup) return
    const { id } = confirmDeleteSup
    setConfirmDeleteSup(null)
    await supabase.from('suppliers').delete().eq('id', id)
    setSuppliers(prev => prev.filter(s => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function openEditSup(s: Supplier) {
    setEditSup(s)
    setEditSupForm({
      name: s.name, category: s.category, city: s.city ?? '',
      phone: s.phone ?? '', email: s.email ?? '',
      address: s.address ?? '', notes: s.notes ?? '',
      lat: s.lat, lng: s.lng,
    })
    editSupAddr.reset()
  }

  function closeEditSup() { setEditSup(null); editSupAddr.reset() }

  async function saveEditSup(e: React.FormEvent) {
    e.preventDefault()
    if (!editSup) return
    setEditSupSaving(true)

    // Auto-geocode if address changed and no coords yet
    let lat = editSupForm.lat
    let lng = editSupForm.lng
    if (editSupForm.address && !lat) {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(editSupForm.address)}&limit=1`)
        const geodata = await res.json()
        if (Array.isArray(geodata) && geodata[0]) {
          lat = parseFloat(geodata[0].lat)
          lng = parseFloat(geodata[0].lon)
        }
      } catch { /* ignore */ }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('suppliers').update({
      name: editSupForm.name,
      category: editSupForm.category,
      city: editSupForm.city || null,
      phone: editSupForm.phone || null,
      email: editSupForm.email || null,
      address: editSupForm.address || null,
      notes: editSupForm.notes || null,
      lat: lat ?? null,
      lng: lng ?? null,
    }).eq('id', editSup.id).select().single()

    if (!error && data) {
      const updated = data as Supplier
      setSuppliers(prev => prev.map(s => s.id === editSup.id ? updated : s))
      if (updated.lat && updated.lng) fly([Number(updated.lat), Number(updated.lng)])
    }
    setEditSupSaving(false)
    closeEditSup()
  }

  // ── Branch address edit ──────────────────────────────────
  function openEditBranch(b: Branch) {
    setEditBranch(b)
    setEditAddr(b.address ?? '')
    setEditGeo(b.lat && b.lng ? { lat: Number(b.lat), lng: Number(b.lng) } : null)
    editAddrSearch.reset()
  }

  function closeEditBranch() {
    setEditBranch(null); setEditAddr(''); setEditGeo(null); editAddrSearch.reset()
  }

  async function saveBranchAddress(e: React.FormEvent) {
    e.preventDefault()
    if (!editBranch || !editAddr.trim()) return
    setEditSaving(true)
    try {
      const body: Record<string, unknown> = { id: editBranch.id, address: editAddr.trim() }
      if (editGeo) { body.lat = editGeo.lat; body.lng = editGeo.lng }
      const res = await fetch('/api/admin/branches', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setBranches(prev => prev.map(b => b.id === editBranch.id ? { ...b, ...updated } : b))
        if (editGeo) fly([editGeo.lat, editGeo.lng])
      }
    } catch { /* ignore */ }
    setEditSaving(false)
    closeEditBranch()
  }

  // ── New branch ───────────────────────────────────────────
  function slugify(name: string) {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '').slice(0, 8)
  }

  function closeNewBranch() {
    setShowNewBranch(false); setNewBranch({ ...EMPTY_NEW_BRANCH }); newBranchAddr.reset()
  }

  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault()
    if (!newBranch.name.trim() || !newBranch.short_code.trim()) return
    setNewBranchSaving(true)
    try {
      const id = slugify(newBranch.name) || `br${Date.now().toString(36)}`
      const body: Record<string, unknown> = {
        id,
        name: newBranch.name.trim(),
        short_code: newBranch.short_code.trim().toUpperCase(),
        color: newBranch.color,
        address: newBranch.address.trim() || null,
        lat: newBranch.lat ?? null,
        lng: newBranch.lng ?? null,
      }
      const res = await fetch('/api/admin/branches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        setBranches(prev => [...prev, created as Branch].sort((a, b) => a.name.localeCompare(b.name)))
        if (created.lat && created.lng) fly([Number(created.lat), Number(created.lng)])
      }
    } catch { /* ignore */ }
    setNewBranchSaving(false)
    closeNewBranch()
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px 28px', gap: '20px', overflow: 'auto' }}>

      {confirmDeleteSup && (
        <ConfirmModal
          name={confirmDeleteSup.name}
          onConfirm={doDeleteSup}
          onCancel={() => setConfirmDeleteSup(null)}
        />
      )}

      {/* Header */}
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
              resetViewKey={resetViewKey}
              onBranchClick={handleBranchClick}
            />
          </div>

          {/* Branch grid */}
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase' }}>
                Succursales &nbsp;<span style={{ fontWeight: 400, color: 'rgba(255,255,255,.25)' }}>— cliquer pour localiser</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => { setNewBranch(f => ({ ...f, color: pickNextColor(branches) })); setShowNewBranch(true) }}
                  title="Ajouter une succursale"
                  style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: '18px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >+</button>
              )}
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
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: b.color, flexShrink: 0, boxShadow: active ? `0 0 6px ${b.color}` : 'none' }} />
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8f0' }}>{b.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: b.color, marginLeft: '6px' }}>({b.short_code})</span>
                      </div>
                    </button>

                    {/* Address + edit */}
                    <div style={{ padding: '0 12px 8px 31px' }}>
                      {b.address
                        ? <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', lineHeight: 1.4 }}>{b.address}</div>
                        : <div style={{ fontSize: '11px', color: 'rgba(255,165,0,.45)' }}>Adresse non renseignée</div>
                      }
                      {isAdmin && (
                        <button
                          onClick={() => openEditBranch(b)}
                          style={{ marginTop: '3px', fontSize: '10px', color: 'rgba(255,255,255,.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
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
                  {s.phone && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.25)', marginLeft: '13px' }}>{s.phone}</div>}
                  {s.notes && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', marginLeft: '13px', marginTop: '2px', padding: '2px 6px', background: 'rgba(255,255,255,.04)', borderRadius: '4px', display: 'inline-block' }}>{s.notes}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); openEditSup(s) }}
                      title="Modifier"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.25)', fontSize: '13px', padding: '0 2px', lineHeight: 1 }}
                    >✏</button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteSup(s.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.2)', fontSize: '16px', padding: '0 2px', lineHeight: 1 }}
                    >×</button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: '13px', padding: '24px 0' }}>Aucun résultat</div>
            )}
          </div>

          <button
            onClick={() => setShowSupModal(true)}
            style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,.15)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
          >+ Ajouter un fournisseur</button>
        </div>
      </div>

      {/* ── Add supplier modal ── */}
      {showSupModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowSupModal(false); setSupForm({ ...EMPTY_SUP }); supAddr.reset() } }}>
          <form onSubmit={handleAddSupplier}
            style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '16px', padding: '24px', width: '460px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>Nouveau fournisseur</h2>

            <input required placeholder="Nom *" value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            <select value={supForm.category} onChange={e => setSupForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              {SUP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Téléphone" value={supForm.phone} onChange={e => setSupForm(f => ({ ...f, phone: e.target.value }))} style={inp} />
            <input placeholder="Courriel" type="email" value={supForm.email} onChange={e => setSupForm(f => ({ ...f, email: e.target.value }))} style={inp} />

            <AddressField
              label={supForm.lat ? '✓ Adresse géolocalisée' : 'Adresse · tapez pour trouver'}
              value={supForm.address}
              geocoded={!!supForm.lat}
              suggestions={supAddr.suggestions}
              onChange={v => { setSupForm(f => ({ ...f, address: v, lat: null, lng: null })); supAddr.search(v) }}
              onSelect={item => { const g = supAddr.pick(item); setSupForm(f => ({ ...f, city: g.city || f.city, lat: g.lat, lng: g.lng })) }}
            />
            <input placeholder="Ville (remplie automatiquement)" value={supForm.city} onChange={e => setSupForm(f => ({ ...f, city: e.target.value }))} style={inp} />

            {supForm.lat && supForm.lng && (
              <div style={{ fontSize: '11px', color: '#06D6A0', background: 'rgba(6,214,160,.06)', border: '1px solid rgba(6,214,160,.15)', borderRadius: '6px', padding: '6px 10px' }}>
                ✓ Coordonnées : {supForm.lat.toFixed(5)}, {supForm.lng.toFixed(5)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button type="button" onClick={() => { setShowSupModal(false); setSupForm({ ...EMPTY_SUP }); supAddr.reset() }} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.6)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={supSaving} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#4CC9F0', color: '#0a0a12', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: supSaving ? .7 : 1 }}>
                {supSaving ? '…' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit supplier modal ── */}
      {editSup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) closeEditSup() }}>
          <form onSubmit={saveEditSup}
            style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '16px', padding: '24px', width: '460px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>
              Modifier — {editSup.name}
            </h2>

            <input required placeholder="Nom *" value={editSupForm.name} onChange={e => setEditSupForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            <select value={editSupForm.category} onChange={e => setEditSupForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              {SUP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Téléphone" value={editSupForm.phone} onChange={e => setEditSupForm(f => ({ ...f, phone: e.target.value }))} style={inp} />
            <input placeholder="Courriel" type="email" value={editSupForm.email} onChange={e => setEditSupForm(f => ({ ...f, email: e.target.value }))} style={inp} />

            <AddressField
              label={editSupForm.lat ? '✓ Adresse géolocalisée' : 'Adresse'}
              value={editSupForm.address}
              geocoded={!!editSupForm.lat}
              suggestions={editSupAddr.suggestions}
              onChange={v => { setEditSupForm(f => ({ ...f, address: v, lat: null, lng: null })); editSupAddr.search(v) }}
              onSelect={item => { const g = editSupAddr.pick(item); setEditSupForm(f => ({ ...f, city: g.city || f.city, lat: g.lat, lng: g.lng })) }}
            />
            <input placeholder="Ville" value={editSupForm.city} onChange={e => setEditSupForm(f => ({ ...f, city: e.target.value }))} style={inp} />

            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', marginBottom: '5px' }}>Notes</div>
              <textarea
                placeholder="Ex: Contacter Vlad, demander le responsable technique…"
                value={editSupForm.notes}
                onChange={e => setEditSupForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', background: 'rgba(255,255,255,.03)', borderColor: 'rgba(255,255,255,.08)' }}
              />
            </div>

            {editSupForm.lat && editSupForm.lng && (
              <div style={{ fontSize: '11px', color: '#06D6A0', background: 'rgba(6,214,160,.06)', border: '1px solid rgba(6,214,160,.15)', borderRadius: '6px', padding: '6px 10px' }}>
                ✓ {editSupForm.lat.toFixed(5)}, {editSupForm.lng.toFixed(5)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button type="button" onClick={closeEditSup} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.6)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={editSupSaving} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#4CC9F0', color: '#0a0a12', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: editSupSaving ? .7 : 1 }}>
                {editSupSaving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit branch address modal ── */}
      {editBranch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) closeEditBranch() }}>
          <form onSubmit={saveBranchAddress}
            style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '16px', padding: '24px', width: '460px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: '#e8e8f0' }}>
                Adresse — {editBranch.name}
                <span style={{ fontSize: '13px', color: editBranch.color, marginLeft: '8px' }}>({editBranch.short_code})</span>
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', marginTop: '4px' }}>
                Entrez l'adresse complète. Sélectionnez une suggestion pour géolocaliser.
              </p>
            </div>

            <AddressField
              label={editGeo ? '✓ Adresse géolocalisée' : 'Adresse complète'}
              value={editAddr}
              geocoded={!!editGeo}
              suggestions={editAddrSearch.suggestions}
              onChange={v => { setEditAddr(v); setEditGeo(null); editAddrSearch.search(v) }}
              onSelect={item => { const g = editAddrSearch.pick(item); setEditGeo({ lat: g.lat, lng: g.lng }) }}
            />

            {editGeo && (
              <div style={{ fontSize: '11px', color: '#06D6A0', background: 'rgba(6,214,160,.06)', border: '1px solid rgba(6,214,160,.15)', borderRadius: '6px', padding: '6px 10px' }}>
                ✓ Coordonnées : {editGeo.lat.toFixed(5)}, {editGeo.lng.toFixed(5)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={closeEditBranch} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.6)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={editSaving || !editAddr.trim()} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: editBranch.color, color: '#0a0a12', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: editSaving || !editAddr.trim() ? .5 : 1 }}>
                {editSaving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── New branch modal ── */}
      {showNewBranch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) closeNewBranch() }}>
          <form onSubmit={handleCreateBranch}
            style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '16px', padding: '24px', width: '460px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>Nouvelle succursale</h2>

            <input required placeholder="Nom de la ville *" value={newBranch.name} onChange={e => setNewBranch(f => ({ ...f, name: e.target.value }))} style={inp} />

            <input
              required maxLength={6} placeholder="Code court * (ex: SSM, SD, SL)"
              value={newBranch.short_code}
              onChange={e => setNewBranch(f => ({ ...f, short_code: e.target.value.toUpperCase() }))}
              style={inp}
            />

            {/* Auto-assigned color preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: newBranch.color, flexShrink: 0 }} />
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>Couleur assignée automatiquement</div>
            </div>

            <AddressField
              label={newBranch.lat ? '✓ Adresse géolocalisée' : 'Adresse (optionnelle)'}
              value={newBranch.address}
              geocoded={!!newBranch.lat}
              suggestions={newBranchAddr.suggestions}
              onChange={v => { setNewBranch(f => ({ ...f, address: v, lat: null, lng: null })); newBranchAddr.search(v) }}
              onSelect={item => { const g = newBranchAddr.pick(item); setNewBranch(f => ({ ...f, lat: g.lat, lng: g.lng })) }}
            />

            {newBranch.lat && newBranch.lng && (
              <div style={{ fontSize: '11px', color: '#06D6A0', background: 'rgba(6,214,160,.06)', border: '1px solid rgba(6,214,160,.15)', borderRadius: '6px', padding: '6px 10px' }}>
                ✓ Coordonnées : {newBranch.lat.toFixed(5)}, {newBranch.lng.toFixed(5)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button type="button" onClick={closeNewBranch} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.6)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={newBranchSaving} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: newBranch.color, color: '#0a0a12', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: newBranchSaving ? .7 : 1 }}>
                {newBranchSaving ? '…' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
