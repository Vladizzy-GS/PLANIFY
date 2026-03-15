import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Proxy for Gemini API — keeps the key server-side
// Client sends: { messages, systemPrompt, webSearch, apiKey? }
// We use GEMINI_API_KEY env var if set, otherwise fall back to client-provided key

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { messages, systemPrompt, webSearch, apiKey: clientKey } = body

  const apiKey = process.env.GEMINI_API_KEY || clientKey
  if (!apiKey) {
    return NextResponse.json({ error: 'No Gemini API key configured.' }, { status: 400 })
  }

  const requestBody: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemPrompt || '' }] },
    contents: messages,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  }

  if (webSearch) {
    requestBody.tools = [{ google_search: {} }]
  }

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    }
  )

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message || 'Gemini API error' }, { status: res.status })
  }

  return NextResponse.json(data)
}
