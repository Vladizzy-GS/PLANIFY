import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'

// Nominatim geocoding proxy
// Adds required User-Agent, enforces rate limiting, restricts to Canada
// Client usage:
//   GET /api/geocode?q=<address>         → 1 result (reverse lookup)
//   GET /api/geocode?q=<address>&limit=5 → up to 5 suggestions (autocomplete)

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request)
  if (limited) return limited

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 })
  if (q.length > 200) return NextResponse.json({ error: 'Query too long' }, { status: 400 })

  // Allow up to 5 results for address suggestion dropdowns
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? '1'), 1), 5)

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('countrycodes', 'ca')
  url.searchParams.set('addressdetails', '1')  // structured city/town/village fields

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
