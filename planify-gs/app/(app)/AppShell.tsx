'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSessionStore } from '@/stores/useSessionStore'
import type { UserRole } from '@/types/database'

interface Props {
  role: UserRole
  employeeId: string | null
  displayName: string | null
  children: React.ReactNode
}

const NAV = [
  { href: '/schedule',  label: 'Horaire',       icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { href: '/tasks',     label: 'Tâches',         icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  )},
  { href: '/priorities', label: 'Priorités',     icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )},
  { href: '/map',       label: 'Carte',           icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )},
  { href: '/alerts',    label: 'Alertes',         icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )},
  { href: '/ai',        label: 'Assistant IA',    icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )},
]

export default function AppShell({ role, employeeId, displayName, children }: Props) {
  const setSession = useSessionStore(s => s.setSession)
  const pathname = usePathname()

  useEffect(() => {
    setSession(role, employeeId)
  }, [role, employeeId, setSession])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a12' }}>
      {/* Sidebar */}
      <aside style={{
        width: '72px',
        background: 'rgba(255,255,255,.02)',
        borderRight: '1px solid rgba(255,255,255,.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        gap: '4px',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Logo */}
        <Link href="/schedule" style={{ textDecoration: 'none' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(135deg,#FF4D6D,#F77F00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '16px', color: '#fff',
            marginBottom: '16px', fontFamily: 'var(--font-syne)',
          }}>
            P
          </div>
        </Link>

        {/* Nav links */}
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={label}
              style={{
                width: '44px', height: '44px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
                color: active ? '#FF4D6D' : 'rgba(255,255,255,.4)',
                background: active ? 'rgba(255,77,109,.13)' : 'transparent',
                border: active ? '1px solid rgba(255,77,109,.22)' : '1px solid transparent',
                transition: 'all .15s',
              }}
            >
              {icon}
            </Link>
          )
        })}

        {role === 'admin' && (
          <>
            <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,.07)', margin: '4px 0' }} />
            <Link
              href="/admin/dashboard"
              title="Admin"
              style={{
                width: '44px', height: '44px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
                color: pathname.startsWith('/admin') ? '#FFB703' : 'rgba(255,255,255,.4)',
                background: pathname.startsWith('/admin') ? 'rgba(255,183,3,.1)' : 'transparent',
                border: pathname.startsWith('/admin') ? '1px solid rgba(255,183,3,.2)' : '1px solid transparent',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </Link>
          </>
        )}

        {/* Settings at bottom */}
        <div style={{ flex: 1 }} />
        <Link
          href="/settings"
          title={displayName ?? 'Paramètres'}
          style={{
            width: '44px', height: '44px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none',
            color: pathname === '/settings' ? '#FF4D6D' : 'rgba(255,255,255,.4)',
            background: pathname === '/settings' ? 'rgba(255,77,109,.13)' : 'transparent',
            border: pathname === '/settings' ? '1px solid rgba(255,77,109,.22)' : '1px solid transparent',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
