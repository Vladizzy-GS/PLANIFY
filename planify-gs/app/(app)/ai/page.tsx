export default function AIPage() {
  return (
    <div style={{ padding: '28px 32px', maxWidth: '720px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Planify</div>
      <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '26px', fontWeight: 800, color: '#e8e8f0', marginBottom: '8px' }}>
        Assistant IA <span style={{ color: '#7B2FBE' }}>✦</span>
      </h1>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)', marginBottom: '32px', lineHeight: 1.6 }}>
        Fournisseur, événement, priorité — posez vos questions en français naturel.
      </p>
      <div style={{ background: 'rgba(123,47,190,.06)', border: '1px solid rgba(123,47,190,.2)', borderRadius: '14px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#4CC9F0,#7B2FBE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>✦</div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>Prochainement disponible</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)', lineHeight: 1.5 }}>L'assistant IA sera disponible dans la prochaine phase. Configurez votre clé API Gemini dans les paramètres.</div>
        </div>
      </div>
    </div>
  )
}
