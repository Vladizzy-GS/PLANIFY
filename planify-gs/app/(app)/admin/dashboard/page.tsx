import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'
import type { Employee, Branch, Priority, Alert } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/schedule')

  const [employeesRes, branchesRes, suppliersRes, eventsRes, prioritiesRes, alertsRes] = await Promise.all([
    supabase.from('employees').select('*').order('name'),
    supabase.from('branches').select('*').order('name'),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('*').order('start_date'),
    supabase.from('priorities').select('*').order('rank'),
    supabase.from('alerts').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <AdminDashboardClient
      employees={(employeesRes.data ?? []) as Employee[]}
      branches={(branchesRes.data ?? []) as Branch[]}
      suppliersCount={suppliersRes.count ?? 0}
      allEvents={(eventsRes.data ?? []) as Parameters<typeof AdminDashboardClient>[0]['allEvents']}
      priorities={(prioritiesRes.data ?? []) as Priority[]}
      allAlerts={(alertsRes.data ?? []) as Alert[]}
    />
  )
}
