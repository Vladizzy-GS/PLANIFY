import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#e8e8f0' }}>
      <div style={{ fontSize: '72px', fontWeight: 800, fontFamily: 'var(--font-syne)', color: '#FF4D6D', lineHeight: 1 }}>404</div>
      <div style={{ fontSize: '18px', fontWeight: 600 }}>Page introuvable</div>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)' }}>Cette page n'existe pas ou a été déplacée.</div>
      <Link href="/schedule" style={{ marginTop: '8px', padding: '9px 20px', borderRadius: '10px', background: '#FF4D6D', color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
        Retour au planning
      </Link>
    </div>
  )
}
