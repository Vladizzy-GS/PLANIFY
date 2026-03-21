import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'
import type { Employee } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, display_name').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const [employeesRes, pinRes] = await Promise.all([
    isAdmin ? supabase.from('employees').select('*').order('name') : Promise.resolve({ data: [] }),
    isAdmin ? supabase.from('app_settings').select('value').eq('key', 'admin_pin').single() : Promise.resolve({ data: null }),
  ])

  return (
    <SettingsClient
      userEmail={user.email ?? ''}
      displayName={profile?.display_name ?? null}
      role={profile?.role ?? 'employee'}
      initialEmployees={(employeesRes.data ?? []) as Employee[]}
      currentPin={isAdmin ? ((pinRes.data as { value?: string } | null)?.value ?? '1234') : undefined}
    />
  )
}
