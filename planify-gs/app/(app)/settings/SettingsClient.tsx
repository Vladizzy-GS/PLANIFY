'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  userEmail, displayName, role, initialEmployees, currentPin,
}: {
  userEmail: string
  displayName: string | null
  role: string
  initialEmployees: Employee[]
  currentPin?: string
}) {
  const isAdmin = role === 'admin'
  const supabase = createClient()

  // Employee management state
  const [employees, setEmployees] = useState(initialEmployees)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ ...EMPTY_EMP })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Admin PIN state
  const [pin, setPin] = useState(currentPin ?? '1234')
  const [pinSaved, setPinSaved] = useState(false)
  const [pinErr, setPinErr] = useState('')

  // Danger zone state
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState('')

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

  async function handleSavePin(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) { setPinErr('Le PIN doit avoir au moins 4 chiffres.'); return }
    const { error } = await supabase.from('app_settings').update({ value: pin }).eq('key', 'admin_pin')
    if (error) { setPinErr('Erreur lors de la sauvegarde.'); return }
    setPinSaved(true); setPinErr('')
    setTimeout(() => setPinSaved(false), 2000)
  }

  async function handleReset(type: 'events' | 'all') {
    const label = type === 'all' ? 'TOUTES les données (événements, priorités, alertes, fournisseurs)' : 'tous les événements'
    if (!confirm(`Supprimer ${label} ? Cette action est irréversible.`)) return
    setResetting(true)
    const res = await fetch('/api/admin/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
    if (res.ok) {
      setResetDone(type === 'all' ? 'Toutes les données ont été supprimées.' : 'Événements supprimés.')
      setTimeout(() => setResetDone(''), 3000)
    }
    setResetting(false)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: '680px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Compte</div>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '28px' }}>Paramètres</h1>

      {/* Profile */}
      <div className="settings-section">
        <div className="settings-section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Profil</span>
          </div>
        </div>
        <div className="settings-section-body" style={{ display: 'grid', gap: '10px' }}>
          {[
            { label: 'Courriel', value: userEmail },
            { label: 'Nom affiché', value: displayName ?? '—' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rôle</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFB703', background: 'rgba(255,183,3,.1)', padding: '2px 8px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>{role}</span>
          </div>
        </div>
      </div>

      {/* Gemini API */}
      <div className="settings-section">
        <div className="settings-section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7B2FBE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Clé API Gemini (Assistant IA)</span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#7B2FBE', background: 'rgba(123,47,190,.1)', borderRadius: '8px', padding: '2px 8px' }}>GRATUIT</span>
        </div>
        <div className="settings-section-body">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>
            Requis pour l'Assistant IA. Clé gratuite sur <strong style={{ color: 'var(--text-primary)' }}>aistudio.google.com</strong> → Créer une clé API.
          </p>
          <div style={{ padding: '12px 14px', background: 'rgba(123,47,190,.06)', border: '1px solid rgba(123,47,190,.2)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configuration disponible dans la prochaine phase.
          </div>
        </div>
      </div>

      {/* Employee Management — admin only */}
      {isAdmin && (
        <div className="settings-section">
          <div className="settings-section-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4CC9F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Gestion des employés ({employees.length})</span>
            </div>
            <button onClick={openAdd} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#FF4D6D', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
              + Ajouter
            </button>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {employees.length === 0 && (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>Aucun employé</div>
            )}
            {employees.map(emp => (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: emp.avatar_gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {emp.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: emp.is_active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{emp.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.role_title || '—'}{emp.email ? ` · ${emp.email}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button onClick={() => handleToggle(emp)} style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${emp.is_active ? 'rgba(6,214,160,.3)' : 'var(--border-normal)'}`, background: emp.is_active ? 'rgba(6,214,160,.1)' : 'transparent', color: emp.is_active ? '#06D6A0' : 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>
                    {emp.is_active ? 'Actif' : 'Inactif'}
                  </button>
                  <button onClick={() => openEdit(emp)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-normal)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer' }}>Modifier</button>
                  <button onClick={() => handleDelete(emp.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,77,109,.25)', background: 'transparent', color: '#FF4D6D', fontSize: '11px', cursor: 'pointer' }}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin System Settings — admin only */}
      {isAdmin && (
        <>
          {/* PIN */}
          <div className="settings-section">
            <div className="settings-section-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFB703" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>PIN administrateur</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFB703', background: 'rgba(255,183,3,.1)', borderRadius: '8px', padding: '2px 8px' }}>ADMIN</span>
            </div>
            <div className="settings-section-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Utilisé pour accéder au panneau d'administration depuis l'application.
              </p>
              <form onSubmit={handleSavePin} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-normal)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', letterSpacing: '0.2em', width: '160px' }}
                />
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#FF4D6D', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  {pinSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
                </button>
              </form>
              {pinErr && <div style={{ fontSize: '12px', color: '#FF4D6D', marginTop: '8px' }}>{pinErr}</div>}
            </div>
          </div>

          {/* Danger Zone */}
          <div style={{ background: 'rgba(255,77,109,.04)', border: '1px solid rgba(255,77,109,.2)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#FF4D6D', marginBottom: '4px' }}>Zone dangereuse</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Ces actions sont irréversibles. Procédez avec précaution.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Supprimer tous les événements</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Efface le planning de tous les employés.</div>
                </div>
                <button onClick={() => handleReset('events')} disabled={resetting} style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid rgba(255,77,109,.4)', background: 'transparent', color: '#FF4D6D', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                  Réinitialiser
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Réinitialisation complète</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supprime événements, priorités, alertes et fournisseurs.</div>
                </div>
                <button onClick={() => handleReset('all')} disabled={resetting} style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid rgba(255,77,109,.4)', background: 'rgba(255,77,109,.1)', color: '#FF4D6D', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                  Tout effacer
                </button>
              </div>
            </div>

            {resetDone && <div style={{ marginTop: '10px', fontSize: '13px', color: '#06D6A0' }}>✓ {resetDone}</div>}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} className="modal-overlay">
          <form onClick={e => e.stopPropagation()} onSubmit={handleSave} className="modal-card" style={{ width: '420px' }}>
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              {editing ? 'Modifier employé' : 'Nouvel employé'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input required placeholder="Nom complet *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="modal-inp" />
              <input required maxLength={3} placeholder="Initiales * (ex: SV)" value={form.initials} onChange={e => setForm(f => ({ ...f, initials: e.target.value.toUpperCase() }))} className="modal-inp" />
              <input placeholder="Titre / rôle" value={form.role_title ?? ''} onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))} className="modal-inp" />
              <input placeholder="Courriel" type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="modal-inp" />
              <input placeholder="Téléphone" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="modal-inp" />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Couleur avatar</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {GRADIENTS.map(g => (
                    <div key={g} onClick={() => setForm(f => ({ ...f, avatar_gradient: g }))} style={{ width: '28px', height: '28px', borderRadius: '8px', background: g, cursor: 'pointer', border: form.avatar_gradient === g ? '3px solid var(--text-primary)' : '3px solid transparent', outline: '2px solid transparent' }} />
                  ))}
                </div>
              </div>
              {err && <div style={{ fontSize: '12px', color: '#FF4D6D' }}>{err}</div>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid var(--border-normal)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#FF4D6D', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>{saving ? '…' : editing ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
