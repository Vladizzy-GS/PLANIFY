import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let profile: { role: string; employee_id: string | null; display_name: string | null } | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch profile for role data
    const { data } = await supabase
      .from('profiles')
      .select('role, employee_id, display_name')
      .eq('id', user.id)
      .single() as { data: { role: string; employee_id: string | null; display_name: string | null } | null }
    profile = data
  } catch (err) {
    // If it's a redirect (Next.js redirect throws), re-throw it
    if (err && typeof err === 'object' && 'digest' in err) throw err
    // Otherwise Supabase failed — redirect to login
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a12' }}>
      {/* Sidebar placeholder — will be replaced by full Sidebar component in Phase 2 */}
      <aside style={{
        width: '72px',
        background: 'rgba(255,255,255,.02)',
        borderRight: '1px solid rgba(255,255,255,.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        gap: '8px',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: '16px', color: '#fff', marginBottom: '16px' }}>
          P
        </div>

        {/* Nav links */}
        {[
          { href: '/schedule', label: 'Horaire', icon: '📅' },
          { href: '/tasks', label: 'Tâches', icon: '✓' },
          { href: '/priorities', label: 'Priorités', icon: '⚡' },
          { href: '/map', label: 'Carte', icon: '📍' },
          { href: '/alerts', label: 'Alertes', icon: '🔔' },
          { href: '/ai', label: 'IA', icon: '✦' },
        ].map(({ href, label, icon }) => (
          <a
            key={href}
            href={href}
            title={label}
            style={{
              width: '44px', height: '44px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', textDecoration: 'none',
              color: 'rgba(255,255,255,.5)',
            }}
          >
            {icon}
          </a>
        ))}

        {profile?.role === 'admin' && (
          <>
            <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,.07)', margin: '4px 0' }} />
            <a href="/admin/dashboard" title="Admin" style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', textDecoration: 'none', color: 'rgba(255,255,255,.5)' }}>
              🛡️
            </a>
          </>
        )}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
