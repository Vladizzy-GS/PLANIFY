import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/schedule')

  const [employeesRes, branchesRes, suppliersRes, alertsRes] = await Promise.all([
    supabase.from('employees').select('*').order('name'),
    supabase.from('branches').select('id, name, short_code, color').order('name'),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_read', false),
  ])

  return (
    <AdminDashboardClient
      initialEmployees={(employeesRes.data ?? []) as Parameters<typeof AdminDashboardClient>[0]['initialEmployees']}
      branches={(branchesRes.data ?? []) as Parameters<typeof AdminDashboardClient>[0]['branches']}
      suppliersCount={suppliersRes.count ?? 0}
      alertsCount={alertsRes.count ?? 0}
    />
  )
}
