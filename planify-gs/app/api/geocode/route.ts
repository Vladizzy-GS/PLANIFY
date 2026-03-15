import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Nominatim geocoding proxy
// Adds required User-Agent, handles rate limiting at the server level
// Client sends: GET /api/geocode?q=<address>

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 })

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'ca')

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Planify-GS/1.0 (contact@planify-gs.app)',
      'Accept': 'application/json',
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
