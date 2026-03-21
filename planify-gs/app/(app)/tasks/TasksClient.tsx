'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/stores/useSessionStore'
import { eventVisibleOn, todayStr, localDate } from '@/lib/utils/dates'
import type { Event, Priority, Employee, Branch, Alert } from '@/types/database'

const DAYS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
const MONTHS_FR = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']

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
  initialEvents, initialPriorities, employees: _employees, branches: _branches, initialTaskAlerts: _initialTaskAlerts,
}: {
  initialEvents: Event[]
  initialPriorities: Priority[]
  employees: Employee[]
  branches: Branch[]
  initialTaskAlerts: Alert[]
}) {
  const [events, setEvents] = useState(initialEvents)
  const today = todayStr()
  const todayDate = localDate(today)

  // ─── Employee filtering (mirrors ScheduleClient pattern) ─────────────────────
  const selectedEmployeeId = useSessionStore(s => s.selectedEmployeeId)
  const myEmployeeId = useSessionStore(s => s.myEmployeeId)
  const isAdmin = useSessionStore(s => s.isAdmin)
  const viewEmpId = isAdmin ? (selectedEmployeeId || null) : myEmployeeId
  const viewEvents = viewEmpId ? events.filter(ev => ev.employee_id === viewEmpId) : events
  const viewPriorities = viewEmpId
    ? initialPriorities.filter(p => p.employee_id === viewEmpId)
    : initialPriorities

  // Classify events
  const overdue = viewEvents.filter(ev => {
    const end = localDate(ev.end_date)
    return end < todayDate && !ev.done
  }).sort((a, b) => b.end_date.localeCompare(a.end_date))

  const todayEvts = viewEvents.filter(ev => eventVisibleOn(ev, today))

  const upcoming = viewEvents.filter(ev => {
    const s = localDate(ev.start_date)
    return s > todayDate && !ev.done
  }).sort((a, b) => a.start_date.localeCompare(b.start_date))

  // Group upcoming by date (max 5 days)
  const upGroups: Record<string, Event[]> = {}
  upcoming.forEach(ev => {
    if (!upGroups[ev.start_date]) upGroups[ev.start_date] = []
    upGroups[ev.start_date].push(ev)
  })
  const upDates = Object.keys(upGroups).sort().slice(0, 5)

  const activePriorities = viewPriorities.filter(p => p.status !== 'Terminé')

  const totalDone = viewEvents.filter(e => e.done).length
  const pct = viewEvents.length ? Math.round(totalDone / viewEvents.length * 100) : 0

  function handleToggle(updated: Event) {
    setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev))
  }

  const empty = (msg: string) => (
    <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,.25)', fontSize: '13px' }}>{msg}</div>
  )

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.09em', textTransform: 'uppercase', marginBottom: '4px' }}>Tableau de bord</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '24px', fontWeight: 800, color: '#e8e8f0' }}>Tâches</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 13px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.08)', background: '#13131f', fontSize: '13px' }}>
            <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#4CAF50', borderRadius: '2px' }} />
            </div>
            <span style={{ fontWeight: 700, color: '#e8e8f0', fontSize: '12px' }}>{totalDone}/{viewEvents.length}</span>
          </div>
          <Link
            href="/schedule"
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', letterSpacing: '.02em' }}
          >
            Horaire
          </Link>
        </div>
      </div>

      {/* ── TODAY BOARD (full-width banner) ─────────────────────────────────── */}
      {(() => {
        const todo    = todayEvts.filter(ev => !ev.done && ev.priority_level !== 'Élevé')
        const urgent  = todayEvts.filter(ev => !ev.done && ev.priority_level === 'Élevé')
        const done    = todayEvts.filter(ev => ev.done)
        const todayPct = todayEvts.length ? Math.round(done.length / todayEvts.length * 100) : 0

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
                      Tableau du jour
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#e8e8f0' }}>
                      {DAYS_FR[todayDate.getDay()]}{' '}
                      <span style={{ color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>
                        {todayDate.getDate()} {MONTHS_FR[todayDate.getMonth()]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,.08)', flexShrink: 0 }} />

                {/* Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#e8e8f0', lineHeight: 1 }}>{todayEvts.length}</div>
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
          <Widget icon="◫" title="À venir" badge={upcoming.length} color="#FFB703">
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
    </div>
  )
}
