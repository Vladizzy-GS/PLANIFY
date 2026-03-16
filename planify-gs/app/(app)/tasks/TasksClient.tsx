'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { eventVisibleOn, todayStr, localDate, shortDay, addDays } from '@/lib/utils/dates'
import type { Event, Priority } from '@/types/database'

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
  const pc = priorityColor(p.priority_level)
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
  initialEvents, initialPriorities,
}: {
  initialEvents: Event[]
  initialPriorities: Priority[]
}) {
  const [events, setEvents] = useState(initialEvents)
  const today = todayStr()
  const todayDate = localDate(today)

  // Classify events
  const overdue = events.filter(ev => {
    const end = localDate(ev.end_date)
    return end < todayDate && !ev.done
  }).sort((a, b) => b.end_date.localeCompare(a.end_date))

  const todayEvts = events.filter(ev => eventVisibleOn(ev, today))

  const upcoming = events.filter(ev => {
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

  const activePriorities = initialPriorities.filter(p => p.status !== 'Terminé')

  const totalDone = events.filter(e => e.done).length
  const pct = events.length ? Math.round(totalDone / events.length * 100) : 0

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
            <span style={{ fontWeight: 700, color: '#e8e8f0', fontSize: '12px' }}>{totalDone}/{events.length}</span>
          </div>
          <Link
            href="/schedule"
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', letterSpacing: '.02em' }}
          >
            Horaire
          </Link>
        </div>
      </div>

      {/* Today card (pinned, centered) */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <div style={{ width: '100%', maxWidth: '580px', background: '#13131f', border: '1px solid rgba(76,201,240,.3)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 20px rgba(76,201,240,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: '1px solid rgba(76,201,240,.15)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(76,201,240,.1)', border: '1px solid rgba(76,201,240,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CC9F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4CC9F0', textTransform: 'uppercase', letterSpacing: '.1em' }}>Aujourd'hui</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)', marginTop: '1px' }}>
                {DAYS_FR[todayDate.getDay()]} {todayDate.getDate()} {MONTHS_FR[todayDate.getMonth()]}
              </div>
            </div>
            <span style={{ background: 'rgba(76,201,240,.12)', color: '#4CC9F0', borderRadius: '20px', padding: '2px 12px', fontSize: '13px', fontWeight: 700, border: '1px solid rgba(76,201,240,.25)' }}>
              {todayEvts.length}
            </span>
          </div>
          <div style={{ padding: '14px 20px' }}>
            {todayEvts.length === 0
              ? <div style={{ textAlign: 'center', padding: '16px', color: 'rgba(255,255,255,.25)', fontSize: '13px' }}>Aucune tâche aujourd'hui</div>
              : <div style={{ display: 'grid', gap: '8px' }}>
                  {todayEvts.map(ev => <EventCard key={ev.id} ev={ev} onToggle={handleToggle} />)}
                </div>
            }
          </div>
        </div>
      </div>

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
