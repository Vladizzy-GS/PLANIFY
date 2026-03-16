import { createClient } from '@/lib/supabase/server'
import PrioritiesClient from './PrioritiesClient'
import type { Priority, PriorityPart } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function PrioritiesPage() {
  const supabase = await createClient()

  const [prioritiesRes, partsRes] = await Promise.all([
    supabase.from('priorities').select('*').order('rank').order('created_at'),
    supabase.from('priority_parts').select('*').order('position'),
  ])

  const parts = (partsRes.data ?? []) as PriorityPart[]
  const priorities = ((prioritiesRes.data ?? []) as Priority[]).map(p => ({
    ...p,
    parts: parts.filter(pt => pt.priority_id === p.id),
  }))

  return <PrioritiesClient initialPriorities={priorities} />
}
