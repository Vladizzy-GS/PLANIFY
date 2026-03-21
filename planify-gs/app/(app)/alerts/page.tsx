import { createClient } from '@/lib/supabase/server'
import AlertsClient from './AlertsClient'
import type { Alert, Employee } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const supabase = await createClient()

  const [alertsRes, empRes] = await Promise.all([
    supabase.from('alerts').select('*').order('created_at', { ascending: false }),
    supabase.from('employees').select('id, name, initials, avatar_gradient').eq('is_active', true).order('name'),
  ])

  return (
    <AlertsClient
      initialAlerts={(alertsRes.data ?? []) as Alert[]}
      employees={(empRes.data ?? []) as Employee[]}
    />
  )
}
