'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCalendarStore } from '@/stores/useCalendarStore'
import { useSessionStore } from '@/stores/useSessionStore'
import {
  todayStr, addDays, getMondayOf, shortDay, shortMonth,
  fullMonth, localDate, dateStr, eventVisibleOn, formatHour,
} from '@/lib/utils/dates'
import type { Event, Employee, Branch } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLORS = ['#FF4D6D','#F77F00','#FCBF49','#4CC9F0','#7B2FBE','#06D6A0','#3A86FF','#FB5607','#8338EC','#06A77D']

function isoWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function priorityBadge(level: string) {
  if (level === 'Élevé') return { label: 'ÉLEVÉ', color: '#FF4D6D', bg: 'rgba(255,77,109,.15)' }
  if (level === 'Faible') return { label: 'FAIBLE', color: '#4CC9F0', bg: 'rgba(76,201,240,.12)' }
  return { label: 'MOYEN', color: '#FCBF49', bg: 'rgba(252,191,73,.12)' }
}

const EMPTY_FORM = {
  title: '',
  start_date: todayStr(),
  end_date: todayStr(),
  start_hour: 9,
  end_hour: 17,
  all_day: true,
  color: '#FF4D6D',
  priority_level: 'Moyen' as 'Faible' | 'Moyen' | 'Élevé',
  repeat_rule: 'Aucune' as 'Aucune' | 'Chaque semaine' | 'Chaque mois' | 'Chaque année',
  repeat_end_date: '',
  branch_ids: [] as string[],
  done: false,
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

function EventModal({
  open, onClose, event, employees, branches, myEmployeeId, isAdmin, onSaved, onDeleted,
}: {
  open: boolean
  onClose: () => void
  event: Event | null
  employees: Employee[]
  branches: Branch[]
  myEmployeeId: string | null
  isAdmin: boolean
  onSaved: (ev: Event) => void
  onDeleted: (id: string) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [empId, setEmpId] = useState<string>(myEmployeeId ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    if (event) {
      setForm({
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date,
        start_hour: event.start_hour,
        end_hour: event.end_hour,
        all_day: event.all_day,
        color: event.color,
        priority_level: event.priority_level,
        repeat_rule: event.repeat_rule,
        repeat_end_date: event.repeat_end_date ?? '',
        branch_ids: event.branch_ids ?? [],
        done: event.done,
      })
      setEmpId(event.employee_id)
    } else {
      setForm({ ...EMPTY_FORM, start_date: todayStr(), end_date: todayStr() })
      setEmpId(myEmployeeId ?? '')
    }
    setErr('')
  }, [open, event, myEmployeeId])

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function toggleBranch(id: string) {
    setForm(f => ({
      ...f,
      branch_ids: f.branch_ids.includes(id)
        ? f.branch_ids.filter(b => b !== id)
        : [...f.branch_ids, id],
    }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setErr('Le titre est requis.'); return }
    if (!empId) { setErr('Sélectionnez un employé.'); return }
    setSaving(true); setErr('')
    const payload = {
      employee_id: empId,
      title: form.title.trim(),
      start_date: form.start_date,
      end_date: form.end_date < form.start_date ? form.start_date : form.end_date,
      start_hour: form.start_hour,
      end_hour: form.end_hour,
      all_day: form.all_day,
      color: form.color,
      priority_level: form.priority_level,
      repeat_rule: form.repeat_rule,
      repeat_end_date: form.repeat_end_date || null,
      branch_ids: form.branch_ids,
      done: form.done,
    }
    if (event) {
      const { data, error } = await supabase.from('events').update(payload).eq('id', event.id).select().single()
      if (error) { setErr(error.message); setSaving(false); return }
      onSaved(data as Event)
    } else {
      const { data, error } = await supabase.from('events').insert(payload).select().single()
      if (error) { setErr(error.message); setSaving(false); return }
      onSaved(data as Event)
    }
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!event) return
    if (!confirm('Supprimer cet événement ?')) return
    setDeleting(true)
    await supabase.from('events').delete().eq('id', event.id)
    onDeleted(event.id)
    setDeleting(false)
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
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#13131f', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: '18px', padding: '28px', width: '500px',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 800, color: '#e8e8f0' }}>
            {event ? 'Modifier l\'événement' : 'Nouvel événement'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          {/* Title */}
          <div>
            <label style={lbl}>Titre *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} style={inp} placeholder="Ex: Réunion d'équipe" />
          </div>

          {/* Employee (admin only) */}
          {isAdmin && (
            <div>
              <label style={lbl}>Employé *</label>
              <select value={empId} onChange={e => setEmpId(e.target.value)} style={inp}>
                <option value="">-- Sélectionner --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>Date début *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Date fin</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={inp} />
            </div>
          </div>

          {/* All day toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={form.all_day} onChange={e => set('all_day', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#FF4D6D' }}
            />
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,.6)' }}>Toute la journée</span>
          </label>

          {/* Hours (if not all day) */}
          {!form.all_day && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={lbl}>Heure début</label>
                <select value={form.start_hour} onChange={e => set('start_hour', +e.target.value)} style={inp}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{formatHour(i)}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Heure fin</label>
                <select value={form.end_hour} onChange={e => set('end_hour', +e.target.value)} style={inp}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{formatHour(i)}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label style={lbl}>Couleur</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: c, border: form.color === c ? '3px solid #fff' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label style={lbl}>Priorité</label>
            <select value={form.priority_level} onChange={e => set('priority_level', e.target.value as 'Faible' | 'Moyen' | 'Élevé')} style={inp}>
              <option value="Faible">Faible</option>
              <option value="Moyen">Moyen</option>
              <option value="Élevé">Élevé</option>
            </select>
          </div>

          {/* Repeat */}
          <div>
            <label style={lbl}>Répétition</label>
            <select value={form.repeat_rule} onChange={e => set('repeat_rule', e.target.value as typeof form.repeat_rule)} style={inp}>
              <option value="Aucune">Aucune</option>
              <option value="Chaque semaine">Chaque semaine</option>
              <option value="Chaque mois">Chaque mois</option>
              <option value="Chaque année">Chaque année</option>
            </select>
          </div>

          {form.repeat_rule !== 'Aucune' && (
            <div>
              <label style={lbl}>Fin de répétition</label>
              <input type="date" value={form.repeat_end_date} onChange={e => set('repeat_end_date', e.target.value)} style={inp} />
            </div>
          )}

          {/* Branches */}
          {branches.length > 0 && (
            <div>
              <label style={lbl}>Succursales concernées</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {branches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => toggleBranch(b.id)}
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

          {/* Done */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={form.done} onChange={e => set('done', e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#06D6A0' }}
            />
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,.6)' }}>Marqué comme terminé</span>
          </label>

          {err && <div style={{ fontSize: '13px', color: '#FF4D6D', textAlign: 'center' }}>{err}</div>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            {event && (
              <button
                onClick={handleDelete} disabled={deleting}
                style={{ padding: '11px 18px', borderRadius: '10px', border: '1px solid rgba(255,77,109,.4)', background: 'transparent', color: '#FF4D6D', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                {deleting ? '…' : 'Supprimer'}
              </button>
            )}
            <button
              onClick={handleSave} disabled={saving}
              style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? .7 : 1 }}
            >
              {saving ? 'Enregistrement…' : event ? 'Enregistrer' : 'Créer l\'événement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Week View (time grid) ──────────────────────────────────────────────────────

function WeekView({ wkStart, showWeekends, filter, events, branches, onEventClick, onDateClick }: {
  wkStart: string
  showWeekends: boolean
  filter: string
  events: Event[]
  branches: Branch[]
  onEventClick: (ev: Event) => void
  onDateClick: (date: string) => void
}) {
  const [startHour, setStartHour] = useState(8)
  const [endHour, setEndHour] = useState(17)
  const today = todayStr()
  const days = Array.from({ length: showWeekends ? 7 : 5 }, (_, i) => addDays(wkStart, i))
  const ROW_H = 56 // px per hour
  const TIME_COL = 52 // px for time label column

  function matchesFilter(ev: Event) {
    if (filter === 'done') return ev.done
    if (filter === 'undone') return !ev.done
    if (filter === 'high') return ev.priority_level === 'Élevé'
    if (filter === 'medium') return ev.priority_level === 'Moyen'
    return true
  }

  const colStyle: React.CSSProperties = {
    borderLeft: '1px solid rgba(255,255,255,.05)',
    position: 'relative',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'rgba(255,255,255,.01)', borderRadius: '14px', border: '1px solid rgba(255,255,255,.07)' }}>

      {/* Début control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,.05)', flexShrink: 0 }}>
        <button onClick={() => setStartHour(h => Math.max(0, h - 1))} style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <button onClick={() => setStartHour(h => Math.min(endHour - 1, h + 1))} style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Début: {formatHour(startHour)}</span>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: `${TIME_COL}px repeat(${days.length}, 1fr)`, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div /> {/* time col header */}
        {days.map(day => {
          const isToday = day === today
          const d = localDate(day)
          // Collect unique branch short_codes for events on this day
          const dayBranchIds = [...new Set(
            events.filter(ev => eventVisibleOn(ev, day) && matchesFilter(ev))
              .flatMap(ev => ev.branch_ids || [])
          )]
          const dayBranches = dayBranchIds.map(bid => branches.find(b => b.id === bid)).filter(Boolean) as Branch[]
          return (
            <div key={day} style={{ padding: '8px 8px 6px', textAlign: 'center', background: isToday ? 'rgba(76,201,240,.05)' : 'transparent', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: isToday ? '#4CC9F0' : 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>
                {shortDay(day)}
              </div>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isToday ? '#4CC9F0' : 'transparent',
                fontSize: '15px', fontWeight: 800,
                color: isToday ? '#0a0a12' : '#e8e8f0',
                fontFamily: 'var(--font-syne)',
              }}>
                {d.getDate()}
              </div>
              {/* City / branch badges */}
              {dayBranches.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px', marginTop: '4px' }}>
                  {dayBranches.map(b => (
                    <span key={b.id} style={{
                      fontSize: '8px', fontWeight: 700,
                      color: b.color, background: `${b.color}22`,
                      border: `1px solid ${b.color}55`,
                      borderRadius: '3px', padding: '0 3px', lineHeight: '14px',
                    }}>{b.short_code}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* All-day row (JRNÉE) */}
      <div style={{ display: 'grid', gridTemplateColumns: `${TIME_COL}px repeat(${days.length}, 1fr)`, borderBottom: '1px solid rgba(255,255,255,.07)', flexShrink: 0, minHeight: '32px' }}>
        <div style={{ padding: '6px 4px 6px 8px', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.25)', letterSpacing: '.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>JRNÉE</div>
        {days.map(day => {
          const allDayEvs = events.filter(ev => ev.all_day && eventVisibleOn(ev, day) && matchesFilter(ev))
          return (
            <div key={day} onClick={() => onDateClick(day)} style={{ ...colStyle, padding: '4px 4px' }}>
              {allDayEvs.map(ev => (
                <div key={ev.id} onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                  style={{ borderLeft: `3px solid ${ev.color}`, background: `${ev.color}22`, borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: '#e8e8f0', marginBottom: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer', opacity: ev.done ? .5 : 1, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: ev.done ? 'line-through' : 'none' }}>
                  <span style={{ flexShrink: 0, color: ev.done ? '#06D6A0' : ev.color, fontSize: '12px' }}>{ev.done ? '☑' : '☐'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${TIME_COL}px repeat(${days.length}, 1fr)` }}>

          {/* Time labels column — +1 to include the end-hour label (e.g. 17h) */}
          <div>
            {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
              <div key={i} style={{ height: ROW_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: '8px', paddingTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.25)', fontWeight: 600 }}>{formatHour(startHour + i)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const isToday = day === today
            const timedEvs = events.filter(ev => !ev.all_day && eventVisibleOn(ev, day) && matchesFilter(ev))
            const totalRows = endHour - startHour + 1  // +1 so the end-hour row is visible

            return (
              <div key={day} onClick={() => onDateClick(day)} style={{ ...colStyle, background: isToday ? 'rgba(76,201,240,.02)' : 'transparent', height: `${totalRows * ROW_H}px` }}>
                {/* Hour dividers */}
                {Array.from({ length: totalRows }, (_, i) => (
                  <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${i * ROW_H}px`, height: `${ROW_H}px`, borderTop: '1px solid rgba(255,255,255,.04)' }} />
                ))}
                {/* Timed events */}
                {timedEvs.map(ev => {
                  const evStart = Math.max(ev.start_hour, startHour)
                  const evEnd = Math.min(ev.end_hour > ev.start_hour ? ev.end_hour : ev.start_hour + 1, endHour)
                  if (evStart >= endHour) return null
                  const top = (evStart - startHour) * ROW_H
                  const height = Math.max((evEnd - evStart) * ROW_H - 2, 20)
                  return (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                      style={{
                        position: 'absolute', left: '3px', right: '3px',
                        top: `${top + 2}px`, height: `${height}px`,
                        background: `${ev.color}28`, borderLeft: `3px solid ${ev.color}`,
                        borderRadius: '6px', padding: '3px 6px', overflow: 'hidden',
                        cursor: 'pointer', zIndex: 1, opacity: ev.done ? .5 : 1,
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: 700, color: ev.color, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {ev.done ? '☑' : '☐'} {formatHour(ev.start_hour)}–{formatHour(ev.end_hour)} · {ev.title}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Fin control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,.05)', flexShrink: 0 }}>
        <button onClick={() => setEndHour(h => Math.max(startHour + 1, h - 1))} style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <button onClick={() => setEndHour(h => Math.min(23, h + 1))} style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>Fin: {formatHour(endHour)}</span>
      </div>
    </div>
  )
}

// ─── Day View ──────────────────────────────────────────────────────────────────

function DayView({ day, events, filter, onEventClick }: {
  day: string
  events: Event[]
  filter: string
  onEventClick: (ev: Event) => void
}) {
  function filterEvent(ev: Event) {
    if (filter === 'done') return ev.done
    if (filter === 'undone') return !ev.done
    if (filter === 'high') return ev.priority_level === 'Élevé'
    if (filter === 'medium') return ev.priority_level === 'Moyen'
    return true
  }

  const dayEvents = events.filter(ev => eventVisibleOn(ev, day) && filterEvent(ev))
  const d = localDate(day)

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', marginBottom: '2px' }}>
          {shortDay(day)} {d.getDate()} {shortMonth(day)} {d.getFullYear()}
        </div>
      </div>
      {dayEvents.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: '14px' }}>
          Aucun événement ce jour
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {dayEvents.map(ev => {
            const pb = priorityBadge(ev.priority_level)
            return (
              <div
                key={ev.id}
                onClick={() => onEventClick(ev)}
                style={{
                  background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)',
                  borderLeft: `4px solid ${ev.color}`, borderRadius: '10px',
                  padding: '12px 14px', cursor: 'pointer',
                  opacity: ev.done ? .55 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#e8e8f0', textDecoration: ev.done ? 'line-through' : 'none' }}>
                    {ev.title}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: pb.bg, color: pb.color, letterSpacing: '.04em' }}>
                    {pb.label}
                  </span>
                </div>
                {!ev.all_day && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)' }}>
                    {formatHour(ev.start_hour)} – {formatHour(ev.end_hour)}
                  </div>
                )}
                {ev.done && <div style={{ fontSize: '11px', color: '#06D6A0', fontWeight: 600, marginTop: '4px' }}>✓ Terminé</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Month View ────────────────────────────────────────────────────────────────

function MonthView({ monView, showWeekends, filter, events, onEventClick, onDateClick }: {
  monView: string
  showWeekends: boolean
  filter: string
  events: Event[]
  onEventClick: (ev: Event) => void
  onDateClick: (date: string) => void
}) {
  const today = todayStr()
  const [y, m] = monView.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  // Monday-based offset
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(y, m, 0).getDate()

  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dateStr(new Date(y, m - 1, i + 1))),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  // Remove weekend columns if needed
  const colsToShow = showWeekends ? 7 : 5
  const filteredCells: (string | null)[] = showWeekends
    ? cells
    : cells.filter((_, i) => i % 7 < 5)

  const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', ...(showWeekends ? ['Sam', 'Dim'] : [])]

  function filterEvent(ev: Event) {
    if (filter === 'done') return ev.done
    if (filter === 'undone') return !ev.done
    if (filter === 'high') return ev.priority_level === 'Élevé'
    if (filter === 'medium') return ev.priority_level === 'Moyen'
    return true
  }

  return (
    <div style={{ flex: 1 }}>
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colsToShow}, 1fr)`, gap: '4px', marginBottom: '4px' }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colsToShow}, 1fr)`, gap: '4px' }}>
        {filteredCells.map((day, i) => {
          if (!day) return <div key={i} style={{ minHeight: '80px' }} />
          const isToday = day === today
          const dayEvents = events.filter(ev => eventVisibleOn(ev, day) && filterEvent(ev))
          const d = localDate(day)
          return (
            <div
              key={day}
              onClick={() => onDateClick(day)}
              style={{
                minHeight: '80px', borderRadius: '9px', padding: '6px',
                background: isToday ? 'rgba(255,77,109,.05)' : 'rgba(255,255,255,.015)',
                border: isToday ? '1px solid rgba(255,77,109,.25)' : '1px solid rgba(255,255,255,.05)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                fontSize: '13px', fontWeight: 700,
                color: isToday ? '#FF4D6D' : 'rgba(255,255,255,.7)',
                marginBottom: '4px',
              }}>
                {d.getDate()}
              </div>
              {dayEvents.slice(0, 3).map(ev => (
                <div
                  key={ev.id}
                  onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                  style={{
                    borderLeft: `2px solid ${ev.color}`,
                    background: `${ev.color}18`,
                    borderRadius: '3px', padding: '2px 5px',
                    fontSize: '11px', color: '#e8e8f0',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    marginBottom: '2px', opacity: ev.done ? .5 : 1,
                  }}
                >
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', paddingLeft: '4px' }}>
                  +{dayEvents.length - 3} autre{dayEvents.length - 3 > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ScheduleClient({
  initialEvents, employees, branches, myEmployeeId, isAdmin,
}: {
  initialEvents: Event[]
  employees: Employee[]
  branches: Branch[]
  myEmployeeId: string | null
  isAdmin: boolean
}) {
  const {
    calMode, wkStart, dayView, monView, showWeekends, schedFilter,
    setCalMode, setWkStart, setDayView, setMonView, toggleWeekends, setSchedFilter, goToToday,
    setCalEvents, setBranches,
  } = useCalendarStore()

  const selectedEmployeeId = useSessionStore(s => s.selectedEmployeeId)

  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [modalOpen, setModalOpen] = useState(false)

  // Sync events + branches to global store (for AppShell déplacements + progress)
  useEffect(() => { setCalEvents(events) }, [events, setCalEvents])
  useEffect(() => { if (branches.length) setBranches(branches) }, [branches, setBranches])
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(todayStr().substring(0, 8) + '01')

  const today = todayStr()

  // Filter events by selected employee (admin sidebar) or own employee id
  const viewEmpId = isAdmin ? (selectedEmployeeId ?? null) : myEmployeeId
  const filteredEvents = viewEmpId
    ? events.filter(ev => ev.employee_id === viewEmpId)
    : events

  // Schedule subtitle: show which employee is being viewed
  const viewEmployee = viewEmpId ? employees.find(e => e.id === viewEmpId) : null
  const scheduleTitle = viewEmployee ? `Horaire – ${viewEmployee.name}` : 'Horaire'

  // Label for current view
  const calLabel = (() => {
    if (calMode === 'day') {
      const d = localDate(dayView)
      return `${shortDay(dayView)} ${d.getDate()} ${shortMonth(dayView)} ${d.getFullYear()}`
    }
    if (calMode === 'week') {
      const wkEnd = addDays(wkStart, showWeekends ? 6 : 4)
      const d = localDate(wkStart)
      const wk = isoWeek(d)
      return `Sem. ${wk} · ${d.getDate()} ${shortMonth(wkStart)} – ${localDate(wkEnd).getDate()} ${shortMonth(wkEnd)} ${d.getFullYear()}`
    }
    // month
    return `${fullMonth(monView)} ${localDate(monView).getFullYear()}`
  })()

  function navCal(dir: -1 | 1) {
    if (calMode === 'day') {
      setDayView(addDays(dayView, dir))
    } else if (calMode === 'week') {
      setWkStart(addDays(wkStart, dir * 7))
    } else {
      const d = localDate(monView)
      d.setMonth(d.getMonth() + dir)
      setMonView(dateStr(d).substring(0, 8) + '01')
    }
  }

  function openModal(ev: Event | null) {
    setEditEvent(ev)
    setModalOpen(true)
  }

  function handleDateClick(_date: string) {
    setEditEvent(null)
    setModalOpen(true)
  }

  function onSaved(ev: Event) {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === ev.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = ev; return n }
      return [...prev, ev]
    })
  }

  function onDeleted(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
    background: active ? 'rgba(255,77,109,.18)' : 'transparent',
    color: active ? '#FF4D6D' : 'rgba(255,255,255,.4)',
    borderRight: '1px solid rgba(255,255,255,.07)',
  })

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Planning</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '22px', fontWeight: 800, color: '#e8e8f0' }}>{scheduleTitle}</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mode switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,.07)', overflow: 'hidden' }}>
            <button onClick={() => setCalMode('day')} style={btnStyle(calMode === 'day')}>Jour</button>
            <button onClick={() => setCalMode('week')} style={btnStyle(calMode === 'week')}>Semaine</button>
            <button onClick={() => setCalMode('month')} style={{ ...btnStyle(calMode === 'month'), borderRight: 'none' }}>Mois</button>
          </div>

          {/* Filter */}
          <select
            value={schedFilter}
            onChange={e => setSchedFilter(e.target.value as 'all' | 'undone' | 'done' | 'high' | 'medium')}
            style={{ padding: '8px 11px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: '#1a1a2e', color: '#e8e8f0', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <option value="all">Tous</option>
            <option value="undone">Non-complétés</option>
            <option value="done">Complétés</option>
            <option value="high">Priorité élevée</option>
            <option value="medium">Priorité normale</option>
          </select>

          {/* Weekend toggle */}
          <button
            onClick={toggleWeekends}
            style={{
              padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', letterSpacing: '.04em',
              border: '1px solid rgba(255,255,255,.1)',
              background: showWeekends ? 'rgba(255,77,109,.13)' : 'rgba(255,255,255,.04)',
              color: showWeekends ? '#FF4D6D' : 'rgba(255,255,255,.4)',
            }}
          >
            S / D
          </button>

          {/* Navigation */}
          <button onClick={() => navCal(-1)} style={{ width: '34px', height: '34px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setPickerOpen(p => !p)}
              style={{ padding: '7px 16px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#e8e8f0', fontSize: '13px', fontWeight: 600, cursor: 'pointer', minWidth: '200px', textAlign: 'center' }}
            >
              {calLabel}
            </button>
            {pickerOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '14px', padding: '16px', boxShadow: '0 12px 40px rgba(0,0,0,.5)', width: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <button onClick={() => { const d = localDate(pickerMonth); d.setMonth(d.getMonth() - 1); setPickerMonth(dateStr(d).substring(0, 8) + '01') }} style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: '16px' }}>‹</button>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8f0' }}>{fullMonth(pickerMonth)} {localDate(pickerMonth).getFullYear()}</span>
                  <button onClick={() => { const d = localDate(pickerMonth); d.setMonth(d.getMonth() + 1); setPickerMonth(dateStr(d).substring(0, 8) + '01') }} style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: '16px' }}>›</button>
                </div>
                {/* DOW labels */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                  {['L','M','M','J','V','S','D'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,.3)', fontWeight: 700 }}>{d}</div>)}
                </div>
                {/* Days */}
                {(() => {
                  const [py, pm] = pickerMonth.split('-').map(Number)
                  const first = new Date(py, pm - 1, 1)
                  const offset = (first.getDay() + 6) % 7
                  const dim = new Date(py, pm, 0).getDate()
                  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
                  while (cells.length % 7 !== 0) cells.push(null)
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                      {cells.map((day, i) => {
                        if (!day) return <div key={i} />
                        const ds = `${py}-${String(pm).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const isToday = ds === today
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (calMode === 'day') setDayView(ds)
                              else if (calMode === 'week') setWkStart(getMondayOf(ds))
                              else setMonView(pickerMonth)
                              setPickerOpen(false)
                            }}
                            style={{
                              width: '100%', aspectRatio: '1', borderRadius: '6px', border: 'none',
                              background: isToday ? 'rgba(255,77,109,.25)' : 'transparent',
                              color: isToday ? '#FF4D6D' : 'rgba(255,255,255,.6)',
                              fontSize: '12px', fontWeight: isToday ? 700 : 400, cursor: 'pointer',
                            }}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
                <button
                  onClick={() => { goToToday(); setPickerOpen(false) }}
                  style={{ width: '100%', marginTop: '10px', padding: '7px', borderRadius: '8px', border: '1px solid rgba(255,77,109,.3)', background: 'transparent', color: '#FF4D6D', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Aujourd'hui
                </button>
              </div>
            )}
          </div>
          <button onClick={() => navCal(1)} style={{ width: '34px', height: '34px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>

          {/* New event button */}
          <button
            onClick={() => openModal(null)}
            style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            + Événement
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, overflow: calMode === 'week' ? 'hidden' : 'auto', minHeight: 0 }}>
        {calMode === 'week' && (
          <WeekView
            wkStart={wkStart} showWeekends={showWeekends} filter={schedFilter}
            events={filteredEvents} branches={branches}
            onEventClick={openModal} onDateClick={handleDateClick}
          />
        )}
        {calMode === 'day' && (
          <DayView
            day={dayView} events={filteredEvents} filter={schedFilter} onEventClick={openModal}
          />
        )}
        {calMode === 'month' && (
          <MonthView
            monView={monView} showWeekends={showWeekends} filter={schedFilter}
            events={filteredEvents} onEventClick={openModal} onDateClick={handleDateClick}
          />
        )}
      </div>

      {/* Modal */}
      <EventModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        event={editEvent} employees={employees} branches={branches}
        myEmployeeId={viewEmpId ?? myEmployeeId} isAdmin={isAdmin}
        onSaved={onSaved} onDeleted={onDeleted}
      />
    </div>
  )
}
