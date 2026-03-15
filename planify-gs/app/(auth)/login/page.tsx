'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginErr, setLoginErr] = useState('')

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regPass2, setRegPass2] = useState('')
  const [regErr, setRegErr] = useState('')

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/schedule` },
    })
    if (error) setLoginErr(error.message)
    setLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginErr('')
    if (!loginEmail || !loginPass) { setLoginErr('Veuillez remplir tous les champs.'); return }
    if (!loginEmail.includes('@')) { setLoginErr('Courriel invalide.'); return }
    if (loginPass.length < 4) { setLoginErr('Mot de passe trop court.'); return }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPass,
    })
    if (error) {
      setLoginErr(error.message === 'Invalid login credentials'
        ? 'Courriel ou mot de passe incorrect.'
        : error.message)
    } else {
      router.push('/schedule')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegErr('')
    if (!regName || !regEmail || !regPass || !regPass2) { setRegErr('Veuillez remplir tous les champs.'); return }
    if (!regEmail.includes('@')) { setRegErr('Courriel invalide.'); return }
    if (regPass.length < 8) { setRegErr('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (regPass !== regPass2) { setRegErr('Les mots de passe ne correspondent pas.'); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPass,
      options: { data: { full_name: regName } },
    })
    if (error) {
      setRegErr(error.message)
    } else {
      setRegErr('')
      alert('Compte créé. Vérifiez votre courriel pour confirmer.')
      setTab('login')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.09)',
    borderRadius: '10px',
    color: '#e8e8f0',
    fontSize: '14px',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: 'rgba(255,255,255,.38)',
    letterSpacing: '.09em',
    textTransform: 'uppercase',
    marginBottom: '7px',
  }

  return (
    <div style={{ width: '100%', maxWidth: '420px', padding: '24px', position: 'relative' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'splLogoIn .75s cubic-bezier(.22,1,.36,1) both' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, marginBottom: '16px' }}>
          <div style={{ width: '3px', height: '42px', background: 'linear-gradient(180deg,#FF4D6D,#F77F00)', borderRadius: '2px', marginRight: '14px', animation: 'splFadeIn .5s .5s both' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#FF4D6D', letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px', animation: 'splFadeUp .5s .15s ease both' }}>
              Gestion équipe
            </div>
            <div style={{ fontSize: '36px', fontFamily: "'Syne', sans-serif", fontWeight: 800, color: '#e8e8f0', lineHeight: 1, letterSpacing: '-.01em' }}>
              Planify <span style={{ color: '#FF4D6D' }}>·</span>{' '}
              <span style={{ color: 'rgba(255,255,255,.28)', fontWeight: 600, fontSize: '30px' }}>GS</span>
            </div>
          </div>
        </div>
        <div style={{ height: '1px', width: '100%', background: 'linear-gradient(90deg,transparent,rgba(255,77,109,.4),rgba(247,127,0,.4),transparent)', marginTop: '4px', animation: 'splFadeIn .8s .4s ease both' }} />
      </div>

      {/* Card */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '22px', padding: '28px', animation: 'splFadeUp .6s .3s ease both', backdropFilter: 'blur(12px)' }}>

        {/* Google button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '13px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.11)', background: 'rgba(255,255,255,.04)', color: '#e8e8f0', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px' }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuer avec Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,.07)' }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.28)', fontWeight: 500, letterSpacing: '.04em' }}>ou</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,.07)' }} />
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,.04)', borderRadius: '10px', padding: '3px', marginBottom: '22px' }}>
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px', borderRadius: '8px', border: 'none',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: tab === t ? 'rgba(255,77,109,.18)' : 'transparent',
                color: tab === t ? '#FF4D6D' : 'rgba(255,255,255,.35)',
              }}
            >
              {t === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Courriel</label>
              <input
                type="email"
                placeholder="vous@exemple.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(255,77,109,.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.09)')}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(255,77,109,.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.09)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', padding: '4px' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPass
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>
            {loginErr && <div style={{ fontSize: '13px', color: '#FF4D6D', marginBottom: '12px', textAlign: 'center' }}>{loginErr}</div>}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Nom complet</label>
              <input
                type="text"
                placeholder="Jean Tremblay"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(255,77,109,.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.09)')}
              />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Courriel</label>
              <input
                type="email"
                placeholder="vous@exemple.com"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(255,77,109,.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.09)')}
              />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 8 caractères"
                  value={regPass}
                  onChange={e => setRegPass(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(255,77,109,.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.09)')}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', padding: '4px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPass ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Confirmer le mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass2 ? 'text' : 'password'}
                  placeholder="Répéter le mot de passe"
                  value={regPass2}
                  onChange={e => setRegPass2(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(255,77,109,.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.09)')}
                />
                <button type="button" onClick={() => setShowPass2(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', padding: '4px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPass2 ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
              </div>
            </div>
            {regErr && <div style={{ fontSize: '13px', color: '#FF4D6D', marginBottom: '12px', textAlign: 'center' }}>{regErr}</div>}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#FF4D6D,#F77F00)', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '12px', color: 'rgba(255,255,255,.18)', animation: 'splFadeUp .6s .5s ease both' }}>
        © 2026 Planify · GS — Tous droits réservés
      </div>
    </div>
  )
}
