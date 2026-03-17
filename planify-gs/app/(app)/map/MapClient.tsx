'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { SUP_CATS } from '@/types/database'

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.3)', fontSize: '14px', borderRadius: '12px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
      Chargement de la carte...
    </div>
  ),
})

type Supplier = { id: string; name: string; category: string; city: string | null; phone: string | null; email: string | null; address: string | null; lat: number | null; lng: number | null }
type Branch = { id: string; name: string; short_code: string; color: string; lat: number | null; lng: number | null }

const EMPTY_FORM: { name: string; category: string; city: string; phone: string; email: string; address: string } = { name: '', category: SUP_CATS[0], city: '', phone: '', email: '', address: '' }

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
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const filtered = suppliers.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.city ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'Toutes les catégories' || s.category === catFilter
    return matchSearch && matchCat
  })

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
    }).select().single()
    if (!error && data) {
      setSuppliers(prev => [...prev, data as Supplier].sort((a, b) => a.name.localeCompare(b.name)))
      setShowModal(false)
      setForm({ ...EMPTY_FORM })
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce fournisseur ?')) return
    await supabase.from('suppliers').delete().eq('id', id)
    setSuppliers(prev => prev.filter(s => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: '#e8e8f0', fontSize: '13px', outline: 'none' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px 28px', gap: '20px', overflow: 'auto' }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Réseau</div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>Carte & Fournisseurs</h1>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left: map + branches */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Map */}
          <div style={{ height: '320px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)' }}>
            <LeafletMap branches={branches} suppliers={suppliers} selectedSupplierId={selectedId} />
          </div>

          {/* Branches */}
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase' }}>
                Succursales
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {branches.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>{b.name}</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: b.color }}>{b.short_code}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: suppliers panel */}
        <div style={{ width: '280px', flexShrink: 0, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase' }}>
              Fournisseurs · {suppliers.length}
            </div>
          </div>

          <input
            placeholder="Rechercher..."
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

          {/* Supplier list */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filtered.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                style={{ padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: selectedId === s.id ? 'rgba(76,201,240,.1)' : 'transparent', border: `1px solid ${selectedId === s.id ? 'rgba(76,201,240,.25)' : 'transparent'}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4CC9F0', flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>{s.name}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', marginLeft: '13px' }}>{s.category}</div>
                  {s.city && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', marginLeft: '13px' }}>{s.city}</div>}
                </div>
                {isAdmin && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.2)', fontSize: '14px', padding: '0 2px', flexShrink: 0 }}
                  >×</button>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: '13px', padding: '20px 0' }}>Aucun résultat</div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,.15)', background: 'transparent', color: 'rgba(255,255,255,.45)', fontSize: '13px', cursor: 'pointer' }}
          >
            + Ajouter un fournisseur
          </button>
        </div>
      </div>

      {/* Add supplier modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form
            onSubmit={handleAddSupplier}
            style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '16px', padding: '24px', width: '420px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>Nouveau fournisseur</h2>

            <input required placeholder="Nom *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              {SUP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Ville" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={inp} />
            <input placeholder="Téléphone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inp} />
            <input placeholder="Courriel" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
            <input placeholder="Adresse" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inp} />

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.6)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#4CC9F0', color: '#0a0a12', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                {saving ? '...' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
