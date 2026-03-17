'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'model'; text: string }

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', text }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const contents = newMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }))

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: contents,
          systemPrompt: "Tu es l'assistant IA de Planify GS, un outil de gestion d'équipe pour les employés de Groupe Signalisation. Réponds en français, de manière concise et professionnelle. Tu peux aider avec la planification, les priorités, les fournisseurs et la gestion d'équipe.",
          webSearch,
          ...(apiKey ? { apiKey } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Aucune réponse.'
      setMessages(prev => [...prev, { role: 'model', text: reply }])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur'
      setMessages(prev => [...prev, { role: 'model', text: `Erreur : ${msg}` }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px 28px', maxWidth: '760px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Planify</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>
            Assistant IA <span style={{ color: '#7B2FBE' }}>✦</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setWebSearch(v => !v)}
              style={{ padding: '5px 12px', borderRadius: '8px', border: `1px solid ${webSearch ? 'rgba(76,201,240,.4)' : 'rgba(255,255,255,.12)'}`, background: webSearch ? 'rgba(76,201,240,.1)' : 'transparent', color: webSearch ? '#4CC9F0' : 'rgba(255,255,255,.45)', fontSize: '12px', cursor: 'pointer', fontWeight: webSearch ? 600 : 400 }}
            >
              {webSearch ? '🔍 Web ON' : '🔍 Web OFF'}
            </button>
            <button
              onClick={() => setShowApiKey(v => !v)}
              style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.4)', fontSize: '12px', cursor: 'pointer' }}
            >
              Clé API
            </button>
          </div>
        </div>
        {showApiKey && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <input
              placeholder="Clé API Gemini (optionnelle si configurée côté serveur)"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              type="password"
              style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: '#e8e8f0', fontSize: '12px', outline: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', color: 'rgba(255,255,255,.3)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg,#4CC9F0,#7B2FBE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>✦</div>
            <div style={{ fontSize: '14px', textAlign: 'center', lineHeight: 1.6 }}>
              Posez vos questions sur les fournisseurs,<br />événements, priorités ou la gestion d'équipe.
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.role === 'user' ? 'rgba(255,77,109,.2)' : 'rgba(255,255,255,.05)',
              border: `1px solid ${m.role === 'user' ? 'rgba(255,77,109,.3)' : 'rgba(255,255,255,.08)'}`,
              color: '#e8e8f0', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 16px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.4)', fontSize: '20px', letterSpacing: '4px' }}>
              ···
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ display: 'flex', gap: '8px', marginTop: '16px', flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Écrivez votre message..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: '#e8e8f0', fontSize: '14px', outline: 'none' }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: input.trim() && !loading ? '#7B2FBE' : 'rgba(255,255,255,.07)', color: input.trim() && !loading ? '#fff' : 'rgba(255,255,255,.3)', fontWeight: 700, fontSize: '14px', cursor: input.trim() && !loading ? 'pointer' : 'default', transition: 'all .15s' }}
        >
          Envoyer
        </button>
      </form>
    </div>
  )
}
