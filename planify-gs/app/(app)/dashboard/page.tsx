import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import { todayStr, addDays } from '@/lib/utils/dates'
import type { Alert, Event, Priority } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('employee_id, display_name, role')
    .single()

  const empId = profile?.employee_id ?? null
  const today = todayStr()
  const in14  = addDays(today, 14)

  const [alertsRes, eventsRes, prioritiesRes] = await Promise.all([
    supabase
      .from('alerts')
      .select('*')
      .or(empId ? `employee_id.eq.${empId},employee_id.is.null` : 'employee_id.is.null')
      .eq('is_read', false)
      .order('alert_type', { ascending: true })   // 'info' before 'warn' — urgent sorts by type
      .order('created_at', { ascending: false }),
    empId
      ? supabase
          .from('events')
          .select('*')
          .eq('employee_id', empId)
          .gte('start_date', today)
          .lte('start_date', in14)
          .order('start_date')
          .limit(6)
      : Promise.resolve({ data: [] }),
    empId
      ? supabase
          .from('priorities')
          .select('*')
          .eq('employee_id', empId)
          .neq('status', 'Terminé')
          .order('rank')
          .limit(6)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <DashboardClient
      displayName={profile?.display_name ?? null}
      alerts={(alertsRes.data ?? []) as Alert[]}
      upcomingEvents={(eventsRes.data ?? []) as Event[]}
      activePriorities={(prioritiesRes.data ?? []) as Priority[]}
    />
  )
}
