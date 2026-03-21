import { createClient } from '@/lib/supabase/server'
import TasksClient from './TasksClient'
import type { Event, Priority, Employee, Branch, Alert } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createClient()

  const [eventsRes, prioritiesRes, employeesRes, branchesRes, profileRes] = await Promise.all([
    supabase.from('events').select('*').order('start_date'),
    supabase.from('priorities').select('*').order('rank'),
    supabase.from('employees').select('*').eq('is_active', true).order('name'),
    supabase.from('branches').select('*').order('name'),
    supabase.from('profiles').select('role, employee_id').single(),
  ])

  // Fetch unread task-assigned alerts for current employee (shown as popup)
  const empId = profileRes.data?.employee_id
  let taskAlerts: Alert[] = []
  if (empId) {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('employee_id', empId)
      .eq('alert_type', 'task-assigned')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
    taskAlerts = (data ?? []) as Alert[]
  }

  return (
    <TasksClient
      initialEvents={(eventsRes.data ?? []) as Event[]}
      initialPriorities={(prioritiesRes.data ?? []) as Priority[]}
      employees={(employeesRes.data ?? []) as Employee[]}
      branches={(branchesRes.data ?? []) as Branch[]}
      initialTaskAlerts={taskAlerts}
    />
  )
}
