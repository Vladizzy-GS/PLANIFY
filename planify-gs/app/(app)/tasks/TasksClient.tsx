'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/stores/useSessionStore'
import { useCalendarStore } from '@/stores/useCalendarStore'
import { eventVisibleOn, todayStr, localDate, getMondayOf, addDays, dateStr, getMonthStart } from '@/lib/utils/dates'
import type { Event, Priority, Employee, Branch, Alert } from '@/types/database'

const DAYS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
const DAYS_SHORT = ['Lu','Ma','Me','Je','Ve','Sa','Di']
const MONTHS_FR = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']
const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const TASK_COLORS = ['#FF4D6D','#F77F00','#FCBF49','#4CC9F0','#7B2FBE','#06D6A0','#3A86FF','#FB5607','#8338EC','#06A77D']

// ─── Week Picker Popup ────────────────────────────────────────────────────────

function WeekPickerPopup({ anchorRef, currentWkStart, today, onSelect, onClose }: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  currentWkStart: string
  today: string
  onSelect: (monday: string) => void
  onClose: () => void
}) {
  const [monthStart, setMonthStart] = useState(() => getMonthStart(currentWkStart))
  const [hoverWk, setHoverWk] = useState<string | null>(null)
  const popRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorRef, onClose])

  // Build month grid (Mon–Sun rows)
  const monthDate = localDate(monthStart)
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()

  // First Monday on or before the 1st of the month
  const firstDay = new Date(year, month, 1)
  const firstMonday = getMondayOf(dateStr(firstDay))

  // Generate up to 6 week rows
  const weeks: string[] = []
  let cur = firstMonday
  for (let i = 0; i < 6; i++) {
    weeks.push(cur)
    const next = addDays(cur, 7)
    // Stop if the next week starts after the last day of the month
    const nextDate = localDate(next)
    if (nextDate.getMonth() !== month && nextDate > new Date(year, month + 1, 0)) break
    if (nextDate.getMonth() > month && nextDate.getFullYear() >= year) {
      // include if the week overlaps the month at all
      const sunDate = localDate(addDays(cur, 6))
      if (sunDate.getMonth() < month) break
    }
    cur = next
  }

  function prevMonth() {
    const d = localDate(monthStart)
    d.setMonth(d.getMonth() - 1)
    setMonthStart(getMonthStart(dateStr(d)))
  }
  function nextMonth() {
    const d = localDate(monthStart)
    d.setMonth(d.getMonth() + 1)
    setMonthStart(getMonthStart(dateStr(d)))
  }

  // Position the popup below the anchor
  const anchorRect = anchorRef.current?.getBoundingClientRect()
  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect ? anchorRect.bottom + 6 : 60,
    left: anchorRect ? anchorRect.left : 0,
    zIndex: 2000,
    background: '#13131f',
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: '14px',
    padding: '14px',
    boxShadow: '0 12px 40px rgba(0,0,0,.6)',
    minWidth: '236px',
  }

  return (
    <div ref={popRef} style={style}>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}>‹</button>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8f0' }}>
          {MONTHS_FULL[month]} {year}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.3)', textAlign: 'center', letterSpacing: '.04em' }}>{d}</div>
        ))}
      </div>

      {/* Week rows */}
      <div style={{ display: 'grid', gap: '2px' }}>
        {weeks.map(wkMon => {
          const days = Array.from({ length: 7 }, (_, i) => addDays(wkMon, i))
          const isSelected = wkMon === currentWkStart
          const isHovered = wkMon === hoverWk
          const rowBg = isSelected ? 'rgba(76,201,240,.18)' : isHovered ? 'rgba(255,255,255,.07)' : 'transparent'
          const rowBorder = isSelected ? '1px solid rgba(76,201,240,.35)' : '1px solid transparent'

          return (
            <div
              key={wkMon}
              onMouseEnter={() => setHoverWk(wkMon)}
              onMouseLeave={() => setHoverWk(null)}
              onClick={() => { onSelect(wkMon); onClose() }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', borderRadius: '8px', background: rowBg, border: rowBorder, cursor: 'pointer', padding: '2px' }}
            >
              {days.map(dayStr => {
                const d = localDate(dayStr)
                const inMonth = d.getMonth() === month
                const isToday = dayStr === today
                return (
                  <div key={dayStr} style={{
                    height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: isToday ? 800 : 500,
                    color: isToday ? '#4CC9F0' : inMonth ? '#e8e8f0' : 'rgba(255,255,255,.2)',
                    borderRadius: '6px',
                    background: isToday ? 'rgba(76,201,240,.12)' : 'transparent',
                  }}>
                    {d.getDate()}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* "Cette semaine" shortcut */}
      <button
        onClick={() => { onSelect(getMondayOf(today)); onClose() }}
        style={{ marginTop: '10px', width: '100%', padding: '7px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '8px', color: 'rgba(255,255,255,.6)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
      >
        Cette semaine
      </button>
    </div>
  )
}

// ─── Tache Creation Modal ─────────────────────────────────────────────────────

function TacheModal({ open, onClose, employees, branches, myEmployeeId, selectedEmployeeId, isAdmin, onSaved }: {
  open: boolean
  onClose: () => void
  employees: Employee[]
  branches: Branch[]
  myEmployeeId: string | null
  selectedEmployeeId: string | null
  isAdmin: boolean
  onSaved: (ev: Event) => void
}) {
  const supabase = createClient()
  const defaultEmpId = (isAdmin && selectedEmployeeId) ? selectedEmployeeId : (myEmployeeId ?? '')
  const [form, setForm] = useState({
    title: '', start_date: todayStr(), end_date: todayStr(),
    all_day: true, start_hour: 9, end_hour: 17,
    color: '#FF4D6D', priority_level: 'Moyen' as 'Faible' | 'Moyen' | 'Élevé',
    branch_ids: [] as string[],
  })
  const [empId, setEmpId] = useState<string>(defaultEmpId)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open) {
      setForm({
        title: '', start_date: todayStr(), end_date: todayStr(),
        all_day: true, start_hour: 9, end_hour: 17,
        color: '#FF4D6D', priority_level: 'Moyen', branch_ids: [],
      })
      setEmpId((isAdmin && selectedEmployeeId) ? selectedEmployeeId : (myEmployeeId ?? ''))
      setErr('')
    }
  }, [open, myEmployeeId, selectedEmployeeId, isAdmin])

  function toggleBranch(id: string) {
    setForm(f => ({
      ...f,
      branch_ids: f.branch_ids.includes(id)
        ? f.branch_ids.filter(x => x !== id)
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
      repeat_rule: 'Aucune' as const,
      repeat_end_date: null,
      branch_ids: form.branch_ids,
      done: false,
    }
    const { data, error } = await supabase.from('events').insert(payload).select().single()
    if (error) { setErr(error.message); setSaving(false); return }
    onSaved(data as Event)
    setSaving(false)
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
      <div onClick={e => e.stopPropagation()} style={{ background: '#13131f', border: '1px solid rgba(255,255,255,.1)', borderRadius: '18px', padding: '28px', width: '490px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 800, color: '#e8e8f0' }}>Nouvelle tâche</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={lbl}>Titre *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} placeholder="Ex: Vérification équipements" />
          </div>

          {isAdmin && (
            <div>
              <label style={lbl}>Employé *</label>
              <select value={empId} onChange={e => setEmpId(e.target.value)} style={inp}>
                <option value="">-- Sélectionner --</option>
                {employees.map(em => <option key={em.id} value={em.id}>{em.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>Date début *</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Date fin</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={inp} />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.all_day} onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: '#FF4D6D' }} />
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,.6)' }}>Toute la journée</span>
          </label>

          {!form.all_day && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={lbl}>Heure début</label>
                <select value={form.start_hour} onChange={e => setForm(f => ({ ...f, start_hour: +e.target.value }))} style={inp}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}h00</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Heure fin</label>
                <select value={form.end_hour} onChange={e => setForm(f => ({ ...f, end_hour: +e.target.value }))} style={inp}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}h00</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <label style={lbl}>Priorité</label>
            <select value={form.priority_level} onChange={e => setForm(f => ({ ...f, priority_level: e.target.value as 'Faible' | 'Moyen' | 'Élevé' }))} style={inp}>
              <option value="Faible">Faible</option>
              <option value="Moyen">Moyen</option>
              <option value="Élevé">Élevé</option>
            </select>
          </div>

          <div>
            <label style={lbl}>Couleur</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TASK_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: '28px', height: '28px', borderRadius: '8px', background: c, border: form.color === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

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

          {err && <div style={{ fontSize: '13px', color: '#FF4D6D', textAlign: 'center' }}>{err}</div>}

          <button
            onClick={handleSave} disabled={saving}
            style={{ padding: '11px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? .7 : 1 }}
          >
            {saving ? 'Création…' : 'Créer la tâche'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────

function priorityColor(level: string) {
  if (level === 'Élevé') return '#FF4D6D'
  if (level === 'Faible') return '#4CC9F0'
  return '#FCBF49'
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    'À faire': '#4CC9F0', 'En cours': '#F77F00', 'En révision': '#7B2FBE',
    'Terminé': '#06D6A0', 'Bloqué': '#FF4D6D',
  }
  return map[status] ?? '#888'
}

function EventCard({ ev, overdue, onToggle }: {
  ev: Event
  overdue?: boolean
  onToggle: (ev: Event) => void
}) {
  const supabase = createClient()
  const [done, setDone] = useState(ev.done)
  const pColor = priorityColor(ev.priority_level)

  async function toggle() {
    const newDone = !done
    setDone(newDone)
    await supabase.from('events').update({ done: newDone }).eq('id', ev.id)
    onToggle({ ...ev, done: newDone })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px',
      background: 'rgba(255,255,255,.03)', borderRadius: '10px',
      border: `1px solid rgba(255,255,255,.07)`, borderLeft: `3px solid ${ev.color}`,
      opacity: done ? .5 : 1,
    }}>
      <button
        onClick={toggle}
        style={{
          width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, marginTop: '2px',
          border: done ? 'none' : '2px solid rgba(255,255,255,.25)',
          background: done ? '#06D6A0' : 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
          {overdue && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#FF4D6D', background: 'rgba(255,77,109,.12)', padding: '1px 6px', borderRadius: '6px' }}>
              {localDate(ev.end_date).getDate()} {MONTHS_FR[localDate(ev.end_date).getMonth()]}
            </span>
          )}
          <span style={{ fontSize: '10px', fontWeight: 700, color: pColor, background: `${pColor}15`, padding: '1px 6px', borderRadius: '6px' }}>
            {ev.priority_level}
          </span>
        </div>
      </div>
    </div>
  )
}

function PriorityCard({ p }: { p: Priority }) {
  const sc = statusColor(p.status)
  return (
    <div style={{
      padding: '10px 12px', background: 'rgba(255,255,255,.03)',
      borderRadius: '10px', border: '1px solid rgba(255,255,255,.07)',
      borderLeft: `3px solid ${p.color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.title}
        </span>
        <span style={{ fontSize: '10px', fontWeight: 700, color: sc, background: `${sc}18`, padding: '2px 8px', borderRadius: '8px', flexShrink: 0 }}>
          {p.status}
        </span>
      </div>
      {p.due_date && (
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', marginTop: '4px' }}>
          Échéance : {localDate(p.due_date).getDate()} {MONTHS_FR[localDate(p.due_date).getMonth()]} {localDate(p.due_date).getFullYear()}
        </div>
      )}
    </div>
  )
}

function Widget({ icon, title, badge, color, children }: {
  icon: string; title: string; badge?: number | null; color: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#13131f', borderRadius: '14px', border: '1px solid rgba(255,255,255,.08)',
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: `linear-gradient(to bottom, ${color}, ${color}66)` }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 14px 12px 20px', borderBottom: '1px solid rgba(255,255,255,.07)',
      }}>
        <span style={{ fontSize: '13px', color }}>{icon}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.09em', flex: 1 }}>
          {title}
        </span>
        {badge !== null && badge !== undefined && (
          <span style={{ background: `${color}18`, color, borderRadius: '20px', padding: '1px 9px', fontSize: '12px', fontWeight: 700, border: `1px solid ${color}30` }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding: '14px 16px 14px 20px' }}>
        {children}
      </div>
    </div>
  )
}

export default function TasksClient({
  initialEvents, initialPriorities, employees, branches, initialTaskAlerts: _initialTaskAlerts,
}: {
  initialEvents: Event[]
  initialPriorities: Priority[]
  employees: Employee[]
  branches: Branch[]
  initialTaskAlerts: Alert[]
}) {
  const [events, setEvents] = useState(initialEvents)
  const [tacheOpen, setTacheOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerAnchorRef = useRef<HTMLDivElement>(null)
  const today = todayStr()
  const todayDate = localDate(today)

  // ─── Employee filtering ───────────────────────────────────────────────────────
  const selectedEmployeeId = useSessionStore(s => s.selectedEmployeeId)
  const myEmployeeId = useSessionStore(s => s.myEmployeeId)
  const isAdmin = useSessionStore(s => s.isAdmin)
  const viewEmpId = isAdmin ? (selectedEmployeeId || null) : myEmployeeId
  const viewEvents = viewEmpId ? events.filter(ev => ev.employee_id === viewEmpId) : events
  const viewPriorities = viewEmpId
    ? initialPriorities.filter(p => p.employee_id === viewEmpId)
    : initialPriorities

  // ─── Week navigation ──────────────────────────────────────────────────────────
  const calWkStart = useCalendarStore(s => s.wkStart)
  const setWkStart = useCalendarStore(s => s.setWkStart)
  const [wkStart, setLocalWkStart] = useState(() => getMondayOf(today))

  // Sync from calendar store on mount (so Horaire week carries over)
  useEffect(() => {
    if (calWkStart) setLocalWkStart(calWkStart)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const wkEnd = addDays(wkStart, 6)
  const wkStartDate = localDate(wkStart)
  const wkEndDate = localDate(wkEnd)
  const isCurrentWeek = wkStart === getMondayOf(today)

  const navigateWeek = useCallback((dir: -1 | 1) => {
    const next = addDays(wkStart, dir * 7)
    setLocalWkStart(next)
    setWkStart(next) // keep Horaire in sync
  }, [wkStart, setWkStart])

  function handleHoraireClick() {
    setWkStart(wkStart) // ensure calendar opens to this week
  }

  // ─── Classify events by week ──────────────────────────────────────────────────
  const overdue = viewEvents.filter(ev => {
    const end = localDate(ev.end_date)
    return end < wkStartDate && !ev.done
  }).sort((a, b) => b.end_date.localeCompare(a.end_date))

  const todayEvts = viewEvents.filter(ev => eventVisibleOn(ev, today))

  // Events within the selected week
  const weekEvts = viewEvents.filter(ev => {
    const s = localDate(ev.start_date)
    const e = localDate(ev.end_date)
    return s <= wkEndDate && e >= wkStartDate
  })

  const upcoming = viewEvents.filter(ev => {
    const s = localDate(ev.start_date)
    return s > wkEndDate && !ev.done
  }).sort((a, b) => a.start_date.localeCompare(b.start_date))

  // Group upcoming by date (max 5 days)
  const upGroups: Record<string, Event[]> = {}
  upcoming.forEach(ev => {
    if (!upGroups[ev.start_date]) upGroups[ev.start_date] = []
    upGroups[ev.start_date].push(ev)
  })
  const upDates = Object.keys(upGroups).sort().slice(0, 5)

  const activePriorities = viewPriorities.filter(p => p.status !== 'Terminé')

  function handleToggle(updated: Event) {
    setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev))
  }

  const empty = (msg: string) => (
    <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,.25)', fontSize: '13px' }}>{msg}</div>
  )

  // ─── Week label helpers ───────────────────────────────────────────────────────
  function fmtDay(d: Date) {
    return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
  }
  const weekLabel = `${fmtDay(wkStartDate)} – ${fmtDay(wkEndDate)}`

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.09em', textTransform: 'uppercase', marginBottom: '4px' }}>Tableau de bord</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '24px', fontWeight: 800, color: '#e8e8f0' }}>Tâches</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Week range navigator */}
          <div ref={pickerAnchorRef} style={{ display: 'flex', alignItems: 'center', gap: '0', borderRadius: '10px', border: `1px solid ${pickerOpen ? 'rgba(76,201,240,.4)' : 'rgba(255,255,255,.1)'}`, background: '#13131f', overflow: 'hidden', position: 'relative' }}>
            <button
              onClick={() => navigateWeek(-1)}
              style={{ padding: '8px 11px', background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
            >
              ‹
            </button>
            <button
              onClick={() => setPickerOpen(v => !v)}
              style={{ padding: '6px 4px', background: 'none', border: 'none', fontSize: '12px', fontWeight: 700, color: isCurrentWeek ? '#4CC9F0' : '#e8e8f0', whiteSpace: 'nowrap', minWidth: '128px', textAlign: 'center', cursor: 'pointer' }}
            >
              {weekLabel}
            </button>
            <button
              onClick={() => navigateWeek(1)}
              style={{ padding: '8px 11px', background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
            >
              ›
            </button>
          </div>
          {pickerOpen && (
            <WeekPickerPopup
              anchorRef={pickerAnchorRef}
              currentWkStart={wkStart}
              today={today}
              onSelect={monday => { setLocalWkStart(monday); setWkStart(monday) }}
              onClose={() => setPickerOpen(false)}
            />
          )}
          <button
            onClick={() => setTacheOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '.02em' }}
          >
            + Tâche
          </button>
          <Link
            href="/schedule"
            onClick={handleHoraireClick}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', letterSpacing: '.02em' }}
          >
            Horaire
          </Link>
        </div>
      </div>

      {/* ── TODAY BOARD (full-width banner) ─────────────────────────────────── */}
      {(() => {
        const todo    = isCurrentWeek
          ? todayEvts.filter(ev => !ev.done && ev.priority_level !== 'Élevé')
          : weekEvts.filter(ev => !ev.done && ev.priority_level !== 'Élevé')
        const urgent  = isCurrentWeek
          ? todayEvts.filter(ev => !ev.done && ev.priority_level === 'Élevé')
          : weekEvts.filter(ev => !ev.done && ev.priority_level === 'Élevé')
        const done    = isCurrentWeek
          ? todayEvts.filter(ev => ev.done)
          : weekEvts.filter(ev => ev.done)
        const boardEvts = isCurrentWeek ? todayEvts : weekEvts
        const todayPct = boardEvts.length ? Math.round(done.length / boardEvts.length * 100) : 0

        const boardCol = (
          label: string,
          items: Event[],
          accent: string,
          icon: React.ReactNode,
          emptyMsg: string,
        ) => (
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '10px', paddingBottom: '10px',
              borderBottom: `2px solid ${accent}28`,
            }}>
              {icon}
              <span style={{ fontSize: '11px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '.1em', flex: 1 }}>
                {label}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: accent, background: `${accent}18`, padding: '1px 8px', borderRadius: '8px', border: `1px solid ${accent}28` }}>
                {items.length}
              </span>
            </div>
            {/* Cards */}
            <div style={{ display: 'grid', gap: '7px' }}>
              {items.length === 0
                ? <div style={{ padding: '20px 12px', textAlign: 'center', color: 'rgba(255,255,255,.18)', fontSize: '12px', border: '1px dashed rgba(255,255,255,.08)', borderRadius: '10px' }}>
                    {emptyMsg}
                  </div>
                : items.map(ev => <EventCard key={ev.id} ev={ev} onToggle={handleToggle} />)
              }
            </div>
          </div>
        )

        return (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              borderRadius: '20px',
              border: '1px solid rgba(76,201,240,.18)',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #0d0d1b 0%, #111120 50%, #0f0f1e 100%)',
              boxShadow: '0 0 0 1px rgba(76,201,240,.06) inset, 0 8px 40px rgba(0,0,0,.35)',
            }}>

              {/* Banner header row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '24px',
                padding: '18px 28px',
                borderBottom: '1px solid rgba(76,201,240,.1)',
                background: 'linear-gradient(90deg, rgba(76,201,240,.06) 0%, transparent 60%)',
              }}>
                {/* Icon + date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '14px',
                    background: 'rgba(76,201,240,.1)', border: '1px solid rgba(76,201,240,.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4CC9F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#4CC9F0', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: '3px' }}>
                      {isCurrentWeek ? 'Tableau du jour' : 'Semaine'}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#e8e8f0' }}>
                      {isCurrentWeek
                        ? <>{DAYS_FR[todayDate.getDay()]}{' '}<span style={{ color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>{todayDate.getDate()} {MONTHS_FR[todayDate.getMonth()]}</span></>
                        : <span style={{ color: 'rgba(255,255,255,.75)', fontWeight: 500 }}>{weekLabel}</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,.08)', flexShrink: 0 }} />

                {/* Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#e8e8f0', lineHeight: 1 }}>{boardEvts.length}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', fontWeight: 600, marginTop: '2px', letterSpacing: '.06em' }}>TOTAL</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#FF4D6D', lineHeight: 1 }}>{urgent.length}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,77,109,.45)', fontWeight: 600, marginTop: '2px', letterSpacing: '.06em' }}>URGENT</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#06D6A0', lineHeight: 1 }}>{done.length}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(6,214,160,.45)', fontWeight: 600, marginTop: '2px', letterSpacing: '.06em' }}>TERMINÉ</div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,.08)', flexShrink: 0 }} />

                {/* Progress bar */}
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', fontWeight: 600 }}>Avancement</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: todayPct === 100 ? '#06D6A0' : '#4CC9F0' }}>{todayPct}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${todayPct}%`, height: '100%', borderRadius: '3px',
                      background: todayPct === 100
                        ? 'linear-gradient(90deg, #06D6A0, #4CC9F0)'
                        : 'linear-gradient(90deg, #4CC9F0, #7B2FBE)',
                      transition: 'width .5s ease',
                    }} />
                  </div>
                </div>
              </div>

              {/* Three kanban columns */}
              <div style={{ display: 'flex', gap: '0', padding: '20px 28px', minHeight: '120px' }}>
                {boardCol(
                  'À faire', todo, '#4CC9F0',
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4CC9F0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
                  'Tout est fait !',
                )}
                <div style={{ width: '1px', background: 'rgba(255,255,255,.06)', margin: '0 20px', flexShrink: 0 }} />
                {boardCol(
                  'Urgent', urgent, '#FF4D6D',
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF4D6D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
                  'Aucune urgence',
                )}
                <div style={{ width: '1px', background: 'rgba(255,255,255,.06)', margin: '0 20px', flexShrink: 0 }} />
                {boardCol(
                  'Terminé', done, '#06D6A0',
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#06D6A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
                  'Rien de terminé',
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Left column */}
        <div style={{ display: 'grid', gap: '14px', alignContent: 'start' }}>
          <Widget icon="⚠" title="En retard" badge={overdue.length} color="#FF4D6D">
            {overdue.length === 0
              ? empty('✓ Aucun retard')
              : <div style={{ display: 'grid', gap: '8px' }}>
                  {overdue.map(ev => <EventCard key={ev.id} ev={ev} overdue onToggle={handleToggle} />)}
                </div>
            }
          </Widget>
          <Widget icon="◈" title="Priorités actives" badge={activePriorities.length} color="#7B2FBE">
            {activePriorities.length === 0
              ? empty('Aucune priorité active')
              : <div style={{ display: 'grid', gap: '10px' }}>
                  {activePriorities.map(p => <PriorityCard key={p.id} p={p} />)}
                </div>
            }
          </Widget>
        </div>

        {/* Right column */}
        <div style={{ display: 'grid', gap: '14px', alignContent: 'start' }}>
          {/* Cette semaine — grouped by day, shown when NOT the current week OR always */}
          {(() => {
            const wkGroups: Record<string, Event[]> = {}
            weekEvts.forEach(ev => {
              const key = ev.start_date
              if (!wkGroups[key]) wkGroups[key] = []
              wkGroups[key].push(ev)
            })
            const wkDates = Object.keys(wkGroups).sort()
            return (
              <Widget icon="◫" title={isCurrentWeek ? 'Cette semaine' : `Semaine du ${fmtDay(wkStartDate)}`} badge={weekEvts.length} color="#4CC9F0">
                {weekEvts.length === 0
                  ? empty('Aucune tâche cette semaine')
                  : <div>
                      {wkDates.map(dk => {
                        const d = localDate(dk)
                        return (
                          <div key={dk} style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '7px' }}>
                              {DAYS_FR[d.getDay()]} {d.getDate()} {MONTHS_FR[d.getMonth()]}
                            </div>
                            <div style={{ display: 'grid', gap: '6px' }}>
                              {wkGroups[dk].map(ev => <EventCard key={ev.id} ev={ev} onToggle={handleToggle} />)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                }
              </Widget>
            )
          })()}
          <Widget icon="▷" title="À venir" badge={upcoming.length} color="#FFB703">
            {upcoming.length === 0
              ? empty('Aucune tâche à venir')
              : <div>
                  {upDates.map(dk => {
                    const d = localDate(dk)
                    return (
                      <div key={dk} style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '7px' }}>
                          {DAYS_FR[d.getDay()]} {d.getDate()} {MONTHS_FR[d.getMonth()]}
                        </div>
                        <div style={{ display: 'grid', gap: '6px' }}>
                          {upGroups[dk].map(ev => <EventCard key={ev.id} ev={ev} onToggle={handleToggle} />)}
                        </div>
                      </div>
                    )
                  })}
                </div>
            }
          </Widget>
        </div>
      </div>

      <TacheModal
        open={tacheOpen}
        onClose={() => setTacheOpen(false)}
        employees={employees}
        branches={branches}
        myEmployeeId={myEmployeeId}
        selectedEmployeeId={selectedEmployeeId}
        isAdmin={isAdmin}
        onSaved={ev => {
          setEvents(prev => [...prev, ev])
          setTacheOpen(false)
        }}
      />
    </div>
  )
}
