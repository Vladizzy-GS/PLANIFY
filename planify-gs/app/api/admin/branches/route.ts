/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, requireAdmin } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'

const DB_ERROR = 'Une erreur est survenue. Veuillez réessayer.'

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request)
  if (limited) return limited

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { data, error } = await (supabase as any).from('branches').select('*').order('name')

  if (error) return NextResponse.json({ error: DB_ERROR }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request)
  if (limited) return limited

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const supabase = await createClient()
  const { data, error } = await (supabase as any).from('branches').insert(body).select().single()

  if (error) return NextResponse.json({ error: DB_ERROR }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const limited = checkRateLimit(request)
  if (limited) return limited

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payload = await request.json()
  const { id, ...updates } = payload
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await (supabase as any).from('branches').update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: DB_ERROR }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const limited = checkRateLimit(request)
  if (limited) return limited

  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await (supabase as any).from('branches').delete().eq('id', id)

  if (error) return NextResponse.json({ error: DB_ERROR }, { status: 500 })
  return NextResponse.json({ success: true })
}
