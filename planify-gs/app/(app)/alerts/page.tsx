import { createClient } from '@/lib/supabase/server'
import AlertsClient from './AlertsClient'
import type { Alert } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })

  return <AlertsClient initialAlerts={(data ?? []) as Alert[]} />
}
