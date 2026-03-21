'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/stores/useSessionStore'
import { localDate, todayStr } from '@/lib/utils/dates'
import type { Priority, PriorityPart, Branch, Event } from '@/types/database'

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
  start_date: '', end_date: '',
  branch_ids: [] as string[],
}

// ─── Priority Modal ─────────────────────────────────────────────────────────────

function PriorityModal({
  open, onClose, priority, onSaved, onDeleted, branches, events,
}: {
  open: boolean
  onClose: () => void
  priority: PriorityWithParts | null
  onSaved: (p: PriorityWithParts) => void
  onDeleted: (id: string) => void
  branches: Branch[]
  events: Event[]
}) {
  const supabase = createClient()
  const { selectedEmployeeId, myEmployeeId, isAdmin } = useSessionStore()
  const [tab, setTab] = useState<'new' | 'from-event'>('new')
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [parts, setParts] = useState<{ label: string; done: boolean }[]>([])
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [splitPreset, setSplitPreset] = useState<string | null>(null)
  const [newPart, setNewPart] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  // "From event" tab
  const [selectedEventId, setSelectedEventId] = useState('')

  useEffect(() => {
    if (!open) return
    setTab('new')
    setErr('')
    setSplitEnabled(false)
    setSplitPreset(null)
    setNewPart('')
    setSelectedEventId('')
    if (priority) {
      setForm({
        title: priority.title, description: priority.description,
        color: priority.color, priority_level: priority.priority_level,
        status: priority.status, due_date: priority.due_date ?? '',
        notes: priority.notes,
        start_date: priority.start_date ?? '', end_date: priority.end_date ?? '',
        branch_ids: priority.branch_ids ?? [],
      })
      const hasParts = priority.parts.length > 0
      setParts(priority.parts.map(p => ({ label: p.label, done: p.done })))
      setSplitEnabled(hasParts)
    } else {
      setForm({ ...EMPTY_FORM })
      setParts([])
    }
  }, [open, priority])

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function applyPreset(preset: string) {
    setSplitPreset(preset)
    if (preset === 'Inspection succursales') {
      setParts(branches.map(b => ({ label: `${b.short_code} — ${b.name}`, done: false })))
    } else if (preset === '3 parties') {
      setParts([{ label: '', done: false }, { label: '', done: false }, { label: '', done: false }])
    } else if (preset === '5 parties') {
      setParts(Array.from({ length: 5 }, () => ({ label: '', done: false })))
    } else {
      setParts([])
    }
  }

  function addPart() {
    if (!newPart.trim()) return
    setParts(p => [...p, { label: newPart.trim(), done: false }])
    setNewPart('')
  }

  function selectEvent(evId: string) {
    setSelectedEventId(evId)
    const ev = events.find(e => e.id === evId)
    if (!ev) return
    setForm(f => ({
      ...f,
      title: ev.title,
      description: `Événement du ${ev.start_date}`,
      priority_level: ev.priority_level,
    }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setErr('Titre requis.'); return }
    setSaving(true); setErr('')
    // When admin has selected an employee, create the priority for that employee
    const targetEmpId = (isAdmin && selectedEmployeeId) ? selectedEmployeeId : null
    let resolvedEmpId = targetEmpId
    if (!resolvedEmpId) {
      if (myEmployeeId) {
        resolvedEmpId = myEmployeeId
      } else {
        const { data: profile } = await supabase.from('profiles').select('employee_id').single()
        if (!profile?.employee_id) { setErr('Aucun employé lié.'); setSaving(false); return }
        resolvedEmpId = profile.employee_id
      }
    }

    const usedParts = splitEnabled ? parts : []
    const payload = {
      title: form.title.trim(),
      description: form.description,
      color: form.color,
      priority_level: form.priority_level,
      status: form.status,
      due_date: form.end_date || form.due_date || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      branch_ids: splitEnabled ? [] : form.branch_ids,
      notes: form.notes,
      linked_event_id: tab === 'from-event' && selectedEventId ? selectedEventId : (priority?.linked_event_id ?? null),
    }

    if (priority) {
      const { data, error } = await supabase.from('priorities').update({ ...payload, rank: priority.rank }).eq('id', priority.id).select().single()
      if (error) { setErr(error.message); setSaving(false); return }
      await supabase.from('priority_parts').delete().eq('priority_id', priority.id)
      const newParts = usedParts.map((p, i) => ({ priority_id: priority.id, label: p.label, done: p.done, position: i }))
      const { data: partsData } = newParts.length > 0
        ? await supabase.from('priority_parts').insert(newParts).select()
        : { data: [] }
      onSaved({ ...(data as Priority), parts: (partsData ?? []) as PriorityPart[] })
    } else {
      // Determine next rank
      const { data: allP } = await supabase.from('priorities').select('rank').order('rank', { ascending: false }).limit(1)
      const nextRank = allP && allP.length > 0 ? (allP[0].rank ?? 0) + 1 : 1
      const { data, error } = await supabase.from('priorities').insert({
        ...payload, employee_id: resolvedEmpId, rank: nextRank,
      }).select().single()
      if (error) { setErr(error.message); setSaving(false); return }
      const newParts = usedParts.map((p, i) => ({ priority_id: (data as Priority).id, label: p.label, done: p.done, position: i }))
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
    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
    borderRadius: '9px', color: '#e8e8f0', fontSize: '14px', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: 'rgba(255,255,255,.4)', letterSpacing: '.08em',
    textTransform: 'uppercase', marginBottom: '6px',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '18px', padding: '28px', width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '20px', fontWeight: 800, color: '#e8e8f0' }}>Priorité</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        {/* Tabs — only for creation */}
        {!priority && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'rgba(255,255,255,.05)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
            <button
              onClick={() => setTab('new')}
              style={{ padding: '9px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: tab === 'new' ? 'linear-gradient(135deg,#FF4D6D,#F77F00)' : 'transparent', color: tab === 'new' ? '#fff' : 'rgba(255,255,255,.5)' }}
            >
              Nouvelle priorité
            </button>
            <button
              onClick={() => setTab('from-event')}
              style={{ padding: '9px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: tab === 'from-event' ? 'rgba(255,255,255,.1)' : 'transparent', color: tab === 'from-event' ? '#e8e8f0' : 'rgba(255,255,255,.5)' }}
            >
              Depuis un événement
            </button>
          </div>
        )}

        {/* From-event tab: pick event */}
        {tab === 'from-event' && !priority && (
          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>Événement *</label>
            <select
              value={selectedEventId}
              onChange={e => selectEvent(e.target.value)}
              style={inp}
            >
              <option value="">-- Sélectionner un événement --</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.start_date} · {ev.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gap: '14px' }}>
          {/* Title */}
          <div>
            <label style={lbl}>Titre *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} style={inp} placeholder="Ex: Inspection bâtiment" />
          </div>

          {/* Description */}
          <div>
            <label style={lbl}>Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} style={inp} placeholder="Description optionnelle…" />
          </div>

          {/* Level + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>Niveau</label>
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

          {/* Split toggle */}
          <div
            style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${splitEnabled ? 'rgba(123,47,190,.5)' : 'rgba(255,255,255,.08)'}`, background: splitEnabled ? 'rgba(123,47,190,.08)' : 'rgba(255,255,255,.03)', cursor: 'pointer' }}
            onClick={() => { setSplitEnabled(v => !v); if (splitEnabled) { setParts([]); setSplitPreset(null) } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Toggle pill */}
              <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: splitEnabled ? '#7B2FBE' : 'rgba(255,255,255,.15)', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                <div style={{ position: 'absolute', top: '3px', left: splitEnabled ? '19px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8f0' }}>Diviser en parties</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)' }}>Ex: inspection par succursale, projet en étapes</div>
              </div>
            </div>
          </div>

          {/* Split presets + parts */}
          {splitEnabled && (
            <div style={{ display: 'grid', gap: '10px' }}>
              {/* Preset buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Inspection succursales', '3 parties', '5 parties', 'Personnalisé'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: '1px solid',
                      borderColor: splitPreset === preset ? '#F77F00' : 'rgba(255,255,255,.15)',
                      background: splitPreset === preset ? 'rgba(247,127,0,.15)' : 'transparent',
                      color: splitPreset === preset ? '#F77F00' : 'rgba(255,255,255,.5)',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Parts list */}
              <div style={{ display: 'grid', gap: '6px' }}>
                {parts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', width: '18px', textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                    <input
                      value={p.label}
                      onChange={e => setParts(ps => ps.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      style={{ ...inp, padding: '7px 10px' }}
                      placeholder={`Partie ${i + 1}`}
                    />
                    <button onClick={() => setParts(ps => ps.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'rgba(255,77,109,.5)', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>

              {/* Add part manually */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={newPart} onChange={e => setNewPart(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPart()}
                  placeholder="Ajouter une partie…"
                  style={{ ...inp, flex: 1 }}
                />
                <button onClick={addPart} style={{ padding: '9px 14px', borderRadius: '9px', border: 'none', background: 'rgba(255,255,255,.08)', color: '#e8e8f0', cursor: 'pointer', fontWeight: 600 }}>+</button>
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label style={lbl}>Couleur</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)} style={{ width: '26px', height: '26px', borderRadius: '7px', background: c, border: form.color === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label style={lbl}>Dates</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)', fontWeight: 600, marginBottom: '4px', letterSpacing: '.06em' }}>DÉBUT</div>
                <input type="date" value={form.start_date} onChange={e => {
                  const v = e.target.value
                  set('start_date', v)
                  if (form.end_date && v > form.end_date) set('end_date', v)
                }} style={inp} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)', fontWeight: 600, marginBottom: '4px', letterSpacing: '.06em' }}>FIN / ÉCHÉANCE</div>
                <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={e => set('end_date', e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          {/* Branches — hidden when split is enabled */}
          {!splitEnabled && branches.length > 0 && (
            <div>
              <label style={lbl}>Succursales concernées</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {branches.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => set('branch_ids', form.branch_ids.includes(b.id)
                      ? form.branch_ids.filter(x => x !== b.id)
                      : [...form.branch_ids, b.id]
                    )}
                    style={{
                      padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', border: '1px solid',
                      borderColor: form.branch_ids.includes(b.id) ? b.color : 'rgba(255,255,255,.15)',
                      background: form.branch_ids.includes(b.id) ? `${b.color}22` : 'transparent',
                      color: form.branch_ids.includes(b.id) ? b.color : 'rgba(255,255,255,.4)',
                    }}
                  >
                    {b.short_code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {err && <div style={{ fontSize: '13px', color: '#FF4D6D', textAlign: 'center' }}>{err}</div>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            {priority && (
              <button onClick={handleDelete} style={{ padding: '11px 18px', borderRadius: '10px', border: '1px solid rgba(255,77,109,.4)', background: 'transparent', color: '#FF4D6D', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                Supprimer
              </button>
            )}
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? .7 : 1 }}>
              {saving ? 'Enregistrement…' : priority ? 'Enregistrer' : 'Créer la priorité'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Priority Row ───────────────────────────────────────────────────────────────

function PriorityRow({
  p, rank, isFirst, isLast, branches,
  onEdit, onMoveUp, onMoveDown, onToggleLock, onTogglePart,
}: {
  p: PriorityWithParts
  rank: number
  isFirst: boolean
  isLast: boolean
  branches: Branch[]
  onEdit: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleLock: () => void
  onTogglePart: (partId: string, done: boolean) => void
}) {
  const pc = priorityColor(p.priority_level)
  const sc = statusColor(p.status)
  const doneParts = p.parts.filter(pt => pt.done).length
  const totalParts = p.parts.length
  const pct = totalParts ? Math.round(doneParts / totalParts * 100) : null
  const isOverdue = p.due_date && p.due_date < todayStr() && p.status !== 'Terminé'
  const [partsOpen, setPartsOpen] = useState(totalParts <= 4)

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
    cursor: 'pointer', border: '1px solid rgba(255,255,255,.15)',
    background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.6)',
  }

  return (
    <div style={{ background: '#13131f', borderRadius: '14px', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', position: 'relative' }}>
      {/* Colored left border */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: p.color }} />

      <div style={{ padding: '14px 16px 14px 22px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Rank + arrows */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: p.color, fontFamily: 'var(--font-syne)', lineHeight: 1, minWidth: '24px', textAlign: 'center' }}>{rank}</span>
          <button
            onClick={onMoveUp} disabled={isFirst || p.locked}
            style={{ background: 'none', border: 'none', color: isFirst || p.locked ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.4)', cursor: isFirst || p.locked ? 'default' : 'pointer', fontSize: '14px', lineHeight: 1, padding: '1px' }}
          >▲</button>
          <button
            onClick={onMoveDown} disabled={isLast || p.locked}
            style={{ background: 'none', border: 'none', color: isLast || p.locked ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.4)', cursor: isLast || p.locked ? 'default' : 'pointer', fontSize: '14px', lineHeight: 1, padding: '1px' }}
          >▼</button>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onEdit}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8f0' }}>{p.title}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: pc, background: `${pc}18`, padding: '2px 7px', borderRadius: '6px' }}>• {p.priority_level}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: sc, background: `${sc}18`, padding: '2px 7px', borderRadius: '6px' }}>{p.status}</span>
          </div>
          {p.description && (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', marginBottom: '8px' }}>{p.description}</div>
          )}
          {/* Progress bar */}
          {pct !== null && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ height: '3px', background: 'rgba(255,255,255,.08)', borderRadius: '2px' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#06D6A0' : p.color, borderRadius: '2px', transition: 'width .3s' }} />
              </div>
            </div>
          )}
          {/* Footer meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            {p.start_date && p.end_date && p.start_date !== p.end_date
              ? <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)' }}>
                  {localDate(p.start_date).toLocaleDateString('fr-CA')} → {localDate(p.end_date).toLocaleDateString('fr-CA')}
                </span>
              : p.end_date || p.due_date
              ? <span style={{ fontSize: '11px', color: isOverdue ? '#FF4D6D' : 'rgba(255,255,255,.3)', fontWeight: isOverdue ? 700 : 400 }}>
                  {isOverdue ? '⚠ ' : ''}Échéance : {localDate((p.end_date || p.due_date)!).toLocaleDateString('fr-CA')}
                </span>
              : null
            }
            {(p.branch_ids ?? []).length > 0 && branches.filter(b => p.branch_ids.includes(b.id)).map(b => (
              <span key={b.id} style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '5px', background: `${b.color}22`, color: b.color, border: `1px solid ${b.color}44` }}>
                {b.short_code}
              </span>
            ))}
          </div>
        </div>

        {/* Right-side actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          {p.locked && (
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#FCBF49', background: 'rgba(252,191,73,.15)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(252,191,73,.3)', letterSpacing: '.05em' }}>
              VERROUILLÉ
            </span>
          )}
          {pct !== null && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: p.color }}>{pct}%</span>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button onClick={onToggleLock} style={{ ...btnStyle, color: p.locked ? '#FCBF49' : 'rgba(255,255,255,.5)', borderColor: p.locked ? 'rgba(252,191,73,.4)' : 'rgba(255,255,255,.15)' }}>
              {p.locked ? 'Déverr.' : 'Verr.'}
            </button>
            <button onClick={onEdit} style={btnStyle}>Edit.</button>
          </div>
        </div>
      </div>

      {/* Parts sub-list — collapsible */}
      {p.parts.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
          {/* Collapse toggle header */}
          <button
            onClick={() => setPartsOpen(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px 8px 22px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.06em', textTransform: 'uppercase', flex: 1 }}>
              {doneParts}/{totalParts} PARTIES COMPLÉTÉES
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', transition: 'transform .2s', display: 'inline-block', transform: partsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
          </button>
          {partsOpen && (
            <div style={{ padding: '0 16px 12px 22px', display: 'grid', gap: '4px' }}>
              {p.parts.map(pt => (
                <div
                  key={pt.id}
                  onClick={() => onTogglePart(pt.id, !pt.done)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', background: pt.done ? 'rgba(6,214,160,.06)' : 'rgba(255,255,255,.03)', border: `1px solid ${pt.done ? 'rgba(6,214,160,.2)' : 'rgba(255,255,255,.06)'}` }}
                >
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                    border: pt.done ? 'none' : '2px solid rgba(255,255,255,.2)',
                    background: pt.done ? '#06D6A0' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {pt.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{ fontSize: '13px', color: pt.done ? 'rgba(255,255,255,.3)' : '#e8e8f0', textDecoration: pt.done ? 'line-through' : 'none', flex: 1 }}>
                    {pt.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function PrioritiesClient({
  initialPriorities, branches, events,
}: {
  initialPriorities: PriorityWithParts[]
  branches: Branch[]
  events: Event[]
}) {
  const supabase = createClient()
  const [priorities, setPriorities] = useState(initialPriorities)
  const [modalOpen, setModalOpen] = useState(false)
  const [editPriority, setEditPriority] = useState<PriorityWithParts | null>(null)

  const selectedEmployeeId = useSessionStore(s => s.selectedEmployeeId)
  const myEmployeeId = useSessionStore(s => s.myEmployeeId)
  const isAdmin = useSessionStore(s => s.isAdmin)
  const viewEmpId = isAdmin ? (selectedEmployeeId || null) : myEmployeeId
  const viewPriorities = viewEmpId
    ? priorities.filter(p => p.employee_id === viewEmpId)
    : priorities

  // Sorted by rank
  const sorted = [...viewPriorities].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))

  // Stats
  const total = sorted.length
  const enCours = sorted.filter(p => p.status === 'En cours').length
  const termines = sorted.filter(p => p.status === 'Terminé').length
  const verrouilles = sorted.filter(p => p.locked).length

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

  async function handleToggleLock(p: PriorityWithParts) {
    const newLocked = !p.locked
    setPriorities(prev => prev.map(x => x.id === p.id ? { ...x, locked: newLocked } : x))
    await supabase.from('priorities').update({ locked: newLocked }).eq('id', p.id)
  }

  async function handleMove(p: PriorityWithParts, direction: 'up' | 'down') {
    if (p.locked) return
    const sortedAll = [...priorities].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    const idx = sortedAll.findIndex(x => x.id === p.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sortedAll.length) return
    const other = sortedAll[swapIdx]
    if (other.locked) return

    const newRankA = other.rank ?? swapIdx
    const newRankB = p.rank ?? idx

    setPriorities(prev => prev.map(x => {
      if (x.id === p.id) return { ...x, rank: newRankA }
      if (x.id === other.id) return { ...x, rank: newRankB }
      return x
    }))

    await Promise.all([
      supabase.from('priorities').update({ rank: newRankA }).eq('id', p.id),
      supabase.from('priorities').update({ rank: newRankB }).eq('id', other.id),
    ])
  }

  async function handleTogglePart(p: PriorityWithParts, partId: string, done: boolean) {
    setPriorities(prev => prev.map(x => x.id === p.id
      ? { ...x, parts: x.parts.map(pt => pt.id === partId ? { ...pt, done } : pt) }
      : x
    ))
    await supabase.from('priority_parts').update({ done }).eq('id', partId)
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Tâches</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '28px', fontWeight: 800, color: '#e8e8f0' }}>Priorités</h1>
        </div>
        <button
          onClick={() => openModal(null)}
          style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
        >
          + Priorité
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: total, color: 'rgba(255,255,255,.5)' },
          { label: 'En cours', value: enCours, color: '#F77F00' },
          { label: 'Terminés', value: termines, color: '#06D6A0' },
          { label: 'Verrouillés', value: verrouilles, color: '#FCBF49' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px 18px', borderRadius: '14px', background: '#13131f', border: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-syne)', lineHeight: 1, marginBottom: '6px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Priority list */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,.2)', fontSize: '14px' }}>
          Aucune priorité
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {sorted.map((p, idx) => (
            <PriorityRow
              key={p.id}
              p={p}
              rank={idx + 1}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              branches={branches}
              onEdit={() => openModal(p)}
              onMoveUp={() => handleMove(p, 'up')}
              onMoveDown={() => handleMove(p, 'down')}
              onToggleLock={() => handleToggleLock(p)}
              onTogglePart={(partId, done) => handleTogglePart(p, partId, done)}
            />
          ))}
        </div>
      )}

      <PriorityModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        priority={editPriority} onSaved={onSaved} onDeleted={onDeleted}
        branches={branches} events={events}
      />
    </div>
  )
}
