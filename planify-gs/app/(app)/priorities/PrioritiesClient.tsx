'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayStr, localDate } from '@/lib/utils/dates'
import type { Priority, PriorityPart } from '@/types/database'

const COLORS = ['#FF4D6D','#F77F00','#FCBF49','#4CC9F0','#7B2FBE','#06D6A0','#3A86FF','#FB5607','#8338EC','#06A77D']

const STATUSES: Priority['status'][] = ['À faire','En cours','En révision','Terminé','Bloqué']

function statusColor(s: string) {
  const map: Record<string, string> = {
    'À faire': '#4CC9F0', 'En cours': '#F77F00', 'En révision': '#7B2FBE',
    'Terminé': '#06D6A0', 'Bloqué': '#FF4D6D',
  }
  return map[s] ?? '#888'
}

function priorityColor(level: string) {
  if (level === 'Élevé') return '#FF4D6D'
  if (level === 'Faible') return '#4CC9F0'
  return '#FCBF49'
}

type PriorityWithParts = Priority & { parts: PriorityPart[] }

const EMPTY_FORM = {
  title: '', description: '', color: '#FF4D6D',
  priority_level: 'Moyen' as Priority['priority_level'],
  status: 'À faire' as Priority['status'],
  due_date: '', notes: '',
}

// ─── Priority Modal ────────────────────────────────────────────────────────────

function PriorityModal({
  open, onClose, priority, onSaved, onDeleted,
}: {
  open: boolean
  onClose: () => void
  priority: PriorityWithParts | null
  onSaved: (p: PriorityWithParts) => void
  onDeleted: (id: string) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [parts, setParts] = useState<{ label: string; done: boolean }[]>([])
  const [newPart, setNewPart] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    if (priority) {
      setForm({
        title: priority.title, description: priority.description,
        color: priority.color, priority_level: priority.priority_level,
        status: priority.status, due_date: priority.due_date ?? '',
        notes: priority.notes,
      })
      setParts(priority.parts.map(p => ({ label: p.label, done: p.done })))
    } else {
      setForm({ ...EMPTY_FORM })
      setParts([])
    }
    setErr('')
  }, [open, priority])

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function addPart() {
    if (!newPart.trim()) return
    setParts(p => [...p, { label: newPart.trim(), done: false }])
    setNewPart('')
  }

  async function handleSave() {
    if (!form.title.trim()) { setErr('Titre requis.'); return }
    setSaving(true); setErr('')
    const payload = {
      title: form.title.trim(), description: form.description,
      color: form.color, priority_level: form.priority_level,
      status: form.status, due_date: form.due_date || null,
      notes: form.notes, rank: priority?.rank ?? 0,
    }
    if (priority) {
      const { data, error } = await supabase.from('priorities').update(payload).eq('id', priority.id).select().single()
      if (error) { setErr(error.message); setSaving(false); return }
      // Update parts: delete all then re-insert
      await supabase.from('priority_parts').delete().eq('priority_id', priority.id)
      const newParts = parts.map((p, i) => ({ priority_id: priority.id, label: p.label, done: p.done, position: i }))
      const { data: partsData } = newParts.length > 0
        ? await supabase.from('priority_parts').insert(newParts).select()
        : { data: [] }
      onSaved({ ...(data as Priority), parts: (partsData ?? []) as PriorityPart[] })
    } else {
      // Need employee_id — get from session
      const { data: profile } = await supabase.from('profiles').select('employee_id').single()
      if (!profile?.employee_id) { setErr('Aucun employé lié à votre compte.'); setSaving(false); return }
      const { data, error } = await supabase.from('priorities').insert({ ...payload, employee_id: profile.employee_id }).select().single()
      if (error) { setErr(error.message); setSaving(false); return }
      const newParts = parts.map((p, i) => ({ priority_id: (data as Priority).id, label: p.label, done: p.done, position: i }))
      const { data: partsData } = newParts.length > 0
        ? await supabase.from('priority_parts').insert(newParts).select()
        : { data: [] }
      onSaved({ ...(data as Priority), parts: (partsData ?? []) as PriorityPart[] })
    }
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!priority) return
    if (!confirm('Supprimer cette priorité ?')) return
    await supabase.from('priorities').delete().eq('id', priority.id)
    onDeleted(priority.id)
    onClose()
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

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '18px', padding: '28px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 800, color: '#e8e8f0' }}>
            {priority ? 'Modifier la priorité' : 'Nouvelle priorité'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={lbl}>Titre *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} style={inp} placeholder="Ex: Migration base de données" />
          </div>
          <div>
            <label style={lbl}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ ...inp, resize: 'vertical', minHeight: '70px' }} placeholder="Description optionnelle…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>Priorité</label>
              <select value={form.priority_level} onChange={e => set('priority_level', e.target.value as Priority['priority_level'])} style={inp}>
                <option value="Faible">Faible</option>
                <option value="Moyen">Moyen</option>
                <option value="Élevé">Élevé</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Statut</label>
              <select value={form.status} onChange={e => set('status', e.target.value as Priority['status'])} style={inp}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Date d'échéance</label>
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Couleur</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)} style={{ width: '28px', height: '28px', borderRadius: '8px', background: c, border: form.color === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          {/* Sub-tasks */}
          <div>
            <label style={lbl}>Sous-tâches</label>
            <div style={{ display: 'grid', gap: '6px', marginBottom: '8px' }}>
              {parts.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(255,255,255,.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,.07)' }}>
                  <input
                    type="checkbox" checked={p.done}
                    onChange={() => setParts(ps => ps.map((x, j) => j === i ? { ...x, done: !x.done } : x))}
                    style={{ accentColor: '#06D6A0', width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1, fontSize: '13px', color: '#e8e8f0', textDecoration: p.done ? 'line-through' : 'none', opacity: p.done ? .5 : 1 }}>{p.label}</span>
                  <button onClick={() => setParts(ps => ps.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'rgba(255,77,109,.6)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={newPart} onChange={e => setNewPart(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPart()}
                placeholder="Ajouter une sous-tâche…"
                style={{ ...inp, flex: 1 }}
              />
              <button onClick={addPart} style={{ padding: '10px 16px', borderRadius: '9px', border: 'none', background: 'rgba(255,255,255,.08)', color: '#e8e8f0', cursor: 'pointer', fontWeight: 600 }}>+</button>
            </div>
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} style={{ ...inp, resize: 'vertical', minHeight: '60px' }} placeholder="Notes…" />
          </div>

          {err && <div style={{ fontSize: '13px', color: '#FF4D6D', textAlign: 'center' }}>{err}</div>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            {priority && (
              <button onClick={handleDelete} style={{ padding: '11px 18px', borderRadius: '10px', border: '1px solid rgba(255,77,109,.4)', background: 'transparent', color: '#FF4D6D', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Supprimer</button>
            )}
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#7B2FBE,#FF4D6D)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? .7 : 1 }}>
              {saving ? 'Enregistrement…' : priority ? 'Enregistrer' : 'Créer la priorité'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Priority Card ─────────────────────────────────────────────────────────────

function PriorityCard({ p, onClick }: { p: PriorityWithParts; onClick: () => void }) {
  const supabase = createClient()
  const [parts, setParts] = useState(p.parts)
  const sc = statusColor(p.status)
  const pc = priorityColor(p.priority_level)
  const doneParts = parts.filter(pt => pt.done).length
  const pct = parts.length ? Math.round(doneParts / parts.length * 100) : null

  async function togglePart(part: PriorityPart) {
    const newDone = !part.done
    setParts(ps => ps.map(x => x.id === part.id ? { ...x, done: newDone } : x))
    await supabase.from('priority_parts').update({ done: newDone }).eq('id', part.id)
  }

  const isOverdue = p.due_date && p.due_date < todayStr() && p.status !== 'Terminé'

  return (
    <div style={{ background: '#13131f', borderRadius: '14px', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: p.color }} />
      <div style={{ padding: '14px 16px 14px 20px', cursor: 'pointer' }} onClick={onClick}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>{p.title}</div>
            {p.description && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)', lineHeight: 1.5 }}>{p.description}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: sc, background: `${sc}18`, padding: '2px 8px', borderRadius: '8px' }}>{p.status}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: pc, background: `${pc}15`, padding: '1px 7px', borderRadius: '6px' }}>{p.priority_level}</span>
          </div>
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,.35)', marginBottom: '4px' }}>
              <span>{doneParts}/{parts.length} sous-tâches</span>
              <span>{pct}%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,.1)', borderRadius: '2px' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#06D6A0' : p.color, borderRadius: '2px', transition: 'width .3s' }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {p.due_date && (
            <span style={{ fontSize: '11px', color: isOverdue ? '#FF4D6D' : 'rgba(255,255,255,.35)', fontWeight: isOverdue ? 700 : 400 }}>
              {isOverdue ? '⚠ ' : ''}Échéance : {localDate(p.due_date).getDate()}/{localDate(p.due_date).getMonth() + 1}/{localDate(p.due_date).getFullYear()}
            </span>
          )}
        </div>
      </div>

      {/* Sub-tasks */}
      {parts.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '10px 16px 10px 20px' }}>
          {parts.map(pt => (
            <div
              key={pt.id}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); togglePart(pt) }}
            >
              <div style={{
                width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                border: pt.done ? 'none' : '2px solid rgba(255,255,255,.2)',
                background: pt.done ? '#4CAF50' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pt.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span style={{ fontSize: '13px', color: pt.done ? 'rgba(255,255,255,.35)' : '#e8e8f0', textDecoration: pt.done ? 'line-through' : 'none' }}>
                {pt.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PrioritiesClient({ initialPriorities }: { initialPriorities: PriorityWithParts[] }) {
  const [priorities, setPriorities] = useState(initialPriorities)
  const [modalOpen, setModalOpen] = useState(false)
  const [editPriority, setEditPriority] = useState<PriorityWithParts | null>(null)
  const [filter, setFilter] = useState<Priority['status'] | 'all'>('all')

  // Stats
  const stats: { label: Priority['status'] | 'Tout'; count: number; color: string }[] = [
    { label: 'Tout', count: priorities.length, color: 'rgba(255,255,255,.4)' },
    { label: 'À faire', count: priorities.filter(p => p.status === 'À faire').length, color: '#4CC9F0' },
    { label: 'En cours', count: priorities.filter(p => p.status === 'En cours').length, color: '#F77F00' },
    { label: 'Terminé', count: priorities.filter(p => p.status === 'Terminé').length, color: '#06D6A0' },
  ]

  const filtered = filter === 'all' ? priorities : priorities.filter(p => p.status === filter)

  function openModal(p: PriorityWithParts | null) {
    setEditPriority(p)
    setModalOpen(true)
  }

  function onSaved(p: PriorityWithParts) {
    setPriorities(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = p; return n }
      return [...prev, p]
    })
  }

  function onDeleted(id: string) {
    setPriorities(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Tâches</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>Priorités</h1>
        </div>
        <button
          onClick={() => openModal(null)}
          style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#7B2FBE,#FF4D6D)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
        >
          + Priorité
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {stats.map(s => (
          <button
            key={s.label}
            onClick={() => setFilter(s.label === 'Tout' ? 'all' : s.label as Priority['status'])}
            style={{
              padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
              border: `1px solid ${(filter === 'all' && s.label === 'Tout') || filter === s.label ? `${s.color}50` : 'rgba(255,255,255,.07)'}`,
              background: (filter === 'all' && s.label === 'Tout') || filter === s.label ? `${s.color}10` : '#13131f',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-syne)', marginBottom: '4px' }}>{s.count}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,.25)', fontSize: '14px' }}>
          Aucune priorité{filter !== 'all' ? ` "${filter}"` : ''}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {filtered.map(p => (
            <PriorityCard key={p.id} p={p} onClick={() => openModal(p)} />
          ))}
        </div>
      )}

      <PriorityModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        priority={editPriority} onSaved={onSaved} onDeleted={onDeleted}
      />
    </div>
  )
}
