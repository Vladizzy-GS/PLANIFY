/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, requireAdmin } from '@/lib/supabase/server'

// Danger zone — only callable by admin
// POST { target: 'events' | 'all' }

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { target } = await request.json()
  const supabase = await createClient()
  const db = supabase as any

  if (target === 'events') {
    const { error } = await db.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, deleted: 'events' })
  }

  if (target === 'all') {
    const tables = ['priority_parts', 'priorities', 'events', 'alerts', 'suppliers']
    for (const table of tables) {
      const { error } = await db.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) return NextResponse.json({ error: `Failed on ${table}: ${error.message}` }, { status: 500 })
    }
    return NextResponse.json({ success: true, deleted: 'all' })
  }

  return NextResponse.json({ error: 'Invalid target. Use "events" or "all".' }, { status: 400 })
}
