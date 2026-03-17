'use client'

import { useState } from 'react'

type Employee = {
  id: string; name: string; initials: string; email: string | null; phone: string | null
  role_title: string | null; avatar_gradient: string; is_active: boolean
}
type Branch = { id: string; name: string; short_code: string; color: string }

const GRADIENTS = [
  'linear-gradient(135deg,#FF4D6D,#F77F00)',
  'linear-gradient(135deg,#4CC9F0,#7B2FBE)',
  'linear-gradient(135deg,#06D6A0,#4CC9F0)',
  'linear-gradient(135deg,#F77F00,#FCBF49)',
  'linear-gradient(135deg,#7B2FBE,#FF4D6D)',
  'linear-gradient(135deg,#EF233C,#7B2FBE)',
]

const EMPTY_EMP = { name: '', initials: '', email: '', phone: '', role_title: '', avatar_gradient: GRADIENTS[0], is_active: true }

export default function AdminDashboardClient({ initialEmployees, branches, suppliersCount, alertsCount }: {
  initialEmployees: Employee[]
  branches: Branch[]
  suppliersCount: number
  alertsCount: number
}) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ ...EMPTY_EMP })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY_EMP })
    setErr('')
    setShowModal(true)
  }

  function openEdit(emp: Employee) {
    setEditing(emp)
    setForm({ name: emp.name, initials: emp.initials, email: emp.email ?? '', phone: emp.phone ?? '', role_title: emp.role_title ?? '', avatar_gradient: emp.avatar_gradient, is_active: emp.is_active })
    setErr('')
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try {
      if (editing) {
        const res = await fetch('/api/admin/employees', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...form }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setEmployees(prev => prev.map(e => e.id === editing.id ? updated : e))
      } else {
        const res = await fetch('/api/admin/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const created = await res.json()
        setEmployees(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setShowModal(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erreur')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet employé ?')) return
    const res = await fetch('/api/admin/employees', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setEmployees(prev => prev.filter(e => e.id !== id))
  }

  async function handleToggleActive(emp: Employee) {
    const res = await fetch('/api/admin/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: emp.id, is_active: !emp.is_active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setEmployees(prev => prev.map(e => e.id === emp.id ? updated : e))
    }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: '#e8e8f0', fontSize: '13px', outline: 'none' }

  const stats = [
    { label: 'Employés', value: employees.length, color: '#FF4D6D' },
    { label: 'Succursales', value: branches.length, color: '#4CC9F0' },
    { label: 'Fournisseurs', value: suppliersCount, color: '#06D6A0' },
    { label: 'Alertes non lues', value: alertsCount, color: '#F77F00' },
  ]

  return (
    <div style={{ padding: '24px 28px', color: '#e8e8f0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>Tableau de bord</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-syne)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.45)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Employees */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8f0' }}>Employés ({employees.length})</div>
          <button onClick={openAdd} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#FF4D6D', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
            + Ajouter
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {employees.map(emp => (
            <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: emp.avatar_gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {emp.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: emp.is_active ? '#e8e8f0' : 'rgba(255,255,255,.35)' }}>{emp.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)' }}>{emp.role_title || '—'} {emp.email ? `· ${emp.email}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button onClick={() => handleToggleActive(emp)} style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${emp.is_active ? 'rgba(6,214,160,.3)' : 'rgba(255,255,255,.12)'}`, background: emp.is_active ? 'rgba(6,214,160,.1)' : 'transparent', color: emp.is_active ? '#06D6A0' : 'rgba(255,255,255,.35)', fontSize: '11px', cursor: 'pointer' }}>
                  {emp.is_active ? 'Actif' : 'Inactif'}
                </button>
                <button onClick={() => openEdit(emp)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: '11px', cursor: 'pointer' }}>Modifier</button>
                <button onClick={() => handleDelete(emp.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,77,109,.25)', background: 'transparent', color: '#FF4D6D', fontSize: '11px', cursor: 'pointer' }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Branches overview */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px', padding: '20px', marginTop: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8f0', marginBottom: '14px' }}>Succursales ({branches.length})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {branches.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8e8f0' }}>{b.name}</div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: b.color }}>{b.short_code}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleSave} style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '16px', padding: '24px', width: '420px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>
              {editing ? 'Modifier employé' : 'Nouvel employé'}
            </h2>
            <input required placeholder="Nom complet *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            <input required maxLength={3} placeholder="Initiales * (ex: SV)" value={form.initials} onChange={e => setForm(f => ({ ...f, initials: e.target.value.toUpperCase() }))} style={inp} />
            <input placeholder="Titre / rôle" value={form.role_title} onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))} style={inp} />
            <input placeholder="Courriel" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
            <input placeholder="Téléphone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inp} />
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', marginBottom: '6px' }}>Couleur avatar</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {GRADIENTS.map(g => (
                  <div key={g} onClick={() => setForm(f => ({ ...f, avatar_gradient: g }))} style={{ width: '28px', height: '28px', borderRadius: '8px', background: g, cursor: 'pointer', border: form.avatar_gradient === g ? '2px solid #fff' : '2px solid transparent' }} />
                ))}
              </div>
            </div>
            {err && <div style={{ fontSize: '12px', color: '#FF4D6D' }}>{err}</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.6)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#FF4D6D', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>{saving ? '...' : editing ? 'Enregistrer' : 'Créer'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
