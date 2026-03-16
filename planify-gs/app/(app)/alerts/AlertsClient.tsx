'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayStr, localDate } from '@/lib/utils/dates'
import type { Alert } from '@/types/database'

function alertTypeColor(t: string) {
  if (t === 'warn') return { color: '#F77F00', bg: 'rgba(247,127,0,.1)', label: 'AVERTISSEMENT' }
  if (t === 'task-assigned') return { color: '#4CC9F0', bg: 'rgba(76,201,240,.1)', label: 'TÂCHE ASSIGNÉE' }
  return { color: '#7B2FBE', bg: 'rgba(123,47,190,.1)', label: 'INFO' }
}

const EMPTY_FORM = {
  title: '',
  message: '',
  alert_type: 'info' as Alert['alert_type'],
  alert_date: '',
  frequency: 'once',
  add_to_schedule: false,
}

function AlertModal({ open, onClose, onSaved }: {
  open: boolean
  onClose: () => void
  onSaved: (a: Alert) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setErr('Titre requis.'); return }
    setSaving(true); setErr('')
    const { data: profile } = await supabase.from('profiles').select('employee_id').single()
    const { data, error } = await supabase.from('alerts').insert({
      title: form.title.trim(),
      message: form.message,
      alert_type: form.alert_type,
      alert_date: form.alert_date || null,
      frequency: form.frequency,
      add_to_schedule: form.add_to_schedule,
      employee_id: profile?.employee_id ?? null,
      link_type: '',
      is_read: false,
      is_system: false,
      sms_enabled: false,
    }).select().single()
    if (error) { setErr(error.message); setSaving(false); return }
    onSaved(data as Alert)
    setSaving(false)
    onClose()
    setForm({ ...EMPTY_FORM })
  }

  if (!open) return null

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 13px',
    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
    borderRadius: '9px', color: '#e8e8f0', fontSize: '14px',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: 'rgba(255,255,255,.4)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '6px',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '18px', padding: '28px', width: '460px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 800, color: '#e8e8f0' }}>Nouvelle alerte</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={lbl}>Titre *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} style={inp} placeholder="Ex: Vérification extincteurs" />
          </div>
          <div>
            <label style={lbl}>Message</label>
            <textarea value={form.message} onChange={e => set('message', e.target.value)} style={{ ...inp, resize: 'vertical', minHeight: '70px' }} placeholder="Message optionnel…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>Type</label>
              <select value={form.alert_type} onChange={e => set('alert_type', e.target.value as Alert['alert_type'])} style={inp}>
                <option value="info">Info</option>
                <option value="warn">Avertissement</option>
                <option value="task-assigned">Tâche assignée</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Date</label>
              <input type="date" value={form.alert_date} onChange={e => set('alert_date', e.target.value)} style={inp} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.add_to_schedule} onChange={e => set('add_to_schedule', e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#FF4D6D' }} />
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,.6)' }}>Ajouter à l'horaire</span>
          </label>
          {err && <div style={{ fontSize: '13px', color: '#FF4D6D', textAlign: 'center' }}>{err}</div>}
          <button onClick={handleSave} disabled={saving} style={{ padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#7B2FBE,#FF4D6D)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? .7 : 1 }}>
            {saving ? 'Création…' : 'Créer l\'alerte'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AlertCard({ alert, onDelete, onMarkRead }: {
  alert: Alert
  onDelete: (id: string) => void
  onMarkRead: (id: string) => void
}) {
  const supabase = createClient()
  const tc = alertTypeColor(alert.alert_type)

  async function markRead() {
    await supabase.from('alerts').update({ is_read: true }).eq('id', alert.id)
    onMarkRead(alert.id)
  }

  async function del() {
    if (!confirm('Supprimer cette alerte ?')) return
    await supabase.from('alerts').delete().eq('id', alert.id)
    onDelete(alert.id)
  }

  const isOverdue = alert.alert_date && alert.alert_date < todayStr() && !alert.is_read

  return (
    <div style={{
      background: '#13131f', borderRadius: '12px',
      border: `1px solid ${isOverdue ? 'rgba(255,77,109,.3)' : 'rgba(255,255,255,.08)'}`,
      padding: '14px 16px', position: 'relative',
      opacity: alert.is_read ? .55 : 1,
    }}>
      {!alert.is_read && (
        <div style={{ position: 'absolute', top: '14px', right: '16px', width: '7px', height: '7px', borderRadius: '50%', background: '#FF4D6D' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: tc.bg, border: `1px solid ${tc.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {alert.alert_type === 'warn'
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            : alert.alert_type === 'task-assigned'
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#e8e8f0' }}>{alert.title}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: tc.color, background: tc.bg, padding: '1px 7px', borderRadius: '6px', letterSpacing: '.04em' }}>{tc.label}</span>
          </div>
          {alert.message && <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.5)', marginBottom: '6px', lineHeight: 1.5 }}>{alert.message}</div>}
          {alert.alert_date && (
            <div style={{ fontSize: '11px', color: isOverdue ? '#FF4D6D' : 'rgba(255,255,255,.35)', fontWeight: isOverdue ? 700 : 400 }}>
              {isOverdue ? '⚠ En retard · ' : ''}
              {localDate(alert.alert_date).getDate()}/{localDate(alert.alert_date).getMonth() + 1}/{localDate(alert.alert_date).getFullYear()}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {!alert.is_read && (
            <button onClick={markRead} title="Marquer comme lu" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✓</button>
          )}
          {!alert.is_system && (
            <button onClick={del} title="Supprimer" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(255,77,109,.2)', background: 'transparent', color: 'rgba(255,77,109,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✕</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AlertsClient({ initialAlerts }: { initialAlerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [modalOpen, setModalOpen] = useState(false)

  const today = todayStr()
  const unread = alerts.filter(a => !a.is_read)
  const overdue = alerts.filter(a => a.alert_date && a.alert_date < today && !a.is_read)
  const read = alerts.filter(a => a.is_read)

  function onSaved(a: Alert) {
    setAlerts(prev => [a, ...prev])
  }

  function onDelete(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  function onMarkRead(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Notifications</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>Alertes</h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#7B2FBE,#FF4D6D)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
        >
          + Nouvelle alerte
        </button>
      </div>

      <div style={{ maxWidth: '720px', display: 'grid', gap: '10px' }}>
        {/* Overdue section */}
        {overdue.length > 0 && (
          <div style={{ background: 'rgba(255,77,109,.06)', border: '1px solid rgba(255,77,109,.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#FF4D6D', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
              ⚠ {overdue.length} alerte{overdue.length > 1 ? 's' : ''} en retard
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {overdue.map(a => <AlertCard key={a.id} alert={a} onDelete={onDelete} onMarkRead={onMarkRead} />)}
            </div>
          </div>
        )}

        {/* Unread (non-overdue) */}
        {unread.filter(a => !overdue.find(x => x.id === a.id)).map(a => (
          <AlertCard key={a.id} alert={a} onDelete={onDelete} onMarkRead={onMarkRead} />
        ))}

        {/* Read */}
        {read.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.25)', letterSpacing: '.06em', textTransform: 'uppercase', margin: '8px 0', paddingLeft: '2px' }}>
              Lus ({read.length})
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {read.map(a => <AlertCard key={a.id} alert={a} onDelete={onDelete} onMarkRead={onMarkRead} />)}
            </div>
          </div>
        )}

        {alerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,.25)', fontSize: '14px' }}>
            Aucune alerte
          </div>
        )}
      </div>

      <AlertModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={onSaved} />
    </div>
  )
}
