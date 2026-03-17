import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSettingsClient from './AdminSettingsClient'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/schedule')

  const { data: pinRow } = await supabase.from('app_settings').select('value').eq('key', 'admin_pin').single()

  return <AdminSettingsClient currentPin={pinRow?.value ?? '1234'} />
}
