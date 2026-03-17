import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from './AppShell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let profile: { role: string; employee_id: string | null; display_name: string | null } | null = null
  let employees: { id: string; name: string; initials: string; avatar_gradient: string }[] = []
  let alertCount = 0
  let taskCount = 0
  let adminCount = 0

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

    const [empRes, alertRes, taskRes, adminAlertRes] = await Promise.all([
      supabase.from('employees').select('id, name, initials, avatar_gradient').eq('is_active', true).order('name'),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_read', false),
      supabase.from('priorities').select('id', { count: 'exact', head: true }).neq('status', 'Terminé'),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_system', true).eq('is_read', false),
    ])

    employees = (empRes.data ?? []) as typeof employees
    alertCount = alertRes.count ?? 0
    taskCount = taskRes.count ?? 0
    adminCount = adminAlertRes.count ?? 0
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err
    redirect('/login')
  }

  return (
    <AppShell
      role={(profile?.role ?? 'employee') as 'admin' | 'branch_manager' | 'supervisor' | 'employee'}
      employeeId={profile?.employee_id ?? null}
      displayName={profile?.display_name ?? null}
      employees={employees}
      alertCount={alertCount}
      taskCount={taskCount}
      adminCount={adminCount}
    >
      {children}
    </AppShell>
  )
}
