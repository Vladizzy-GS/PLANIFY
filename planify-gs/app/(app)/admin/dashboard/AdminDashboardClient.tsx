'use client'

import { useState, useMemo } from 'react'
import type { Employee, Branch, Priority, Alert } from '@/types/database'

type EventRow = {
  id: string; employee_id: string; title: string
  start_date: string; end_date: string; done: boolean
  priority_level: string; all_day: boolean; color: string
  branch_ids: string[]
}
type QuickRange = 'week' | '7d' | 'month' | '30d' | 'custom'

// ── Date helpers ────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().split('T')[0] }
function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function getMon(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay()
  d.setDate(d.getDate() + diff); return d.toISOString().split('T')[0]
}
function firstOfMonth(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const MFR = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']
function fmt(iso: string) {
  if (!iso) return '—'; const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()} ${MFR[d.getMonth()]}`
}
function inRange(ev: EventRow, from: string, to: string) {
  return ev.start_date <= to && ev.end_date >= from
}

// ── Per-employee stats ──────────────────────────────────────────────────────
function empStats(
  empId: string, events: EventRow[], priorities: Priority[],
  alerts: Alert[], branches: Branch[], from: string, to: string, today: string
) {
  const myEv = events.filter(e => e.employee_id === empId)
  const rangeEv = myEv.filter(e => inRange(e, from, to))
  const deplEv = rangeEv.filter(e => e.branch_ids?.length > 0)
  const uniqueBranchIds = [...new Set(deplEv.flatMap(e => e.branch_ids))]
  const visitedBranches = uniqueBranchIds.map(id => branches.find(b => b.id === id)).filter(Boolean) as Branch[]
  const done = rangeEv.filter(e => e.done).length
  const total = rangeEv.length
  const pct = total === 0 ? 0 : Math.round(done / total * 100)
  const urgent = rangeEv.filter(e => e.priority_level === 'Élevé').length
  const overdue = myEv.filter(e => e.end_date < today && !e.done)
  const myPrio = priorities.filter(p => p.employee_id === empId)
  const activePrio = myPrio.filter(p => p.status !== 'Terminé')
  const donePrio = myPrio.filter(p => p.status === 'Terminé')
  const prioPct = myPrio.length === 0 ? 0 : Math.round(donePrio.length / myPrio.length * 100)
  const myAlerts = alerts.filter(a => a.employee_id === empId)
  const unread = myAlerts.filter(a => !a.is_read)
  const statusScore = overdue.length > 2 ? 'danger' : overdue.length > 0 ? 'warn' : pct === 100 && total > 0 ? 'perfect' : 'ok'
  return { rangeEv, done, total, pct, urgent, overdue, deplEv, visitedBranches, myPrio, activePrio, donePrio, prioPct, myAlerts, unread, statusScore }
}

// ── UI primitives ───────────────────────────────────────────────────────────
function Bar({ val, max, color }: { val: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round(val / max * 100))
  return (
    <div style={{ flex: 1, height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,.08)' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: color, transition: 'width .35s' }} />
    </div>
  )
}
function StatChip({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '10px', padding: '10px 12px' }}>
      <div style={{ fontSize: '20px', fontWeight: 800, color, fontFamily: 'var(--font-syne)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#e8e8f0', marginTop: '3px', letterSpacing: '.03em' }}>{label}</div>
      {sub && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', marginTop: '1px' }}>{sub}</div>}
    </div>
  )
}
function statusInfo(s: string) {
  const m: Record<string,[string,string]> = { danger:['#FF4D6D','Attention'], warn:['#FCBF49','Retard'], perfect:['#06D6A0','Excellent'], ok:['#4CC9F0','Sur la voie'] }
  return m[s] ?? ['#888','—']
}
function prioColor(l: string) { return l === 'Élevé' ? '#FF4D6D' : l === 'Faible' ? '#4CC9F0' : '#FCBF49' }
function statColor(s: string) {
  const m: Record<string,string> = { 'À faire':'#4CC9F0','En cours':'#F77F00','En révision':'#7B2FBE','Terminé':'#06D6A0','Bloqué':'#FF4D6D' }
  return m[s] ?? '#888'
}
function alrtColor(t: string) {
  const m: Record<string,string> = { urgent:'#FF4D6D',warn:'#F77F00',info:'#4CC9F0',information:'#06D6A0','task-assigned':'#7B2FBE' }
  return m[t] ?? '#888'
}

// ── Employee Panel ──────────────────────────────────────────────────────────
function EmpPanel({ emp, stats, branches, priorities, allPriorities, alerts, compact }: {
  emp: Employee
  stats: ReturnType<typeof empStats>
  branches: Branch[]
  priorities: Priority[]
  allPriorities: Priority[]
  alerts: Alert[]
  compact?: boolean
}) {
  const [sc, sLabel] = statusInfo(stats.statusScore)
  const lbl: React.CSSProperties = { fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.07em', textTransform: 'uppercase' as const, marginBottom: '8px' }

  return (
    <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: emp.avatar_gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: `0 4px 12px rgba(0,0,0,.3)` }}>
          {emp.initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8f0' }}>{emp.name}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)' }}>{emp.role_title || 'Employé'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: sc, boxShadow: `0 0 6px ${sc}` }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: sc, letterSpacing: '.06em', textTransform: 'uppercase' }}>{sLabel}</span>
        </div>
      </div>

      {/* Completion bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={lbl}>Tâches ({stats.done}/{stats.total})</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: stats.pct >= 80 ? '#06D6A0' : stats.pct >= 40 ? '#FCBF49' : '#FF4D6D' }}>{stats.pct}%</span>
        </div>
        <div style={{ height: '7px', borderRadius: '4px', background: 'rgba(255,255,255,.08)' }}>
          <div style={{ width: `${stats.pct}%`, height: '100%', borderRadius: '4px', background: stats.pct >= 80 ? '#06D6A0' : stats.pct >= 40 ? '#FCBF49' : '#FF4D6D', transition: 'width .4s' }} />
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <StatChip label="En retard" value={stats.overdue.length} color={stats.overdue.length > 0 ? '#FF4D6D' : '#06D6A0'} />
        <StatChip label="Déplacements" value={stats.deplEv.length} color="#4CC9F0" sub={`${stats.visitedBranches.length} succursale${stats.visitedBranches.length > 1 ? 's' : ''}`} />
        <StatChip label="Urgentes" value={stats.urgent} color={stats.urgent > 0 ? '#FF4D6D' : '#e8e8f0'} />
        <StatChip label="Priorités act." value={stats.activePrio.length} color="#F77F00" />
        <StatChip label="Priorités done" value={`${stats.prioPct}%`} color={stats.prioPct >= 80 ? '#06D6A0' : '#FCBF49'} sub={`${stats.donePrio.length}/${stats.myPrio.length}`} />
        <StatChip label="Alertes non lues" value={stats.unread.length} color={stats.unread.length > 0 ? '#FCBF49' : '#e8e8f0'} />
      </div>

      {/* Déplacements breakdown */}
      {stats.visitedBranches.length > 0 && (
        <div>
          <div style={lbl}>Succursales visitées</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {stats.visitedBranches.map(b => {
              const count = stats.deplEv.filter(e => e.branch_ids.includes(b.id)).length
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '8px', background: `${b.color}18`, border: `1px solid ${b.color}40` }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: b.color }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: b.color }}>{b.short_code}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)' }}>×{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Overdue tasks */}
      {stats.overdue.length > 0 && (
        <div>
          <div style={{ ...lbl, color: 'rgba(255,77,109,.7)' }}>Tâches en retard</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {stats.overdue.slice(0, compact ? 2 : 4).map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: '7px', background: 'rgba(255,77,109,.06)', border: '1px solid rgba(255,77,109,.12)' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                <span style={{ fontSize: '10px', color: '#FF4D6D', marginLeft: '8px', flexShrink: 0 }}>{fmt(e.end_date)}</span>
              </div>
            ))}
            {stats.overdue.length > (compact ? 2 : 4) && (
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', paddingLeft: '4px' }}>+{stats.overdue.length - (compact ? 2 : 4)} autres</div>
            )}
          </div>
        </div>
      )}

      {/* Active priorities */}
      {stats.activePrio.length > 0 && (
        <div>
          <div style={lbl}>Priorités actives</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {stats.activePrio.slice(0, compact ? 2 : 4).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', borderRadius: '7px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ width: '3px', height: '24px', borderRadius: '2px', background: p.color || prioColor(p.priority_level), flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#e8e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: statColor(p.status), background: `${statColor(p.status)}18`, borderRadius: '5px', padding: '2px 5px', flexShrink: 0 }}>{p.status}</span>
              </div>
            ))}
            {stats.activePrio.length > (compact ? 2 : 4) && (
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', paddingLeft: '4px' }}>+{stats.activePrio.length - (compact ? 2 : 4)} autres</div>
            )}
          </div>
        </div>
      )}

      {/* Recent unread alerts */}
      {stats.unread.length > 0 && !compact && (
        <div>
          <div style={lbl}>Alertes non lues ({stats.unread.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {stats.unread.slice(0, 3).map(a => {
              const c = alrtColor(a.alert_type)
              return (
                <div key={a.id} style={{ display: 'flex', gap: '8px', padding: '5px 8px', borderRadius: '7px', background: `${c}08`, border: `1px solid ${c}20` }}>
                  <div style={{ width: '3px', borderRadius: '2px', background: c, alignSelf: 'stretch', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#e8e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    {a.message && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AdminDashboardClient({
  employees, branches, suppliersCount, allEvents, priorities, allAlerts,
}: {
  employees: Employee[]
  branches: Branch[]
  suppliersCount: number
  allEvents: EventRow[]
  priorities: Priority[]
  allAlerts: Alert[]
}) {
  const today = todayISO()
  const activeEmps = employees.filter(e => e.is_active)

  // ── Controls state ────────────────────────────────────────────────────────
  const [quickRange, setQuickRange] = useState<QuickRange>('week')
  const [customFrom, setCustomFrom] = useState(getMon(today))
  const [customTo, setCustomTo] = useState(today)
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null) // null = all
  const [compareMode, setCompareMode] = useState(false)

  // Compute active date range
  const { dateFrom, dateTo } = useMemo(() => {
    if (quickRange === 'week') return { dateFrom: getMon(today), dateTo: addDays(getMon(today), 6) }
    if (quickRange === '7d') return { dateFrom: addDays(today, -6), dateTo: today }
    if (quickRange === 'month') return { dateFrom: firstOfMonth(today), dateTo: today }
    if (quickRange === '30d') return { dateFrom: addDays(today, -29), dateTo: today }
    return { dateFrom: customFrom, dateTo: customTo }
  }, [quickRange, customFrom, customTo, today])

  // Employees to display
  const displayEmps = useMemo(() => {
    if (compareMode) return activeEmps
    if (selectedEmpId) return activeEmps.filter(e => e.id === selectedEmpId)
    return activeEmps
  }, [compareMode, selectedEmpId, activeEmps])

  // Per-employee stats
  const statsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof empStats>>()
    activeEmps.forEach(emp => {
      map.set(emp.id, empStats(emp.id, allEvents, priorities, allAlerts, branches, dateFrom, dateTo, today))
    })
    return map
  }, [activeEmps, allEvents, priorities, allAlerts, branches, dateFrom, dateTo, today])

  // Aggregate KPIs (over displayEmps)
  const agg = useMemo(() => {
    const ids = displayEmps.map(e => e.id)
    const ev = allEvents.filter(e => ids.includes(e.employee_id) && inRange(e, dateFrom, dateTo))
    const done = ev.filter(e => e.done).length
    const total = ev.length
    const depl = ev.filter(e => e.branch_ids?.length > 0)
    const overdue = allEvents.filter(e => ids.includes(e.employee_id) && e.end_date < today && !e.done)
    const myPrio = priorities.filter(p => p.employee_id && ids.includes(p.employee_id))
    const activePrio = myPrio.filter(p => p.status !== 'Terminé')
    const unread = allAlerts.filter(a => a.employee_id && ids.includes(a.employee_id) && !a.is_read)
    const urgent = unread.filter(a => a.alert_type === 'urgent')
    const urgentTasks = ev.filter(e => e.priority_level === 'Élevé').length
    const uniqueBranches = [...new Set(depl.flatMap(e => e.branch_ids))].length
    return { done, total, pct: total === 0 ? 0 : Math.round(done/total*100), depl: depl.length, uniqueBranches, overdue: overdue.length, activePrio: activePrio.length, myPrio: myPrio.length, unread: unread.length, urgent: urgent.length, urgentTasks }
  }, [displayEmps, allEvents, priorities, allAlerts, dateFrom, dateTo, today])

  const card: React.CSSProperties = { background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px' }
  const qBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: '8px', border: `1px solid ${active ? 'rgba(76,201,240,.4)' : 'rgba(255,255,255,.1)'}`,
    background: active ? 'rgba(76,201,240,.1)' : 'transparent', color: active ? '#4CC9F0' : 'rgba(255,255,255,.45)',
    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
  })

  return (
    <div style={{ padding: '24px 28px', color: '#e8e8f0', maxWidth: '1200px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Admin · Vue globale</div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>Tableau de bord</h1>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', fontWeight: 600 }}>
          {fmt(dateFrom)} → {fmt(dateTo)}
        </div>
      </div>

      {/* Controls */}
      <div style={{ ...card, padding: '14px 16px', marginBottom: '18px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>

        {/* Employee selector */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => { setSelectedEmpId(null); setCompareMode(false) }}
            style={qBtn(!selectedEmpId && !compareMode)}
          >
            Tous
          </button>
          {activeEmps.map(emp => (
            <button
              key={emp.id}
              onClick={() => { setSelectedEmpId(emp.id); setCompareMode(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
                border: `1px solid ${selectedEmpId === emp.id && !compareMode ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.1)'}`,
                background: selectedEmpId === emp.id && !compareMode ? 'rgba(255,255,255,.08)' : 'transparent',
                fontSize: '12px', fontWeight: 700, color: selectedEmpId === emp.id && !compareMode ? '#e8e8f0' : 'rgba(255,255,255,.45)',
              }}
            >
              <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: emp.avatar_gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff' }}>
                {emp.initials}
              </div>
              {emp.name.split(' ')[0]}
            </button>
          ))}
          {activeEmps.length > 1 && (
            <button
              onClick={() => { setCompareMode(c => !c); setSelectedEmpId(null) }}
              style={{
                ...qBtn(compareMode),
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              ⇄ Comparer
            </button>
          )}
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,.1)' }} />

        {/* Date range */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {([['week','Cette sem.'],['7d','7 jours'],['month','Ce mois'],['30d','30 jours'],['custom','Perso']] as [QuickRange,string][]).map(([k,l]) => (
            <button key={k} onClick={() => setQuickRange(k)} style={qBtn(quickRange === k)}>{l}</button>
          ))}
          {quickRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="date" value={customFrom}
                onChange={e => { const v = e.target.value; setCustomFrom(v); if (v > customTo) setCustomTo(v) }}
                style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', color: '#e8e8f0', fontSize: '12px' }}
              />
              <span style={{ color: 'rgba(255,255,255,.3)', fontSize: '12px' }}>→</span>
              <input type="date" value={customTo} min={customFrom}
                onChange={e => setCustomTo(e.target.value)}
                style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', color: '#e8e8f0', fontSize: '12px' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
        {[
          { label: 'Tâches', value: `${agg.done}/${agg.total}`, sub: `${agg.pct}% complétées`, color: agg.pct >= 80 ? '#06D6A0' : agg.pct >= 50 ? '#FCBF49' : '#FF4D6D' },
          { label: 'Déplacements', value: agg.depl, sub: `${agg.uniqueBranches} succursale${agg.uniqueBranches > 1 ? 's' : ''} visitée${agg.uniqueBranches > 1 ? 's' : ''}`, color: '#4CC9F0' },
          { label: 'En retard', value: agg.overdue, sub: 'tâches non terminées', color: agg.overdue === 0 ? '#06D6A0' : '#FF4D6D' },
          { label: 'Tâches urgentes', value: agg.urgentTasks, sub: 'priorité élevée', color: agg.urgentTasks > 0 ? '#FF4D6D' : '#e8e8f0' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '14px 16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-syne)', lineHeight: 1, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8f0', marginBottom: '2px' }}>{s.label}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Priorités actives', value: agg.activePrio, sub: `sur ${agg.myPrio} total`, color: '#F77F00' },
          { label: 'Alertes non lues', value: agg.unread, sub: agg.urgent > 0 ? `${agg.urgent} urgente${agg.urgent > 1 ? 's' : ''}` : 'aucune urgence', color: agg.urgent > 0 ? '#FF4D6D' : '#FCBF49' },
          { label: 'Employés actifs', value: activeEmps.length, sub: `sur ${employees.length} total`, color: '#4CC9F0' },
          { label: 'Fournisseurs', value: suppliersCount, sub: 'répertoriés', color: '#06D6A0' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '14px 16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-syne)', lineHeight: 1, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8f0', marginBottom: '2px' }}>{s.label}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Employee panels */}
      {compareMode ? (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Comparaison des employés</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${displayEmps.length}, 1fr)`, gap: '14px' }}>
            {displayEmps.map(emp => {
              const s = statsMap.get(emp.id)!
              return (
                <div key={emp.id}>
                  {/* Comparison header bar */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: emp.avatar_gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff' }}>{emp.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8f0' }}>{emp.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        <Bar val={s.done} max={s.total} color={s.pct >= 80 ? '#06D6A0' : s.pct >= 40 ? '#FCBF49' : '#FF4D6D'} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: s.pct >= 80 ? '#06D6A0' : s.pct >= 40 ? '#FCBF49' : '#FF4D6D', minWidth: '28px' }}>{s.pct}%</span>
                      </div>
                    </div>
                  </div>
                  <EmpPanel emp={emp} stats={s} branches={branches} priorities={priorities.filter(p => p.employee_id === emp.id)} allPriorities={priorities} alerts={allAlerts.filter(a => a.employee_id === emp.id)} compact />
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            {selectedEmpId ? `Détail · ${displayEmps[0]?.name ?? ''}` : `Performance des employés · ${fmt(dateFrom)} → ${fmt(dateTo)}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: selectedEmpId ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
            {displayEmps.map(emp => {
              const s = statsMap.get(emp.id)!
              return (
                <EmpPanel key={emp.id} emp={emp} stats={s} branches={branches} priorities={priorities.filter(p => p.employee_id === emp.id)} allPriorities={priorities} alerts={allAlerts.filter(a => a.employee_id === emp.id)} compact={!selectedEmpId} />
              )
            })}
          </div>
        </div>
      )}

      {/* Branches & Priorities footer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '18px' }}>
        {/* All active priorities */}
        <div style={{ ...card, padding: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Toutes les priorités actives ({priorities.filter(p => p.status !== 'Terminé').length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '280px', overflowY: 'auto' }}>
            {priorities.filter(p => p.status !== 'Terminé').map(p => {
              const emp = employees.find(e => e.id === p.employee_id)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
                  <div style={{ width: '3px', height: '28px', borderRadius: '2px', background: p.color || prioColor(p.priority_level), flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#e8e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)' }}>{emp?.name ?? '—'}{p.due_date ? ` · ${fmt(p.due_date)}` : ''}</div>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: statColor(p.status), background: `${statColor(p.status)}18`, borderRadius: '5px', padding: '2px 6px', flexShrink: 0 }}>{p.status}</span>
                </div>
              )
            })}
            {priorities.filter(p => p.status !== 'Terminé').length === 0 && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.2)', textAlign: 'center', padding: '16px' }}>Aucune priorité active</div>
            )}
          </div>
        </div>

        {/* Branches */}
        <div style={{ ...card, padding: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Succursales ({branches.length}) · {suppliersCount} fournisseurs
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px,1fr))', gap: '7px' }}>
            {branches.map(b => {
              const deplCount = allEvents.filter(e => inRange(e, dateFrom, dateTo) && e.branch_ids?.includes(b.id)).length
              const empIds = displayEmps.map(e => e.id)
              const filteredDepl = allEvents.filter(e => empIds.includes(e.employee_id) && inRange(e, dateFrom, dateTo) && e.branch_ids?.includes(b.id)).length
              return (
                <div key={b.id} style={{ padding: '9px 10px', borderRadius: '9px', background: `${b.color}10`, border: `1px solid ${b.color}30` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: b.color, boxShadow: `0 0 5px ${b.color}80` }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: b.color }}>{b.short_code}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.4)' }}>{b.name}</div>
                  {filteredDepl > 0 && <div style={{ fontSize: '10px', fontWeight: 700, color: '#4CC9F0', marginTop: '3px' }}>{filteredDepl} dépl.</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}
