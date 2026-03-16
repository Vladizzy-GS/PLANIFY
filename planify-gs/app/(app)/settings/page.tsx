import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, display_name, employee_id').eq('id', user.id).single()

  return (
    <div style={{ padding: '28px 32px', maxWidth: '600px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Compte</div>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0', marginBottom: '28px' }}>Paramètres</h1>

      {/* Profile info */}
      <div style={{ background: '#13131f', borderRadius: '14px', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8f0' }}>Profil</span>
        </div>
        <div style={{ padding: '16px 18px', display: 'grid', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)' }}>Courriel</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>{user.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)' }}>Nom</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0' }}>{profile?.display_name ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)' }}>Rôle</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFB703', background: 'rgba(255,183,3,.1)', padding: '2px 8px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {profile?.role ?? 'employee'}
            </span>
          </div>
        </div>
      </div>

      {/* Assistant IA */}
      <div style={{ background: '#13131f', borderRadius: '14px', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B2FBE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8f0' }}>Clé API Gemini (Assistant IA)</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#7B2FBE', background: 'rgba(123,47,190,.1)', borderRadius: '8px', padding: '2px 8px', letterSpacing: '.04em' }}>GRATUIT</span>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)', marginBottom: '12px', lineHeight: 1.6 }}>
            Requis pour l'Assistant IA. Clé gratuite sur <strong style={{ color: 'rgba(255,255,255,.6)' }}>aistudio.google.com</strong> → Créer une clé API.
          </p>
          <div style={{ padding: '12px 14px', background: 'rgba(123,47,190,.06)', border: '1px solid rgba(123,47,190,.2)', borderRadius: '10px', fontSize: '13px', color: 'rgba(255,255,255,.4)' }}>
            Configuration disponible dans la prochaine phase.
          </div>
        </div>
      </div>
    </div>
  )
}
