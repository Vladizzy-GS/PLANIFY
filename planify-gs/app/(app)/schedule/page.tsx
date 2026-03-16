import { createClient } from '@/lib/supabase/server'
import ScheduleClient from './ScheduleClient'
import type { Event, Employee, Branch } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, eventsRes, employeesRes, branchesRes] = await Promise.all([
    supabase.from('profiles').select('role, employee_id').eq('id', user!.id).single(),
    supabase.from('events').select('*').order('start_date'),
    supabase.from('employees').select('*').eq('is_active', true).order('name'),
    supabase.from('branches').select('*').order('name'),
  ])

  const profile = profileRes.data
  const isAdmin = profile?.role === 'admin'
  const myEmployeeId = profile?.employee_id ?? null

  return (
    <ScheduleClient
      initialEvents={(eventsRes.data ?? []) as Event[]}
      employees={(employeesRes.data ?? []) as Employee[]}
      branches={(branchesRes.data ?? []) as Branch[]}
      myEmployeeId={myEmployeeId}
      isAdmin={isAdmin}
    />
  )
}
