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

  let employees: Employee[] = []
  if (isAdmin) {
    const { data } = await supabase.from('employees').select('*').order('name')
    employees = (data ?? []) as Employee[]
  }

  return (
    <SettingsClient
      userEmail={user.email ?? ''}
      displayName={profile?.display_name ?? null}
      role={profile?.role ?? 'employee'}
      initialEmployees={employees}
    />
  )
}
