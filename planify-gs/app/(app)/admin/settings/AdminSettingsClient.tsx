'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminSettingsClient({ currentPin }: { currentPin: string }) {
  const supabase = createClient()
  const [pin, setPin] = useState(currentPin)
  const [pinSaved, setPinSaved] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState('')
  const [err, setErr] = useState('')

  async function handleSavePin(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) { setErr('Le PIN doit avoir au moins 4 chiffres.'); return }
    const { error } = await supabase.from('app_settings').update({ value: pin }).eq('key', 'admin_pin')
    if (error) { setErr('Erreur lors de la sauvegarde.'); return }
    setPinSaved(true)
    setTimeout(() => setPinSaved(false), 2000)
    setErr('')
  }

  async function handleReset(type: 'events' | 'all') {
    const label = type === 'all' ? 'TOUTES les données (événements, priorités, alertes, fournisseurs)' : 'tous les événements'
    if (!confirm(`Supprimer ${label} ? Cette action est irréversible.`)) return
    setResetting(true)
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (res.ok) {
      setResetDone(type === 'all' ? 'Toutes les données ont été supprimées.' : 'Événements supprimés.')
      setTimeout(() => setResetDone(''), 3000)
    }
    setResetting(false)
  }

  const inp: React.CSSProperties = { padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: '#e8e8f0', fontSize: '14px', outline: 'none', letterSpacing: '0.2em', width: '160px' }

  return (
    <div style={{ padding: '24px 28px', color: '#e8e8f0', maxWidth: '600px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0' }}>Paramètres système</h1>
      </div>

      {/* PIN */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>PIN administrateur</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', marginBottom: '14px' }}>Utilisé pour accéder au panneau d'administration depuis l'application.</div>
        <form onSubmit={handleSavePin} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            style={inp}
          />
          <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#FF4D6D', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            {pinSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
        </form>
        {err && <div style={{ fontSize: '12px', color: '#FF4D6D', marginTop: '8px' }}>{err}</div>}
      </div>

      {/* Danger zone */}
      <div style={{ background: 'rgba(255,77,109,.04)', border: '1px solid rgba(255,77,109,.2)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#FF4D6D', marginBottom: '4px' }}>Zone dangereuse</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', marginBottom: '16px' }}>Ces actions sont irréversibles. Procédez avec précaution.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>Supprimer tous les événements</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)' }}>Efface le planning de tous les employés.</div>
            </div>
            <button
              onClick={() => handleReset('events')}
              disabled={resetting}
              style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid rgba(255,77,109,.4)', background: 'transparent', color: '#FF4D6D', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            >
              Réinitialiser
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>Réinitialisation complète</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)' }}>Supprime événements, priorités, alertes et fournisseurs.</div>
            </div>
            <button
              onClick={() => handleReset('all')}
              disabled={resetting}
              style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid rgba(255,77,109,.4)', background: 'rgba(255,77,109,.1)', color: '#FF4D6D', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            >
              Tout effacer
            </button>
          </div>
        </div>

        {resetDone && <div style={{ marginTop: '10px', fontSize: '13px', color: '#06D6A0' }}>✓ {resetDone}</div>}
      </div>
    </div>
  )
}
