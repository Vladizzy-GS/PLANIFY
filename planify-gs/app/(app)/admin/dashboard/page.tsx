import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'
import type { Employee, Branch, Priority, Alert } from '@/types/database'

export const dynamic = 'force-dynamic'

function getMonday(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/schedule')

  const today = new Date().toISOString().split('T')[0]
  const wkStart = getMonday(today)
  const wkEnd = addDays(wkStart, 6)

  const [employeesRes, branchesRes, suppliersRes, eventsRes, prioritiesRes, alertsRes] = await Promise.all([
    supabase.from('employees').select('*').order('name'),
    supabase.from('branches').select('*').order('name'),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('*').lte('start_date', wkEnd).gte('end_date', wkStart),
    supabase.from('priorities').select('*').order('rank'),
    supabase.from('alerts').select('*').eq('is_read', false).order('created_at', { ascending: false }).limit(8),
  ])

  // Overdue events: end_date < today and not done
  const { data: overdueData } = await supabase
    .from('events')
    .select('*')
    .lt('end_date', today)
    .eq('done', false)

  return (
    <AdminDashboardClient
      employees={(employeesRes.data ?? []) as Employee[]}
      branches={(branchesRes.data ?? []) as Branch[]}
      suppliersCount={suppliersRes.count ?? 0}
      weekEvents={(eventsRes.data ?? []) as Parameters<typeof AdminDashboardClient>[0]['weekEvents']}
      overdueEvents={(overdueData ?? []) as Parameters<typeof AdminDashboardClient>[0]['overdueEvents']}
      priorities={(prioritiesRes.data ?? []) as Priority[]}
      unreadAlerts={(alertsRes.data ?? []) as Alert[]}
      today={today}
      wkStart={wkStart}
      wkEnd={wkEnd}
    />
  )
}
