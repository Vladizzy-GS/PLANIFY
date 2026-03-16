/**
 * Simple in-process rate limiter for API routes.
 * Resets on cold start — sufficient for edge protection.
 *
 * Usage in an API route:
 *   import { checkRateLimit } from '@/lib/utils/rate-limit'
 *   const limited = checkRateLimit(request)
 *   if (limited) return limited  // NextResponse with 429
 */
import { NextRequest, NextResponse } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW = 60_000 // 1 minute in ms

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Returns a 429 NextResponse if the caller is over the rate limit,
 * or null if the request should proceed.
 */
export function checkRateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIp(request)
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return null
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  return null
}
