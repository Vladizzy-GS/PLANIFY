import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from './AppShell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let profile: { role: string; employee_id: string | null; display_name: string | null } | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data } = await supabase
      .from('profiles')
      .select('role, employee_id, display_name')
      .eq('id', user.id)
      .single() as { data: { role: string; employee_id: string | null; display_name: string | null } | null }
    profile = data
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err
    redirect('/login')
  }

  return (
    <AppShell
      role={(profile?.role ?? 'employee') as 'admin' | 'branch_manager' | 'supervisor' | 'employee'}
      employeeId={profile?.employee_id ?? null}
      displayName={profile?.display_name ?? null}
    >
      {children}
    </AppShell>
  )
}
