/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, requireAdmin } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'

// Danger zone — only callable by admin
// POST { target: 'events' | 'all' }

const VALID_TARGETS = ['events', 'all'] as const
type ResetTarget = typeof VALID_TARGETS[number]

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request)
  if (limited) return limited

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { target } = await request.json()

  if (!VALID_TARGETS.includes(target as ResetTarget)) {
    return NextResponse.json({ error: 'Invalid target. Use "events" or "all".' }, { status: 400 })
  }

  const supabase = await createClient()
  const db = supabase as any

  if (target === 'events') {
    const { error } = await db.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) return NextResponse.json({ error: 'Reset failed.' }, { status: 500 })
    return NextResponse.json({ success: true, deleted: 'events' })
  }

  if (target === 'all') {
    const tables = ['priority_parts', 'priorities', 'events', 'alerts', 'suppliers']
    for (const table of tables) {
      const { error } = await db.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) return NextResponse.json({ error: 'Reset failed.' }, { status: 500 })
    }
    return NextResponse.json({ success: true, deleted: 'all' })
  }
}
