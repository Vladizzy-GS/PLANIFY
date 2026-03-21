'use client'

import type { Employee, Branch, Priority, Alert } from '@/types/database'

type EventRow = {
  id: string; employee_id: string; title: string
  start_date: string; end_date: string; done: boolean
  priority_level: string; all_day: boolean; color: string
}

const MONTHS_FR = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']
const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']

function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}
function fmtDay(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

function statusColor(status: string) {
  const m: Record<string,string> = { 'À faire':'#4CC9F0','En cours':'#F77F00','En révision':'#7B2FBE','Terminé':'#06D6A0','Bloqué':'#FF4D6D' }
  return m[status] ?? '#888'
}
function priorityColor(level: string) {
  if (level === 'Élevé') return '#FF4D6D'
  if (level === 'Faible') return '#4CC9F0'
  return '#FCBF49'
}
function alertTypeColor(t: string) {
  const m: Record<string,string> = { urgent:'#FF4D6D', warn:'#F77F00', info:'#4CC9F0', information:'#06D6A0', 'task-assigned':'#7B2FBE' }
  return m[t] ?? '#888'
}
function alertTypeLabel(t: string) {
  const m: Record<string,string> = { urgent:'URGENT', warn:'AVERT.', info:'INFO', information:'INFO', 'task-assigned':'TÂCHE' }
  return m[t] ?? t.toUpperCase()
}

function MiniBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,.08)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: color, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color, minWidth: '28px', textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

export default function AdminDashboardClient({
  employees, branches, suppliersCount, weekEvents, overdueEvents, priorities, unreadAlerts, today, wkStart, wkEnd,
}: {
  employees: Employee[]
  branches: Branch[]
  suppliersCount: number
  weekEvents: EventRow[]
  overdueEvents: EventRow[]
  priorities: Priority[]
  unreadAlerts: Alert[]
  today: string
  wkStart: string
  wkEnd: string
}) {
  // ── Global KPIs ────────────────────────────────────────────────────────────
  const activeEmps = employees.filter(e => e.is_active)
  const weekTotal = weekEvents.length
  const weekDone = weekEvents.filter(e => e.done).length
  const weekPct = weekTotal === 0 ? 0 : Math.round((weekDone / weekTotal) * 100)
  const activePriorities = priorities.filter(p => p.status !== 'Terminé')
  const urgentAlerts = unreadAlerts.filter(a => a.alert_type === 'urgent').length

  // ── Per-employee stats ─────────────────────────────────────────────────────
  const empStats = activeEmps.map(emp => {
    const myWeek = weekEvents.filter(e => e.employee_id === emp.id)
    const myDone = myWeek.filter(e => e.done).length
    const myOverdue = overdueEvents.filter(e => e.employee_id === emp.id).length
    const myPriorities = activePriorities.filter(p => p.employee_id === emp.id)
    const myAlerts = unreadAlerts.filter(a => a.employee_id === emp.id)
    const pct = myWeek.length === 0 ? 0 : Math.round((myDone / myWeek.length) * 100)
    const status = myOverdue > 2 ? 'danger' : myOverdue > 0 ? 'warn' : pct === 100 && myWeek.length > 0 ? 'perfect' : 'ok'
    return { emp, myWeek, myDone, myOverdue, myPriorities, myAlerts, pct, status }
  })

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.025)',
    border: '1px solid rgba(255,255,255,.07)',
    borderRadius: '14px',
  }
  const lbl: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.3)',
    letterSpacing: '.08em', textTransform: 'uppercase' as const,
  }

  const statusDot = (s: string) => {
    const c = s === 'danger' ? '#FF4D6D' : s === 'warn' ? '#FCBF49' : s === 'perfect' ? '#06D6A0' : '#4CC9F0'
    const label = s === 'danger' ? 'Attention' : s === 'warn' ? 'Retard' : s === 'perfect' ? 'Excellent' : 'Sur la voie'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
        <span style={{ fontSize: '10px', fontWeight: 700, color: c, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', color: '#e8e8f0', maxWidth: '1200px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Admin · Vue globale</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>Tableau de bord</h1>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)', fontWeight: 600 }}>
          Semaine du {fmtDate(wkStart)} au {fmtDate(wkEnd)}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'Employés actifs', value: activeEmps.length, sub: `${employees.length} total`, color: '#4CC9F0' },
          { label: 'Tâches semaine', value: `${weekDone}/${weekTotal}`, sub: 'complétées', color: '#06D6A0' },
          { label: 'Complétion', value: `${weekPct}%`, sub: 'cette semaine', color: weekPct >= 80 ? '#06D6A0' : weekPct >= 50 ? '#FCBF49' : '#FF4D6D' },
          { label: 'En retard', value: overdueEvents.length, sub: 'tâches', color: overdueEvents.length === 0 ? '#06D6A0' : '#FF4D6D' },
          { label: 'Priorités actives', value: activePriorities.length, sub: `${priorities.length} total`, color: '#F77F00' },
          { label: 'Alertes non lues', value: unreadAlerts.length, sub: urgentAlerts > 0 ? `${urgentAlerts} urgentes` : 'aucune urgence', color: urgentAlerts > 0 ? '#FF4D6D' : '#FCBF49' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '14px 16px' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-syne)', lineHeight: 1, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#e8e8f0', marginBottom: '2px' }}>{s.label}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Employee Performance ── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ ...lbl, marginBottom: '12px' }}>Performance des employés · Semaine en cours</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {empStats.map(({ emp, myWeek, myDone, myOverdue, myPriorities, myAlerts, pct, status }) => (
            <div key={emp.id} style={{ ...card, padding: '16px' }}>
              {/* Employee header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: emp.avatar_gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {emp.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)' }}>{emp.role_title || 'Employé'}</div>
                </div>
                {statusDot(status)}
              </div>

              {/* Week progress */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ ...lbl }}>Tâches semaine</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#e8e8f0' }}>{myDone}/{myWeek.length}</span>
                </div>
                <MiniBar value={myDone} total={myWeek.length} color={pct >= 80 ? '#06D6A0' : pct >= 40 ? '#FCBF49' : '#FF4D6D'} />
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                <div style={{ background: myOverdue > 0 ? 'rgba(255,77,109,.08)' : 'rgba(255,255,255,.03)', border: `1px solid ${myOverdue > 0 ? 'rgba(255,77,109,.2)' : 'rgba(255,255,255,.06)'}`, borderRadius: '8px', padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: myOverdue > 0 ? '#FF4D6D' : '#e8e8f0', fontFamily: 'var(--font-syne)' }}>{myOverdue}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.35)', fontWeight: 600, letterSpacing: '.04em', marginTop: '2px' }}>EN RETARD</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '8px', padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: myPriorities.length > 0 ? '#F77F00' : '#e8e8f0', fontFamily: 'var(--font-syne)' }}>{myPriorities.length}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.35)', fontWeight: 600, letterSpacing: '.04em', marginTop: '2px' }}>PRIORITÉS</div>
                </div>
                <div style={{ background: myAlerts.length > 0 ? 'rgba(247,127,0,.08)' : 'rgba(255,255,255,.03)', border: `1px solid ${myAlerts.length > 0 ? 'rgba(247,127,0,.2)' : 'rgba(255,255,255,.06)'}`, borderRadius: '8px', padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: myAlerts.length > 0 ? '#FCBF49' : '#e8e8f0', fontFamily: 'var(--font-syne)' }}>{myAlerts.length}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.35)', fontWeight: 600, letterSpacing: '.04em', marginTop: '2px' }}>ALERTES</div>
                </div>
              </div>

              {/* Active priority preview */}
              {myPriorities.length > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ ...lbl, marginBottom: '6px' }}>Priorité en cours</div>
                  {myPriorities.slice(0, 2).map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                      <div style={{ width: '3px', height: '26px', borderRadius: '2px', background: p.color || priorityColor(p.priority_level), flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#e8e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)' }}>{p.due_date ? `Échéance: ${fmtDate(p.due_date)}` : 'Sans date'}</div>
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: statusColor(p.status), background: `${statusColor(p.status)}18`, borderRadius: '6px', padding: '2px 6px', whiteSpace: 'nowrap' }}>{p.status}</span>
                    </div>
                  ))}
                  {myPriorities.length > 2 && (
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', marginTop: '4px' }}>+{myPriorities.length - 2} autres</div>
                  )}
                </div>
              )}

              {/* Overdue task preview */}
              {myOverdue > 0 && (() => {
                const myOvEv = overdueEvents.filter(e => e.employee_id === emp.id).slice(0, 2)
                return (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,77,109,.15)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#FF4D6D', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Tâches en retard</div>
                    {myOvEv.map(e => (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{e.title}</span>
                        <span style={{ fontSize: '10px', color: '#FF4D6D', marginLeft: '8px', flexShrink: 0 }}>{fmtDate(e.end_date)}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Row: Priorities + Alerts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Active Priorities */}
        <div style={{ ...card, padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ ...lbl }}>Priorités actives ({activePriorities.length})</div>
          </div>
          {activePriorities.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.25)', textAlign: 'center', padding: '20px 0' }}>Aucune priorité active</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '340px', overflowY: 'auto' }}>
              {activePriorities.map(p => {
                const emp = employees.find(e => e.id === p.employee_id)
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '10px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ width: '3px', height: '32px', borderRadius: '2px', background: p.color || priorityColor(p.priority_level), flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)' }}>
                        {emp ? emp.name : '—'}{p.due_date ? ` · ${fmtDate(p.due_date)}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: statusColor(p.status), background: `${statusColor(p.status)}18`, borderRadius: '5px', padding: '2px 6px' }}>{p.status}</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: priorityColor(p.priority_level), letterSpacing: '.04em' }}>{p.priority_level}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Unread Alerts */}
        <div style={{ ...card, padding: '18px' }}>
          <div style={{ ...lbl, marginBottom: '14px' }}>Alertes non lues ({unreadAlerts.length})</div>
          {unreadAlerts.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.25)', textAlign: 'center', padding: '20px 0' }}>Aucune alerte non lue</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '340px', overflowY: 'auto' }}>
              {unreadAlerts.map(a => {
                const emp = employees.find(e => e.id === a.employee_id)
                const c = alertTypeColor(a.alert_type)
                return (
                  <div key={a.id} style={{ display: 'flex', gap: '10px', padding: '9px 10px', borderRadius: '10px', background: `${c}08`, border: `1px solid ${c}20` }}>
                    <div style={{ width: '3px', borderRadius: '2px', background: c, flexShrink: 0, alignSelf: 'stretch' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: c, letterSpacing: '.06em' }}>{alertTypeLabel(a.alert_type)}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#e8e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</span>
                      </div>
                      {a.message && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.message}</div>}
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', marginTop: '2px' }}>
                        {emp ? emp.name : 'Système'}{a.alert_date ? ` · ${fmtDay(a.alert_date)}` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Branches ── */}
      <div style={{ ...card, padding: '18px', marginTop: '16px' }}>
        <div style={{ ...lbl, marginBottom: '12px' }}>Succursales ({branches.length}) · {suppliersCount} fournisseurs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
          {branches.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,.025)', border: `1px solid ${b.color}30` }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color, flexShrink: 0, boxShadow: `0 0 6px ${b.color}80` }} />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#e8e8f0' }}>{b.short_code}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)' }}>{b.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
