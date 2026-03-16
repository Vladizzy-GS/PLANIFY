import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/schedule')
  } catch {
    // Supabase unavailable or env vars missing — fall through to login
  }
  redirect('/login')
}
