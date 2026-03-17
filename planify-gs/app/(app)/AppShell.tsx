'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/stores/useSessionStore'
import type { UserRole } from '@/types/database'

interface Employee {
  id: string
  name: string
  initials: string
  avatar_gradient: string
}

interface Props {
  role: UserRole
  employeeId: string | null
  displayName: string | null
  employees: Employee[]
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

export default function AppShell({ role, employeeId, employees, alertCount, taskCount, adminCount, children }: Props) {
  const setSession = useSessionStore(s => s.setSession)
  const setSelectedEmployee = useSessionStore(s => s.setSelectedEmployee)
  const selectedEmployeeId = useSessionStore(s => s.selectedEmployeeId)
  const pathname = usePathname()
  const router = useRouter()
  const [lightMode, setLightMode] = useState(false)
  const isAdmin = role === 'admin'

  useEffect(() => {
    setSession(role, employeeId)
  }, [role, employeeId, setSession])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleSelectEmployee(id: string) {
    setSelectedEmployee(id)
  }

  const s = {
    sidebar: {
      width: '210px',
      minWidth: '210px',
      background: 'rgba(255,255,255,.02)',
      borderRight: '1px solid rgba(255,255,255,.06)',
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
      borderBottom: '1px solid rgba(255,255,255,.06)',
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
      color: '#e8e8f0',
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
      color: 'rgba(255,255,255,.28)',
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
    quitBtn: {
      fontSize: '11px',
      fontWeight: 600,
      color: 'rgba(255,255,255,.4)',
      background: 'rgba(255,255,255,.07)',
      border: '1px solid rgba(255,255,255,.1)',
      borderRadius: '6px',
      padding: '2px 8px',
      cursor: 'pointer',
    },
    empRow: (active: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '6px 8px',
      borderRadius: '10px',
      cursor: 'pointer',
      background: active ? 'rgba(255,255,255,.06)' : 'transparent',
      border: active ? '1px solid rgba(255,255,255,.1)' : '1px solid transparent',
      marginBottom: '2px',
    }),
    avatar: (gradient: string) => ({
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
    }),
    empName: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#e8e8f0',
      lineHeight: 1.2,
    },
    empStatus: {
      fontSize: '11px',
      color: '#06D6A0',
    },
    progressRow: {
      padding: '4px 16px 10px',
      borderBottom: '1px solid rgba(255,255,255,.06)',
    },
    progressLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '11px',
      color: 'rgba(255,255,255,.35)',
      marginBottom: '4px',
    },
    progressBar: {
      height: '3px',
      background: 'rgba(255,255,255,.08)',
      borderRadius: '2px',
      overflow: 'hidden',
    },
    navSection: {
      flex: 1,
      overflow: 'auto',
      padding: '8px 10px',
    },
    navItem: (active: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 10px',
      borderRadius: '10px',
      textDecoration: 'none',
      color: active ? '#e8e8f0' : 'rgba(255,255,255,.45)',
      background: active ? 'rgba(255,77,109,.13)' : 'transparent',
      border: active ? '1px solid rgba(255,77,109,.22)' : '1px solid transparent',
      marginBottom: '2px',
      fontSize: '13px',
      fontWeight: active ? 600 : 400,
      transition: 'all .12s',
      position: 'relative' as const,
    }),
    navIcon: (active: boolean) => ({
      color: active ? '#FF4D6D' : 'rgba(255,255,255,.4)',
      flexShrink: 0,
    }),
    badge: (color = '#FF4D6D') => ({
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
    }),
    adminNavItem: (active: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 10px',
      borderRadius: '10px',
      textDecoration: 'none',
      color: active ? '#FFB703' : 'rgba(255,255,255,.45)',
      background: active ? 'rgba(255,183,3,.1)' : 'transparent',
      border: active ? '1px solid rgba(255,183,3,.2)' : '1px solid transparent',
      marginBottom: '2px',
      fontSize: '13px',
      fontWeight: active ? 600 : 400,
      transition: 'all .12s',
    }),
    divider: {
      height: '1px',
      background: 'rgba(255,255,255,.06)',
      margin: '6px 10px',
    },
    bottomSection: {
      padding: '8px 10px',
      borderTop: '1px solid rgba(255,255,255,.06)',
    },
    deplSection: {
      padding: '6px 10px 4px',
      borderTop: '1px solid rgba(255,255,255,.06)',
    },
    deplLabel: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: 'rgba(255,255,255,.28)',
      textTransform: 'uppercase' as const,
      padding: '4px 0',
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
    lightBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 10px',
      borderRadius: '10px',
      cursor: 'pointer',
      background: 'transparent',
      border: '1px solid transparent',
      color: 'rgba(255,255,255,.45)',
      fontSize: '13px',
      width: '100%',
      textAlign: 'left' as const,
    },
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a12' }}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        {/* Branding */}
        <div style={s.brand}>
          <div style={s.brandLabel}>Gestion Équipe</div>
          <div style={s.brandTitle}>
            <span>Planify</span>
            <span style={{ color: 'rgba(255,255,255,.35)', fontWeight: 400 }}>·</span>
            <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: '18px' }}>GS</span>
          </div>
        </div>

        {/* Admin badge */}
        {isAdmin && (
          <div style={s.adminRow}>
            <div style={s.adminBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              ADMIN
            </div>
            <button style={s.quitBtn} onClick={handleSignOut}>Quitter</button>
          </div>
        )}

        {/* Employees */}
        <div style={s.section}>
          <div style={s.sectionLabel}>
            <span>Employés</span>
            {isAdmin && (
              <div style={{
                width: '18px', height: '18px', borderRadius: '6px',
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: 'rgba(255,255,255,.5)', fontSize: '14px', lineHeight: 1,
              }}>+</div>
            )}
          </div>
          {employees.map(emp => (
            <div
              key={emp.id}
              style={s.empRow(selectedEmployeeId === emp.id)}
              onClick={() => handleSelectEmployee(emp.id)}
            >
              <div style={s.avatar(emp.avatar_gradient)}>{emp.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.empName}>{emp.name}</div>
                <div style={s.empStatus}>En ligne</div>
              </div>
              {isAdmin && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Week progress */}
        <div style={s.progressRow}>
          <div style={s.progressLabel}>
            <span>Semaine</span>
            <span style={{ color: '#FF4D6D', fontWeight: 700 }}>0%</span>
          </div>
          <div style={s.progressBar}>
            <div style={{ width: '0%', height: '100%', background: '#FF4D6D', borderRadius: '2px' }} />
          </div>
        </div>

        {/* Navigation */}
        <div style={s.navSection}>
          {NAV.map(({ href, label, icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const count = badge === 'alert' ? alertCount : badge === 'task' ? taskCount : 0
            return (
              <Link key={href} href={href} style={s.navItem(active)}>
                <span style={s.navIcon(active)}>{icon}</span>
                {label}
                {count > 0 && <span style={s.badge()}>{count}</span>}
              </Link>
            )
          })}

          {isAdmin && (
            <>
              <div style={s.divider} />
              <Link href="/admin/dashboard" style={s.adminNavItem(pathname.startsWith('/admin'))}>
                <span style={{ color: pathname.startsWith('/admin') ? '#FFB703' : 'rgba(255,255,255,.4)', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </span>
                Tableau Admin
                {adminCount > 0 && <span style={s.badge('#FFB703')}>{adminCount}</span>}
              </Link>
            </>
          )}

          <div style={s.divider} />
          <Link href="/settings" style={s.navItem(pathname === '/settings')}>
            <span style={s.navIcon(pathname === '/settings')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </span>
            Paramètres
          </Link>
        </div>

        {/* Déplacements */}
        <div style={s.deplSection}>
          <div style={s.deplLabel}>
            <span>▾ Déplacements</span>
            <span style={s.deplBadge}>SEM</span>
          </div>
        </div>

        {/* Mode clair */}
        <div style={s.bottomSection}>
          <button style={s.lightBtn} onClick={() => setLightMode(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {lightMode
                ? <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>
                : <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
              }
            </svg>
            Mode clair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
