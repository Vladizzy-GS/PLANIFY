'use client'

type Props = {
  open: boolean
  message: string
  detail?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, message, detail, confirmLabel = 'Confirmer', danger = false, onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <div onClick={onCancel} className="modal-overlay" style={{ zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} className="modal-card" style={{ width: '360px', padding: '28px 28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: danger ? 'rgba(255,77,109,.15)' : 'rgba(255,183,3,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {danger ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D6D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB703" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{message}</div>
            {detail && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.5 }}>{detail}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '9px', borderRadius: '9px', border: '1px solid var(--border-normal)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >Annuler</button>
          <button
            onClick={() => { onConfirm(); onCancel() }}
            style={{ flex: 1, padding: '9px', borderRadius: '9px', border: 'none', background: danger ? '#FF4D6D' : '#FFB703', color: danger ? '#fff' : '#0a0a12', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
