'use client'

import { useState } from 'react'

type Employee = {
  id: string; name: string; initials: string; email: string | null; phone: string | null
  role_title: string | null; avatar_gradient: string; is_active: boolean
}

const GRADIENTS = [
  'linear-gradient(135deg,#FF4D6D,#F77F00)',
  'linear-gradient(135deg,#4CC9F0,#7B2FBE)',
  'linear-gradient(135deg,#06D6A0,#4CC9F0)',
  'linear-gradient(135deg,#F77F00,#FCBF49)',
  'linear-gradient(135deg,#7B2FBE,#FF4D6D)',
  'linear-gradient(135deg,#EF233C,#7B2FBE)',
]
const EMPTY_EMP = { name: '', initials: '', email: '', phone: '', role_title: '', avatar_gradient: GRADIENTS[0], is_active: true }

export default function SettingsClient({
  userEmail, displayName, role, initialEmployees,
}: {
  userEmail: string
  displayName: string | null
  role: string
  initialEmployees: Employee[]
}) {
  const isAdmin = role === 'admin'
  const [employees, setEmployees] = useState(initialEmployees)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ ...EMPTY_EMP })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function openAdd() { setEditing(null); setForm({ ...EMPTY_EMP }); setErr(''); setShowModal(true) }
  function openEdit(emp: Employee) {
    setEditing(emp)
    setForm({ name: emp.name, initials: emp.initials, email: emp.email ?? '', phone: emp.phone ?? '', role_title: emp.role_title ?? '', avatar_gradient: emp.avatar_gradient, is_active: emp.is_active })
    setErr(''); setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      if (editing) {
        const res = await fetch('/api/admin/employees', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...form }) })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setEmployees(prev => prev.map(e => e.id === editing.id ? updated : e))
      } else {
        const res = await fetch('/api/admin/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error((await res.json()).error)
        const created = await res.json()
        setEmployees(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setShowModal(false)
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Erreur') }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet employé ? Cette action est irréversible.')) return
    const res = await fetch('/api/admin/employees', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) setEmployees(prev => prev.filter(e => e.id !== id))
  }

  async function handleToggle(emp: Employee) {
    const res = await fetch('/api/admin/employees', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: emp.id, is_active: !emp.is_active }) })
    if (res.ok) { const updated = await res.json(); setEmployees(prev => prev.map(e => e.id === emp.id ? updated : e)) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: '#e8e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const section: React.CSSProperties = { background: '#13131f', borderRadius: '14px', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', marginBottom: '16px' }
  const sectionHead: React.CSSProperties = { padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }

  return (
    <div style={{ padding: '28px 32px', maxWidth: '680px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Compte</div>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0', marginBottom: '28px' }}>Paramètres</h1>

      {/* Profile */}
      <div style={section}>
        <div style={sectionHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8f0' }}>Profil</span>
          </div>
        </div>
        <div style={{ padding: '16px 18px', display: 'grid', gap: '10px' }}>
          {[
            { label: 'Courriel', value: userEmail },
            { label: 'Nom affiché', value: displayName ?? '—' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)' }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)' }}>Rôle</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFB703', background: 'rgba(255,183,3,.1)', padding: '2px 8px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>{role}</span>
          </div>
        </div>
      </div>

      {/* Gemini API */}
      <div style={section}>
        <div style={sectionHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7B2FBE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8f0' }}>Clé API Gemini (Assistant IA)</span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#7B2FBE', background: 'rgba(123,47,190,.1)', borderRadius: '8px', padding: '2px 8px' }}>GRATUIT</span>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)', marginBottom: '12px', lineHeight: 1.6 }}>
            Requis pour l'Assistant IA. Clé gratuite sur <strong style={{ color: 'rgba(255,255,255,.6)' }}>aistudio.google.com</strong> → Créer une clé API.
          </p>
          <div style={{ padding: '12px 14px', background: 'rgba(123,47,190,.06)', border: '1px solid rgba(123,47,190,.2)', borderRadius: '10px', fontSize: '13px', color: 'rgba(255,255,255,.4)' }}>
            Configuration disponible dans la prochaine phase.
          </div>
        </div>
      </div>

      {/* Employee Management — admin only */}
      {isAdmin && (
        <div style={section}>
          <div style={sectionHead}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4CC9F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8f0' }}>Gestion des employés ({employees.length})</span>
            </div>
            <button onClick={openAdd} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#FF4D6D', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
              + Ajouter
            </button>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {employees.length === 0 && (
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.25)', textAlign: 'center', padding: '16px 0' }}>Aucun employé</div>
            )}
            {employees.map(emp => (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: emp.avatar_gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {emp.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: emp.is_active ? '#e8e8f0' : 'rgba(255,255,255,.3)' }}>{emp.name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)' }}>{emp.role_title || '—'}{emp.email ? ` · ${emp.email}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button onClick={() => handleToggle(emp)} style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${emp.is_active ? 'rgba(6,214,160,.3)' : 'rgba(255,255,255,.12)'}`, background: emp.is_active ? 'rgba(6,214,160,.1)' : 'transparent', color: emp.is_active ? '#06D6A0' : 'rgba(255,255,255,.3)', fontSize: '11px', cursor: 'pointer' }}>
                    {emp.is_active ? 'Actif' : 'Inactif'}
                  </button>
                  <button onClick={() => openEdit(emp)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: '11px', cursor: 'pointer' }}>Modifier</button>
                  <button onClick={() => handleDelete(emp.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,77,109,.25)', background: 'transparent', color: '#FF4D6D', fontSize: '11px', cursor: 'pointer' }}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSave} style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '16px', padding: '24px', width: '420px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#FF4D6D', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>{saving ? '…' : editing ? 'Enregistrer' : 'Créer'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
