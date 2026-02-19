import { useState } from 'react'
import { supabase } from '../lib/supabase'

const LOGIN_IMG = 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1000&q=80'

export default function SimpleLogin() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `https://mediclan.in/role-select`,
      },
    })

    if (error) {
      setMessage('Login failed: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      {/* LEFT */}
      <div style={s.left}>
        <div style={s.leftInner}>
          <div style={s.logoRow}>
            <img src="/brand/mediclan-logo.png" alt="MediClan" style={s.logo} />
            <span style={s.brandName}>MediClan</span>
          </div>

          <h1 style={s.title}>Welcome 👋</h1>
          <p style={s.subtitle}>Sign in to find pharmacy jobs near you, or post an opening for your store.</p>

          <button style={s.googleBtn} onClick={handleGoogleLogin} disabled={loading}>
            {loading ? (
              <span style={{ color: '#64748b' }}>Signing in…</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {message && <p style={s.error}>{message}</p>}

          <div style={s.divider}><span style={s.dividerText}>Why MediClan?</span></div>

          <div style={s.features}>
            {[
              { icon: '📍', text: 'Find jobs near you — sorted by distance' },
              { icon: '✅', text: 'Only verified pharmacists and stores' },
              { icon: '📅', text: 'Direct interview scheduling, no middlemen' },
              { icon: '🔒', text: 'Your contact shared only after confirmation' },
              { icon: '⚡', text: 'Get hired in days, not weeks' },
            ].map((f, i) => (
              <div key={i} style={s.featureRow}>
                <span style={s.fIcon}>{f.icon}</span>
                <span style={s.fText}>{f.text}</span>
              </div>
            ))}
          </div>

          <p style={s.footerNote}>By signing in you agree to our terms of service and privacy policy.</p>
        </div>
      </div>

      {/* RIGHT */}
      <div style={s.right} className="login-right">
        <img src={LOGIN_IMG} alt="Pharmacy" style={s.rightImg} />
        <div style={s.rightOverlay} />
        <div style={s.rightContent}>
          <div style={s.quoteBox}>
            <div style={s.quoteText}>"MediClan helped me find a job 2km from home in just 3 days."</div>
            <div style={s.quoteAuthor}>— Priya S., B.Pharm, Pune</div>
          </div>
          <div style={s.taglineBox}>
            <div style={s.taglineBig}>Relations,</div>
            <div style={s.taglineBig}>over the counter.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'Nunito', 'Segoe UI', sans-serif" },
  left: { flex: '0 0 420px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: '#fff', overflowY: 'auto' },
  leftInner: { width: '100%', maxWidth: 360 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 },
  logo: { width: 42, height: 42, objectFit: 'contain' },
  brandName: { fontSize: 22, fontWeight: 900, color: '#0f3460' },
  title: { fontSize: 28, fontWeight: 900, color: '#0f3460', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 },
  googleBtn: { width: '100%', padding: '13px 20px', background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#1a1a2e', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  error: { marginTop: 12, fontSize: 13, color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: 8 },
  divider: { margin: '24px 0 16px' },
  dividerText: { display: 'block', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 1.2, textTransform: 'uppercase', borderTop: '1px solid #f1f5f9', paddingTop: 14 },
  features: { display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 24 },
  featureRow: { display: 'flex', alignItems: 'flex-start', gap: 11 },
  fIcon: { fontSize: 17, flexShrink: 0, marginTop: 1 },
  fText: { fontSize: 14, color: '#334155', lineHeight: 1.5 },
  footerNote: { fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 },
  right: { flex: 1, position: 'relative', display: 'none', minHeight: '100vh' },
  rightImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  rightOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(15,52,96,0.88) 0%, rgba(14,144,144,0.72) 100%)' },
  rightContent: { position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 48, gap: 32 },
  quoteBox: {},
  quoteText: { fontSize: 20, fontWeight: 700, color: 'white', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 10 },
  quoteAuthor: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  taglineBox: { borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 24 },
  taglineBig: { fontSize: 32, fontWeight: 900, color: 'white', lineHeight: 1.2 },
}