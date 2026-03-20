'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/stores/useSessionStore'
import { useCalendarStore } from '@/stores/useCalendarStore'
import { addDays, eventVisibleOn } from '@/lib/utils/dates'
import type { UserRole } from '@/types/database'

interface Employee {
  id: string
  name: string
  initials: string
  avatar_gradient: string
}

interface BranchSimple {
  id: string
  name: string
  short_code: string
  color: string
}

interface Props {
  role: UserRole
  employeeId: string | null
  displayName: string | null
  employees: Employee[]
  branches: BranchSimple[]
  alertCount: number
  taskCount: number
  adminCount: number
  children: React.ReactNode
}

const NAV = [
  {
    href: '/schedule', label: 'Horaire', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/tasks', label: 'Tâches', badge: 'task', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    href: '/priorities', label: 'Priorités', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  {
    href: '/map', label: 'Fournisseurs', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
      </svg>
    ),
  },
  {
    href: '/alerts', label: 'Alertes', badge: 'alert', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    href: '/ai', label: 'Assistant IA', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
]

// ─── Static styles (outside component to avoid recreation on every render) ────
const st = {
  sidebar: {
    width: '210px',
    minWidth: '210px',
    background: 'var(--bg-panel)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '0',
    flexShrink: 0,
    position: 'sticky' as const,
    top: 0,
    height: '100vh',
    overflow: 'hidden',
  },
  brand: {
    padding: '18px 16px 12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  brandLabel: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#FF4D6D',
    textTransform: 'uppercase' as const,
    marginBottom: '4px',
  },
  brandTitle: {
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-syne, sans-serif)',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  section: {
    padding: '10px 16px 6px',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    marginBottom: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminRow: {
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255,183,3,.06)',
    borderBottom: '1px solid rgba(255,183,3,.12)',
  },
  adminBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#FFB703',
    letterSpacing: '0.08em',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  empName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  empStatus: {
    fontSize: '11px',
    color: '#06D6A0',
  },
  progressRow: {
    padding: '4px 16px 10px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '4px',
  },
  progressBar: {
    height: '3px',
    background: 'var(--bg-hover)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  navSection: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 10px',
  },
  divider: {
    height: '1px',
    background: 'var(--border-subtle)',
    margin: '6px 10px',
  },
  bottomSection: {
    padding: '8px 10px',
    borderTop: '1px solid var(--border-subtle)',
  },
  deplSection: {
    padding: '4px 10px',
    borderTop: '1px solid var(--border-subtle)',
  },
  deplLabelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    padding: '4px 0',
    cursor: 'pointer',
  },
  deplBadge: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#FF4D6D',
    background: 'rgba(255,77,109,.15)',
    border: '1px solid rgba(255,77,109,.3)',
    borderRadius: '4px',
    padding: '1px 5px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 2px',
    marginBottom: '4px',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  signOutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    background: 'transparent',
    border: '1px solid var(--border-normal)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 500,
    width: '100%',
    textAlign: 'left' as const,
  },
}

// ─── Dynamic style helpers ────────────────────────────────────────────────────
const empRowStyle = (active: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '6px 8px',
  borderRadius: '10px',
  cursor: 'pointer',
  background: active ? 'var(--bg-card)' : 'transparent',
  border: active ? '1px solid var(--border-normal)' : '1px solid transparent',
  marginBottom: '2px',
})

const avatarStyle = (gradient: string) => ({
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  background: gradient,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '11px',
  fontWeight: 700,
  color: '#fff',
  flexShrink: 0,
})

const navItemStyle = (active: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 10px',
  borderRadius: '10px',
  textDecoration: 'none',
  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
  background: active ? 'rgba(255,77,109,.13)' : 'transparent',
  border: active ? '1px solid rgba(255,77,109,.22)' : '1px solid transparent',
  marginBottom: '2px',
  fontSize: '13px',
  fontWeight: active ? 600 : 400,
  transition: 'all .12s',
  position: 'relative' as const,
})

const navIconStyle = (active: boolean) => ({
  color: active ? '#FF4D6D' : 'var(--text-muted)',
  flexShrink: 0,
})

const badgeStyle = (color = '#FF4D6D') => ({
  marginLeft: 'auto',
  minWidth: '18px',
  height: '18px',
  borderRadius: '9px',
  background: color,
  color: '#fff',
  fontSize: '10px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 5px',
})

const adminNavItemStyle = (active: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 10px',
  borderRadius: '10px',
  textDecoration: 'none',
  color: active ? '#FFB703' : 'var(--text-secondary)',
  background: active ? 'rgba(255,183,3,.1)' : 'transparent',
  border: active ? '1px solid rgba(255,183,3,.2)' : '1px solid transparent',
  marginBottom: '2px',
  fontSize: '13px',
  fontWeight: active ? 600 : 400,
  transition: 'all .12s',
})

const themeButtonStyle = (dark: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  borderRadius: '10px',
  cursor: 'pointer',
  background: dark ? 'transparent' : 'rgba(255,255,255,.9)',
  border: dark ? '1px solid var(--border-subtle)' : '1px solid rgba(0,0,0,.15)',
  color: dark ? 'var(--text-secondary)' : '#0d0d1a',
  fontSize: '13px',
  width: '100%',
  textAlign: 'left' as const,
  fontWeight: 500,
  transition: 'all .15s',
})

export default function AppShell({
  role, employeeId, displayName, employees, branches,
  alertCount, taskCount, adminCount, children,
}: Props) {
  const setSession = useSessionStore(s => s.setSession)
  const setSelectedEmployee = useSessionStore(s => s.setSelectedEmployee)
  const selectedEmployeeId = useSessionStore(s => s.selectedEmployeeId)
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = role === 'admin'

  // ─── Theme — lazy init to avoid FOUC ────────────────────────────────────────
  // Bug fix: previously hardcoded true causing flash for light-mode users
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('planify-theme') !== 'light'
  })
  const [deplOpen, setDeplOpen] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('planify-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // ─── Calendar store (for déplacements + progress) ───────────────────────────
  const { calMode, wkStart, dayView, monView, calEvents, setBranches } = useCalendarStore()

  useEffect(() => {
    if (branches.length > 0) setBranches(branches as Parameters<typeof setBranches>[0])
  }, [branches, setBranches])

  useEffect(() => {
    setSession(role, employeeId)
  }, [role, employeeId, setSession])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Bug fix: toggling the same employee deselects (shows all for admin)
  function handleSelectEmployee(id: string) {
    setSelectedEmployee(selectedEmployeeId === id ? '' : id)
  }

  // ─── Week progress % ────────────────────────────────────────────────────────
  const weekProgress = useMemo(() => {
    if (!calEvents.length) return 0
    const viewEmpId = isAdmin ? selectedEmployeeId : employeeId
    const empEvents = viewEmpId
      ? calEvents.filter(ev => ev.employee_id === viewEmpId)
      : calEvents
    const wkDays = Array.from({ length: 7 }, (_, i) => addDays(wkStart, i))
    const weekEvents = empEvents.filter(ev => wkDays.some(d => eventVisibleOn(ev, d)))
    if (!weekEvents.length) return 0
    const done = weekEvents.filter(ev => ev.done).length
    return Math.round((done / weekEvents.length) * 100)
  }, [calEvents, selectedEmployeeId, employeeId, isAdmin, wkStart])

  // ─── Déplacements ───────────────────────────────────────────────────────────
  const deplPeriodLabel = calMode === 'day' ? 'JOUR' : calMode === 'month' ? 'MOIS' : 'SEM'

  const deplEvents = useMemo(() => {
    if (!calEvents.length) return []
    const viewEmpId = isAdmin ? selectedEmployeeId : employeeId
    const empEvents = viewEmpId
      ? calEvents.filter(ev => ev.employee_id === viewEmpId)
      : calEvents

    let dateRange: string[]
    if (calMode === 'day') {
      dateRange = [dayView]
    } else if (calMode === 'week') {
      dateRange = Array.from({ length: 7 }, (_, i) => addDays(wkStart, i))
    } else {
      // month: all days of the month
      const year = Number(monView.substring(0, 4))
      const month = Number(monView.substring(5, 7))
      const daysInMonth = new Date(year, month, 0).getDate()
      dateRange = Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(year, month - 1, i + 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })
    }

    const seen = new Set<string>()
    const result: { ev: typeof empEvents[0]; date: string; branchCodes: { code: string; color: string }[] }[] = []

    for (const date of dateRange) {
      for (const ev of empEvents) {
        if (seen.has(ev.id)) continue
        if (!(ev.branch_ids?.length > 0)) continue
        if (!eventVisibleOn(ev, date)) continue
        seen.add(ev.id)
        const branchCodes = (ev.branch_ids || []).map(bid => {
          const b = branches.find(br => br.id === bid)
          return b ? { code: b.short_code, color: b.color } : null
        }).filter(Boolean) as { code: string; color: string }[]
        result.push({ ev, date, branchCodes })
      }
    }
    return result
  }, [calEvents, calMode, wkStart, dayView, monView, selectedEmployeeId, employeeId, isAdmin, branches])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside style={st.sidebar}>

        {/* Branding */}
        <div style={st.brand}>
          <div style={st.brandLabel}>Gestion Équipe</div>
          <div style={st.brandTitle}>
            <span>Planify</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>·</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '18px' }}>GS</span>
          </div>
        </div>

        {/* Admin badge */}
        {isAdmin && (
          <div style={st.adminRow}>
            <div style={st.adminBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              ADMIN
            </div>
          </div>
        )}

        {/* Employee list — visible to all; interactive switching for admin only */}
        <div style={st.section}>
          <div style={st.sectionLabel}>
            <span>Employés</span>
            {isAdmin && (
              <Link
                href="/admin/settings"
                style={{
                  width: '18px', height: '18px', borderRadius: '6px',
                  background: 'var(--bg-hover)', border: '1px solid var(--border-normal)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1,
                  textDecoration: 'none',
                }}
                title="Gérer les employés"
              >+</Link>
            )}
          </div>
          {employees.map(emp => (
            <div
              key={emp.id}
              style={empRowStyle(isAdmin && selectedEmployeeId === emp.id)}
              onClick={isAdmin ? () => handleSelectEmployee(emp.id) : undefined}
            >
              <div style={avatarStyle(emp.avatar_gradient)}>{emp.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={st.empName}>{emp.name}</div>
                <div style={st.empStatus}>En ligne</div>
              </div>
              {isAdmin && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Week progress */}
        <div style={st.progressRow}>
          <div style={st.progressLabel}>
            <span>Semaine</span>
            <span style={{ color: '#FF4D6D', fontWeight: 700 }}>{weekProgress}%</span>
          </div>
          <div style={st.progressBar}>
            <div style={{ width: `${weekProgress}%`, height: '100%', background: '#FF4D6D', borderRadius: '2px', transition: 'width .4s ease' }} />
          </div>
        </div>

        {/* Navigation */}
        <div style={st.navSection}>
          {NAV.map(({ href, label, icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const count = badge === 'alert' ? alertCount : badge === 'task' ? taskCount : 0
            return (
              <Link key={href} href={href} style={navItemStyle(active)}>
                <span style={navIconStyle(active)}>{icon}</span>
                {label}
                {count > 0 && <span style={badgeStyle()}>{count}</span>}
              </Link>
            )
          })}

          {isAdmin && (
            <>
              <div style={st.divider} />
              <Link href="/admin/dashboard" style={adminNavItemStyle(pathname.startsWith('/admin'))}>
                <span style={{ color: pathname.startsWith('/admin') ? '#FFB703' : 'var(--text-muted)', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </span>
                Tableau Admin
                {adminCount > 0 && <span style={badgeStyle('#FFB703')}>{adminCount}</span>}
              </Link>
            </>
          )}

          <div style={st.divider} />
          <Link href="/settings" style={navItemStyle(pathname === '/settings')}>
            <span style={navIconStyle(pathname === '/settings')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </span>
            Paramètres
          </Link>
        </div>

        {/* Déplacements */}
        <div style={st.deplSection}>
          <div style={st.deplLabelRow} onClick={() => setDeplOpen(v => !v)}>
            <span>{deplOpen ? '▾' : '▸'} Déplacements</span>
            <span style={st.deplBadge}>{deplPeriodLabel}</span>
          </div>
          {deplOpen && deplEvents.length > 0 && (
            <div style={{ paddingBottom: '4px' }}>
              {deplEvents.map(({ ev, date, branchCodes }) => {
                const d = new Date(date + 'T00:00:00')
                const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
                const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()}`
                return (
                  <div key={ev.id} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '3px 2px',
                    fontSize: '10px', color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '36px', flexShrink: 0 }}>{dayLabel}</span>
                    <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{ev.title}</span>
                    <span style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      {branchCodes.map((bc, i) => (
                        <span key={`${bc.code}-${i}`} style={{
                          fontSize: '8px', fontWeight: 700,
                          color: bc.color,
                          background: `${bc.color}22`,
                          border: `1px solid ${bc.color}55`,
                          borderRadius: '3px', padding: '0 3px',
                        }}>{bc.code}</span>
                      ))}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          {deplOpen && deplEvents.length === 0 && (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '4px 2px 6px', fontStyle: 'italic' }}>
              Aucun déplacement
            </div>
          )}
        </div>

        {/* Bottom — theme + user info + sign out */}
        <div style={st.bottomSection}>
          <button style={themeButtonStyle(isDark)} onClick={() => setIsDark(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isDark
                ? <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
                : <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>
              }
            </svg>
            {isDark ? 'Mode clair' : 'Mode sombre'}
          </button>

          {/* User info + sign out — accessible to all roles */}
          <div style={{ marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
            {displayName && (
              <div style={st.userRow}>
                <div style={st.userInfo}>
                  <div style={st.userName}>{displayName}</div>
                  <div style={st.userRole}>{isAdmin ? 'Administrateur' : 'Employé'}</div>
                </div>
              </div>
            )}
            <button style={st.signOutBtn} onClick={handleSignOut}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        {children}
      </main>
    </div>
  )
}
