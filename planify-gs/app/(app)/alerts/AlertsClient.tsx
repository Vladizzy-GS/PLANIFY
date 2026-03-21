'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/stores/useSessionStore'
import { todayStr, localDate } from '@/lib/utils/dates'
import type { Alert, Employee } from '@/types/database'

// ─── Display helpers ───────────────────────────────────────────────────────────

function alertSeverityColor(t: string) {
  if (t === 'warn' || t === 'urgent') return { color: '#FF4D6D', bg: 'rgba(255,77,109,.12)', label: 'URGENT' }
  if (t === 'task-assigned') return { color: '#4CC9F0', bg: 'rgba(76,201,240,.1)', label: 'TÂCHE ASSIGNÉE' }
  return { color: '#7B2FBE', bg: 'rgba(123,47,190,.1)', label: 'INFORMATION' }
}

function categoryMeta(cat: string) {
  if (cat === 'Horaire') return { color: '#06D6A0', label: 'HORAIRE' }
  if (cat === 'Tache')   return { color: '#F77F00', label: 'TÂCHE' }
  if (cat === 'Priorité') return { color: '#4CC9F0', label: 'PRIORITÉ' }
  return null
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '',
  message: '',
  alert_type: 'information' as 'urgent' | 'information',
  categories: [] as string[],
  alert_start: '',
  alert_end: '',
  employee_id: '' as string,
}

function AlertModal({ open, onClose, onSaved, employees }: {
  open: boolean
  onClose: () => void
  onSaved: (a: Alert) => void
  employees: Employee[]
}) {
  const supabase = createClient()
  const myEmployeeId = useSessionStore(s => s.myEmployeeId)
  const isAdmin = useSessionStore(s => s.isAdmin)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setErr('Titre requis.'); return }
    setSaving(true); setErr('')

    // Determine target employee
    let targetEmpId: string | null = null
    if (isAdmin && form.employee_id) {
      targetEmpId = form.employee_id
    } else {
      targetEmpId = myEmployeeId ?? null
    }

    // Map UI type to DB type
    const dbAlertType = form.alert_type === 'urgent' ? 'warn' : 'info'
    // Serialize categories as comma-separated string
    const dbCategory = form.categories.join(',')
    // Map first category to link_type (for legacy compatibility)
    const firstCat = form.categories[0] ?? ''
    const dbLinkType: Alert['link_type'] =
      firstCat === 'Horaire' ? 'event'
      : firstCat === 'Tache' ? 'task'
      : firstCat === 'Priorité' ? 'priority'
      : ''
    // Serialize date range: "YYYY-MM-DD" or "YYYY-MM-DD/YYYY-MM-DD"
    const dbDate = form.alert_start
      ? (form.alert_end && form.alert_end > form.alert_start
          ? `${form.alert_start}/${form.alert_end}`
          : form.alert_start)
      : null

    const { data, error } = await supabase.from('alerts').insert({
      title: form.title.trim(),
      message: form.message,
      alert_type: dbAlertType,
      alert_date: dbDate,
      frequency: 'once',
      category: dbCategory,
      add_to_schedule: false,
      employee_id: targetEmpId,
      link_type: dbLinkType,
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
    color: 'rgba(255,255,255,.4)', letterSpacing: '.08em',
    textTransform: 'uppercase', marginBottom: '6px',
  }

  const CATEGORIES: { value: string; label: string; color: string }[] = [
    { value: 'Horaire',  label: '📅 Horaire',  color: '#06D6A0' },
    { value: 'Tache',    label: '☑ Tâche',    color: '#F77F00' },
    { value: 'Priorité', label: '⚡ Priorité', color: '#4CC9F0' },
  ]

  function toggleCategory(val: string) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(val)
        ? f.categories.filter(c => c !== val)
        : [...f.categories, val],
    }))
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '18px', padding: '28px', width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 800, color: '#e8e8f0' }}>Nouvelle alerte</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>

          {/* Titre */}
          <div>
            <label style={lbl}>Titre *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} style={inp} placeholder="Ex: Vérification extincteurs" />
          </div>

          {/* Message */}
          <div>
            <label style={lbl}>Message</label>
            <textarea value={form.message} onChange={e => set('message', e.target.value)} style={{ ...inp, resize: 'vertical', minHeight: '70px' }} placeholder="Message optionnel…" />
          </div>

          {/* Catégorie — multi-select */}
          <div>
            <label style={lbl}>Catégorie</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {CATEGORIES.map(cat => {
                const active = form.categories.includes(cat.value)
                return (
                  <button
                    key={cat.value}
                    onClick={() => toggleCategory(cat.value)}
                    style={{
                      flex: 1, padding: '9px 6px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                      border: `1px solid ${active ? cat.color : 'rgba(255,255,255,.12)'}`,
                      background: active ? `${cat.color}18` : 'rgba(255,255,255,.04)',
                      color: active ? cat.color : 'rgba(255,255,255,.5)',
                      transition: 'all .15s',
                    }}
                  >{cat.label}</button>
                )
              })}
            </div>
          </div>

          {/* Type d'alerte */}
          <div>
            <label style={lbl}>Type d'alerte</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => set('alert_type', 'urgent')}
                style={{
                  padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                  border: `1px solid ${form.alert_type === 'urgent' ? '#FF4D6D' : 'rgba(255,255,255,.12)'}`,
                  background: form.alert_type === 'urgent' ? 'rgba(255,77,109,.15)' : 'rgba(255,255,255,.04)',
                  color: form.alert_type === 'urgent' ? '#FF4D6D' : 'rgba(255,255,255,.5)',
                  transition: 'all .15s',
                }}
              >🚨 Urgent</button>
              <button
                onClick={() => set('alert_type', 'information')}
                style={{
                  padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                  border: `1px solid ${form.alert_type === 'information' ? '#7B2FBE' : 'rgba(255,255,255,.12)'}`,
                  background: form.alert_type === 'information' ? 'rgba(123,47,190,.15)' : 'rgba(255,255,255,.04)',
                  color: form.alert_type === 'information' ? '#A855F7' : 'rgba(255,255,255,.5)',
                  transition: 'all .15s',
                }}
              >ℹ Information</button>
            </div>
          </div>

          {/* Employee selector — admin only */}
          {isAdmin && employees.length > 0 && (
            <div>
              <label style={lbl}>Destinataire</label>
              <select value={form.employee_id} onChange={e => set('employee_id', e.target.value)} style={inp}>
                <option value="">— Moi-même —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          <div>
            <label style={lbl}>Période</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
              <input type="date" value={form.alert_start} onChange={e => setForm(f => ({ ...f, alert_start: e.target.value, alert_end: f.alert_end && f.alert_end < e.target.value ? '' : f.alert_end }))} style={inp} />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', fontWeight: 600, textAlign: 'center' }}>→</span>
              <input type="date" value={form.alert_end} min={form.alert_start || undefined} onChange={e => setForm(f => ({ ...f, alert_end: e.target.value }))} style={inp} />
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.25)', marginTop: '5px' }}>
              Laissez vide pour une alerte sans date · La date de fin est optionnelle
            </div>
          </div>

          {err && <div style={{ fontSize: '13px', color: '#FF4D6D', textAlign: 'center' }}>{err}</div>}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? .7 : 1 }}
          >
            {saving ? 'Création…' : 'Créer l\'alerte'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Alert Card ────────────────────────────────────────────────────────────────

function AlertCard({ alert, onDelete, onMarkRead }: {
  alert: Alert
  onDelete: (id: string) => void
  onMarkRead: (id: string) => void
}) {
  const supabase = createClient()
  const isAdmin = useSessionStore(s => s.isAdmin)
  const tc = alertSeverityColor(alert.alert_type)
  // Parse comma-separated categories
  const catList = (alert.category ?? '').split(',').map(s => s.trim()).filter(Boolean).map(c => categoryMeta(c)).filter(Boolean) as { color: string; label: string }[]
  // Parse date range: "YYYY-MM-DD" or "YYYY-MM-DD/YYYY-MM-DD"
  const dateParts = alert.alert_date ? alert.alert_date.split('/') : []
  const dateStart = dateParts[0] ?? null
  const dateEnd   = dateParts[1] ?? null
  const effectiveEnd = dateEnd ?? dateStart
  const isOverdue = effectiveEnd && effectiveEnd < todayStr() && !alert.is_read

  async function markRead() {
    await supabase.from('alerts').update({ is_read: true }).eq('id', alert.id)
    onMarkRead(alert.id)
  }

  async function del() {
    if (!confirm('Supprimer cette alerte ?')) return
    await supabase.from('alerts').delete().eq('id', alert.id)
    onDelete(alert.id)
  }

  const isUrgent = alert.alert_type === 'warn' || alert.alert_type === 'urgent'

  return (
    <div style={{
      background: '#13131f', borderRadius: '12px',
      border: `1px solid ${isOverdue ? 'rgba(255,77,109,.35)' : isUrgent && !alert.is_read ? 'rgba(255,77,109,.2)' : 'rgba(255,255,255,.08)'}`,
      padding: '14px 16px', position: 'relative',
      opacity: alert.is_read ? .55 : 1,
    }}>
      {!alert.is_read && (
        <div style={{ position: 'absolute', top: '14px', right: '16px', width: '7px', height: '7px', borderRadius: '50%', background: tc.color }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Icon */}
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: tc.bg, border: `1px solid ${tc.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
          {isUrgent ? '🚨' : 'ℹ️'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#e8e8f0' }}>{alert.title}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: tc.color, background: tc.bg, padding: '1px 7px', borderRadius: '6px', letterSpacing: '.04em' }}>
              {tc.label}
            </span>
            {catList.map(cm => (
              <span key={cm.label} style={{ fontSize: '10px', fontWeight: 700, color: cm.color, background: `${cm.color}15`, padding: '1px 7px', borderRadius: '6px', letterSpacing: '.04em', border: `1px solid ${cm.color}30` }}>
                {cm.label}
              </span>
            ))}
          </div>
          {alert.message && (
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.5)', marginBottom: '6px', lineHeight: 1.5 }}>{alert.message}</div>
          )}
          {dateStart && (
            <div style={{ fontSize: '11px', color: isOverdue ? '#FF4D6D' : 'rgba(255,255,255,.35)', fontWeight: isOverdue ? 700 : 400 }}>
              {isOverdue ? '⚠ En retard · ' : ''}
              {localDate(dateStart).getDate()}/{localDate(dateStart).getMonth() + 1}/{localDate(dateStart).getFullYear()}
              {dateEnd && ` → ${localDate(dateEnd).getDate()}/${localDate(dateEnd).getMonth() + 1}/${localDate(dateEnd).getFullYear()}`}
            </div>
          )}
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {!alert.is_read && (
            <button onClick={markRead} title="Marquer comme lu" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✓</button>
          )}
          {(!alert.is_system || isAdmin) && (
            <button onClick={del} title="Supprimer" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(255,77,109,.2)', background: 'transparent', color: 'rgba(255,77,109,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✕</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AlertsClient({ initialAlerts, employees }: {
  initialAlerts: Alert[]
  employees: Employee[]
}) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [modalOpen, setModalOpen] = useState(false)

  const selectedEmployeeId = useSessionStore(s => s.selectedEmployeeId)
  const myEmployeeId = useSessionStore(s => s.myEmployeeId)
  const isAdmin = useSessionStore(s => s.isAdmin)
  const viewEmpId = isAdmin ? (selectedEmployeeId || null) : myEmployeeId
  const viewAlerts = viewEmpId
    ? alerts.filter(a => a.employee_id === viewEmpId || a.employee_id === null)
    : alerts

  const today = todayStr()
  const unread  = viewAlerts.filter(a => !a.is_read)
  const overdue = viewAlerts.filter(a => a.alert_date && a.alert_date < today && !a.is_read)
  const read    = viewAlerts.filter(a => a.is_read)

  function onSaved(a: Alert) { setAlerts(prev => [a, ...prev]) }
  function onDelete(id: string) { setAlerts(prev => prev.filter(a => a.id !== id)) }
  function onMarkRead(id: string) { setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a)) }

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
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
        >
          + Nouvelle alerte
        </button>
      </div>

      <div style={{ maxWidth: '720px', display: 'grid', gap: '10px' }}>
        {/* Overdue */}
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

        {viewAlerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,.25)', fontSize: '14px' }}>
            Aucune alerte
          </div>
        )}
      </div>

      <AlertModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={onSaved} employees={employees} />
    </div>
  )
}
