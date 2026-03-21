'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { localDate } from '@/lib/utils/dates'
import type { Alert, Event, Priority } from '@/types/database'

// ─── Icon components ───────────────────────────────────────────────────────────

function IconBell() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}
function IconAlert() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IconZap() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isUrgent(t: string) { return t === 'warn' || t === 'urgent' }

function categoryLabel(cat: string) {
  if (cat === 'Horaire')  return { label: 'Horaire',  color: '#06D6A0' }
  if (cat === 'Tache')    return { label: 'Tâche',    color: '#F77F00' }
  if (cat === 'Priorité') return { label: 'Priorité', color: '#4CC9F0' }
  return null
}

function statusStyle(s: string): { color: string; bg: string } {
  if (s === 'En cours')    return { color: '#06D6A0', bg: 'rgba(6,214,160,.12)' }
  if (s === 'En révision') return { color: '#FFB703', bg: 'rgba(255,183,3,.12)' }
  if (s === 'Bloqué')      return { color: '#FF4D6D', bg: 'rgba(255,77,109,.12)' }
  return { color: 'var(--text-muted)', bg: 'var(--bg-hover)' }
}

const DAY_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MON_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function evDateLabel(d: string) {
  const dt = localDate(d)
  return { day: DAY_FR[dt.getDay()], num: dt.getDate(), mon: MON_FR[dt.getMonth()] }
}

function fmtShort(d: string) {
  const dt = localDate(d)
  return `${dt.getDate()} ${MON_FR[dt.getMonth()]}`
}

// ─── Alert row ─────────────────────────────────────────────────────────────────

function AlertRow({ alert, onMarkRead }: { alert: Alert; onMarkRead: (id: string) => void }) {
  const supabase = createClient()
  const urgent = isUrgent(alert.alert_type)
  const cat = categoryLabel(alert.category ?? '')
  const accentColor = urgent ? '#FF4D6D' : 'var(--color-purple)'

  async function markRead() {
    await supabase.from('alerts').update({ is_read: true }).eq('id', alert.id)
    onMarkRead(alert.id)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '12px 14px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: '10px',
      transition: 'border-color .15s',
    }}>
      {/* Icon */}
      <div style={{
        width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
        background: urgent ? 'rgba(255,77,109,.1)' : 'rgba(123,47,190,.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accentColor,
      }}>
        {urgent ? <IconAlert /> : <IconInfo />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '200px' }}>
            {alert.title}
          </span>
          {urgent && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#FF4D6D', background: 'rgba(255,77,109,.1)', padding: '1px 7px', borderRadius: '5px', letterSpacing: '.04em', flexShrink: 0 }}>
              URGENT
            </span>
          )}
          {cat && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: cat.color, background: `${cat.color}15`, padding: '1px 7px', borderRadius: '5px', border: `1px solid ${cat.color}30`, flexShrink: 0 }}>
              {cat.label}
            </span>
          )}
        </div>
        {alert.message && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '2px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {alert.message}
          </div>
        )}
        {alert.alert_date && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtShort(alert.alert_date)}</div>
        )}
      </div>

      {/* Mark read */}
      <button
        onClick={markRead}
        title="Marquer comme lu"
        style={{
          flexShrink: 0, width: '28px', height: '28px', borderRadius: '7px',
          border: '1px solid var(--border-normal)', background: 'transparent',
          color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#06D6A0'; e.currentTarget.style.color = '#06D6A0' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-normal)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <IconCheck />
      </button>
    </div>
  )
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, count, href }: { icon: React.ReactNode; label: string; count?: number; href?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-secondary)' }}>
        {icon}
        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>
        {count !== undefined && count > 0 && (
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-hover)', borderRadius: '10px', padding: '0 6px', lineHeight: '18px' }}>{count}</span>
        )}
      </div>
      {href && (
        <Link href={href} style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Voir tout →
        </Link>
      )}
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function Empty({ label }: { label: string }) {
  return (
    <div style={{
      padding: '20px', textAlign: 'center',
      border: '1px dashed var(--border-subtle)', borderRadius: '10px',
      color: 'var(--text-muted)', fontSize: '13px',
    }}>{label}</div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardClient({
  displayName,
  alerts: initialAlerts,
  upcomingEvents,
  activePriorities,
}: {
  displayName: string | null
  alerts: Alert[]
  upcomingEvents: Event[]
  activePriorities: Priority[]
}) {
  const [alerts, setAlerts] = useState(initialAlerts)

  function onMarkRead(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const urgent     = alerts.filter(a => isUrgent(a.alert_type))
  const infoAlerts = alerts.filter(a => !isUrgent(a.alert_type))

  // Current date label
  const now = new Date()
  const dateLabel = `${DAY_FR[now.getDay()]} ${now.getDate()} ${MON_FR[now.getMonth()]} ${now.getFullYear()}`
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1000px', animation: 'fadeIn .25s ease' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '5px' }}>
            Tableau de bord
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {greeting}{displayName ? `, ${displayName}` : ''}
          </h1>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{dateLabel}</div>
      </div>

      {/* ── Quick stats strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'Alertes non lues',  value: alerts.length,           color: alerts.length > 0 ? '#FF4D6D' : undefined,   icon: <IconBell /> },
          { label: 'Urgentes',          value: urgent.length,           color: urgent.length > 0 ? '#FF4D6D' : undefined,   icon: <IconAlert /> },
          { label: 'Événements',        value: upcomingEvents.length,   color: undefined,                                   icon: <IconCalendar /> },
          { label: 'Priorités actives', value: activePriorities.length, color: undefined,                                   icon: <IconZap /> },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px',
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ color: s.color ?? 'var(--text-muted)' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-syne)', color: s.color ?? 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

        {/* LEFT — Alerts */}
        <div style={{ display: 'grid', gap: '20px' }}>

          {/* Urgent */}
          {urgent.length > 0 && (
            <div>
              <SectionHeader icon={<IconAlert />} label="Urgentes" count={urgent.length} href="/alerts" />
              <div style={{
                background: 'rgba(255,77,109,.04)', border: '1px solid rgba(255,77,109,.18)',
                borderRadius: '12px', padding: '12px', display: 'grid', gap: '8px',
              }}>
                {urgent.map(a => <AlertRow key={a.id} alert={a} onMarkRead={onMarkRead} />)}
              </div>
            </div>
          )}

          {/* Info */}
          <div>
            <SectionHeader icon={<IconBell />} label="Notifications" count={infoAlerts.length} href="/alerts" />
            {infoAlerts.length > 0
              ? <div style={{ display: 'grid', gap: '8px' }}>
                  {infoAlerts.map(a => <AlertRow key={a.id} alert={a} onMarkRead={onMarkRead} />)}
                </div>
              : urgent.length === 0
                ? <div style={{ padding: '28px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Aucune alerte non lue
                  </div>
                : <Empty label="Aucune autre notification" />
            }
          </div>
        </div>

        {/* RIGHT — Schedule + Priorities */}
        <div style={{ display: 'grid', gap: '20px' }}>

          {/* Upcoming events */}
          <div>
            <SectionHeader icon={<IconCalendar />} label="Prochains événements" href="/schedule" />
            {upcomingEvents.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {upcomingEvents.map(ev => {
                  const d = evDateLabel(ev.start_date)
                  return (
                    <div key={ev.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 12px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                    }}>
                      {/* Date block */}
                      <div style={{
                        flexShrink: 0, width: '38px', textAlign: 'center',
                        borderRight: '1px solid var(--border-subtle)', paddingRight: '10px',
                      }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{d.day}</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-syne)', lineHeight: 1 }}>{d.num}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>{d.mon}</div>
                      </div>
                      {/* Color accent + info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <div style={{ width: '3px', height: '30px', borderRadius: '2px', background: ev.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{ev.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {ev.all_day ? 'Journée' : `${ev.start_hour}h – ${ev.end_hour}h`}
                            {ev.start_date !== ev.end_date ? ` · → ${fmtShort(ev.end_date)}` : ''}
                          </div>
                        </div>
                      </div>
                      {ev.done && (
                        <div style={{ flexShrink: 0, color: '#06D6A0' }}><IconCheck /></div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty label="Aucun événement à venir" />
            )}
          </div>

          {/* Active priorities */}
          <div>
            <SectionHeader icon={<IconZap />} label="Priorités" href="/priorities" />
            {activePriorities.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {activePriorities.map(p => {
                  const ss = statusStyle(p.status)
                  const overdue = p.due_date && p.due_date < new Date().toISOString().slice(0, 10)
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                      borderLeft: `3px solid ${p.color}`,
                      borderRadius: '10px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: '3px' }}>
                          {p.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: ss.color, background: ss.bg, padding: '1px 7px', borderRadius: '5px' }}>{p.status}</span>
                          {p.due_date && (
                            <span style={{ fontSize: '10px', color: overdue ? '#FF4D6D' : 'var(--text-muted)', fontWeight: overdue ? 700 : 400 }}>
                              {overdue ? '⚠ ' : ''}{fmtShort(p.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty label="Aucune priorité active" />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
