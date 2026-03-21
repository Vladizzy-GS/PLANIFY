import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MapClient from './MapClient'

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  const [suppliersRes, branchesRes] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('branches').select('*').order('name'),
  ])

  return (
    <MapClient
      initialSuppliers={(suppliersRes.data ?? []) as unknown as Parameters<typeof MapClient>[0]['initialSuppliers']}
      branches={(branchesRes.data ?? []) as Parameters<typeof MapClient>[0]['branches']}
      isAdmin={profile?.role === 'admin' || profile?.role === 'superuser'}
    />
  )
}
