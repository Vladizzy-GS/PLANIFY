import { createClient } from '@/lib/supabase/server'
import TasksClient from './TasksClient'
import type { Event, Priority } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createClient()

  const [eventsRes, prioritiesRes] = await Promise.all([
    supabase.from('events').select('*').order('start_date'),
    supabase.from('priorities').select('*').order('rank'),
  ])

  return (
    <TasksClient
      initialEvents={(eventsRes.data ?? []) as Event[]}
      initialPriorities={(prioritiesRes.data ?? []) as Priority[]}
    />
  )
}
