'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#e8e8f0', padding: '24px', textAlign: 'center' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,77,109,.15)', border: '1px solid rgba(255,77,109,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⚠</div>
      <div style={{ fontSize: '20px', fontWeight: 700 }}>Une erreur est survenue</div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', maxWidth: '400px' }}>{error.message || 'Erreur inattendue. Veuillez réessayer.'}</div>
      <button onClick={reset} style={{ marginTop: '8px', padding: '9px 20px', borderRadius: '10px', background: '#FF4D6D', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}>
        Réessayer
      </button>
    </div>
  )
}
