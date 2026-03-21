'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { localDate } from '@/lib/utils/dates'
import type { Alert, Event, Priority } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(t: string) {
  if (t === 'warn' || t === 'urgent') return { color: '#FF4D6D', bg: 'rgba(255,77,109,.12)', label: 'URGENT', icon: '🚨' }
  if (t === 'task-assigned') return { color: '#4CC9F0', bg: 'rgba(76,201,240,.1)', label: 'TÂCHE', icon: '📋' }
  return { color: '#A855F7', bg: 'rgba(168,85,247,.1)', label: 'INFORMATION', icon: 'ℹ️' }
}

function categoryMeta(cat: string) {
  if (cat === 'Horaire')  return { color: '#06D6A0', label: 'Horaire',  icon: '📅' }
  if (cat === 'Tache')    return { color: '#F77F00', label: 'Tâche',    icon: '☑' }
  if (cat === 'Priorité') return { color: '#4CC9F0', label: 'Priorité', icon: '⚡' }
  return null
}

function statusColor(s: string) {
  if (s === 'En cours')    return '#06D6A0'
  if (s === 'En révision') return '#FFB703'
  if (s === 'Bloqué')      return '#FF4D6D'
  return 'rgba(255,255,255,.35)'
}

function fmtDate(d: string) {
  const dt = localDate(d)
  return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`
}

// ─── Alert mini card ──────────────────────────────────────────────────────────

function AlertMiniCard({ alert, onMarkRead }: { alert: Alert; onMarkRead: (id: string) => void }) {
  const supabase = createClient()
  const tc = severityColor(alert.alert_type)
  const cat = categoryMeta(alert.category ?? '')

  async function markRead() {
    await supabase.from('alerts').update({ is_read: true }).eq('id', alert.id)
    onMarkRead(alert.id)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '12px 14px', borderRadius: '12px',
      background: '#13131f',
      border: `1px solid ${tc.color}25`,
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '9px',
        background: tc.bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '15px', flexShrink: 0,
      }}>{tc.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>{alert.title}</span>
          <span style={{ fontSize: '9px', fontWeight: 700, color: tc.color, background: tc.bg, padding: '1px 6px', borderRadius: '5px' }}>{tc.label}</span>
          {cat && (
            <span style={{ fontSize: '9px', fontWeight: 700, color: cat.color, background: `${cat.color}18`, padding: '1px 6px', borderRadius: '5px', border: `1px solid ${cat.color}30` }}>
              {cat.icon} {cat.label}
            </span>
          )}
        </div>
        {alert.message && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.45)', lineHeight: 1.4 }}>{alert.message}</div>}
        {alert.alert_date && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', marginTop: '3px' }}>{fmtDate(alert.alert_date)}</div>}
      </div>
      <button
        onClick={markRead}
        title="Marquer comme lu"
        style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >✓</button>
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function DashboardClient({ displayName, alerts: initialAlerts, upcomingEvents, activePriorities }: {
  displayName: string | null
  alerts: Alert[]
  upcomingEvents: Event[]
  activePriorities: Priority[]
}) {
  const [alerts, setAlerts] = useState(initialAlerts)

  function onMarkRead(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const urgent    = alerts.filter(a => a.alert_type === 'warn' || a.alert_type === 'urgent')
  const infoAlerts = alerts.filter(a => a.alert_type !== 'warn' && a.alert_type !== 'urgent')

  const byCategory = {
    Horaire:  alerts.filter(a => a.category === 'Horaire'),
    Tache:    alerts.filter(a => a.category === 'Tache'),
    Priorité: alerts.filter(a => a.category === 'Priorité'),
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const secTitle: React.CSSProperties = {
    fontFamily: 'var(--font-syne)', fontSize: '13px', fontWeight: 800,
    color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase',
    marginBottom: '10px',
  }
  const card: React.CSSProperties = {
    background: '#13131f', borderRadius: '14px',
    border: '1px solid rgba(255,255,255,.08)', padding: '18px',
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Tableau de bord</div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>
          {greeting}{displayName ? `, ${displayName}` : ''} 👋
        </h1>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Alertes non lues', value: alerts.length, color: '#FF4D6D', icon: '🔔' },
          { label: 'Urgentes',          value: urgent.length,  color: '#FF4D6D', icon: '🚨' },
          { label: 'Horaire',           value: byCategory.Horaire.length,  color: '#06D6A0', icon: '📅' },
          { label: 'Tâche',             value: byCategory.Tache.length,    color: '#F77F00', icon: '☑' },
          { label: 'Priorité',          value: byCategory.Priorité.length, color: '#4CC9F0', icon: '⚡' },
        ].map(stat => (
          <div key={stat.label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{stat.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: stat.value > 0 ? stat.color : 'rgba(255,255,255,.2)', fontFamily: 'var(--font-syne)' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* LEFT — Alerts */}
        <div>
          {/* Urgent alerts */}
          {urgent.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...secTitle, color: '#FF4D6D' }}>🚨 Alertes urgentes</div>
              <div style={{ background: 'rgba(255,77,109,.06)', border: '1px solid rgba(255,77,109,.25)', borderRadius: '14px', padding: '12px', display: 'grid', gap: '8px' }}>
                {urgent.map(a => <AlertMiniCard key={a.id} alert={a} onMarkRead={onMarkRead} />)}
              </div>
            </div>
          )}

          {/* Info alerts */}
          {infoAlerts.length > 0 && (
            <div>
              <div style={secTitle}>ℹ Informations</div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {infoAlerts.map(a => <AlertMiniCard key={a.id} alert={a} onMarkRead={onMarkRead} />)}
              </div>
            </div>
          )}

          {alerts.length === 0 && (
            <div style={{ ...card, textAlign: 'center', padding: '36px', color: 'rgba(255,255,255,.25)', fontSize: '14px' }}>
              ✓ Aucune alerte non lue
            </div>
          )}
        </div>

        {/* RIGHT — Upcoming events + priorities */}
        <div style={{ display: 'grid', gap: '20px', alignContent: 'start' }}>

          {/* Upcoming events */}
          <div>
            <div style={secTitle}>📅 Prochains événements</div>
            {upcomingEvents.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {upcomingEvents.map(ev => (
                  <div key={ev.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px' }}>
                    <div style={{ width: '4px', alignSelf: 'stretch', borderRadius: '2px', background: ev.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{ev.title}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)' }}>
                        {fmtDate(ev.start_date)}{ev.start_date !== ev.end_date ? ` → ${fmtDate(ev.end_date)}` : ''}
                        {!ev.all_day && ` · ${ev.start_hour}h`}
                      </div>
                    </div>
                    {ev.done && <span style={{ fontSize: '13px', color: '#06D6A0' }}>☑</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...card, textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,.25)', fontSize: '13px' }}>
                Aucun événement à venir
              </div>
            )}
          </div>

          {/* Active priorities */}
          <div>
            <div style={secTitle}>⚡ Priorités actives</div>
            {activePriorities.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {activePriorities.map(p => (
                  <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px' }}>
                    <div style={{ width: '4px', alignSelf: 'stretch', borderRadius: '2px', background: p.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: statusColor(p.status), background: `${statusColor(p.status)}18`, padding: '1px 6px', borderRadius: '5px' }}>{p.status}</span>
                        {p.due_date && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)' }}>{fmtDate(p.due_date)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...card, textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,.25)', fontSize: '13px' }}>
                Aucune priorité active
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
