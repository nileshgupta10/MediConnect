import Link from 'next/link'
import { useEffect, useState } from 'react'

const TEAL  = '#0e9090'
const AMBER = '#f59e0b'
const DARK  = '#0f3460'

// Unsplash License — free forever, no attribution required
const HERO_IMG  = 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1400&q=80'
const PHARM_IMG = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80'
const STORE_IMG = 'https://images.unsplash.com/photo-1563213126-a4273aed2016?w=800&q=80'
const TEAM_IMG  = 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&q=80'

const stats = [
  { number: '500+',  label: 'Verified Pharmacies' },
  { number: '2000+', label: 'Pharmacists Registered' },
  { number: '98%',   label: 'Successful Matches' },
]

const steps = [
  { n: '01', icon: '👤', title: 'Sign Up',       desc: 'Quick Google login. Choose your role — pharmacist or store owner.' },
  { n: '02', icon: '📋', title: 'Build Profile', desc: 'Upload your license, set your location, describe your experience.' },
  { n: '03', icon: '🔍', title: 'Browse & Apply',desc: 'See jobs sorted by distance. Apply with one tap.' },
  { n: '04', icon: '🤝', title: 'Meet & Hire',   desc: 'Confirm appointments directly. No middlemen involved.' },
]

const features = [
  { icon: '📍', title: 'Find Jobs Near You',        desc: 'Distance-sorted listings show the closest openings first. No applying to jobs 50km away.' },
  { icon: '✅', title: 'Verified Professionals',    desc: 'Every pharmacist is license-verified. Every store is admin-approved. No fake profiles.' },
  { icon: '📅', title: 'Direct Appointments',       desc: 'Store owners schedule interviews directly. Pharmacists confirm with one tap.' },
  { icon: '🔒', title: 'Privacy Protected',         desc: 'Phone numbers only shared after appointment is confirmed.' },
  { icon: '⚡', title: 'Hire in Days, Not Weeks',   desc: 'Streamlined process from application to interview in under 48 hours.' },
  { icon: '🏅', title: 'Quality Assured',           desc: 'Admin manually reviews every store and pharmacist before they go live.' },
]

export default function HomePage() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 50) }, [])

  return (
    <div style={s.page}>

      {/* ── HERO ── */}
      <section style={s.hero}>
        <div style={s.heroBg}>
          <img src={HERO_IMG} alt="" style={s.heroBgImg} />
          <div style={s.heroOverlay} />
        </div>

        <div style={s.heroContent}>
          <div className={visible ? 'animate-slideLeft' : ''} style={s.heroLeft}>

            <div style={s.logoPill}>
              <img src="/brand/mediclan-logo.png" alt="MediClan" style={s.heroLogo} />
              <span style={s.heroLogoText}>MediClan</span>
            </div>

            <h1 style={s.heroTitle}>
              India's friendliest<br />
              <span style={s.heroAccent}>pharmacy jobs</span><br />
              platform
            </h1>

            <p style={s.heroSub}>
              Connecting verified pharmacists with trusted stores — across every city, every street.
            </p>

            <div style={s.heroButtons}>
              <Link href="/simple-login">
                <button style={s.heroBtn}>Find Jobs Near Me →</button>
              </Link>
              <Link href="/simple-login">
                <button style={s.heroBtn2}>Post a Job Opening</button>
              </Link>
            </div>

            <p style={s.heroTagline}>"Relations, over the counter."</p>
          </div>
        </div>

        <div style={s.statRow}>
          {stats.map((st, i) => (
            <div key={i} className={`animate-fadeInUp delay-${i + 2}`} style={s.statPill}>
              <span style={s.statNumber}>{st.number}</span>
              <span style={s.statLabel}>{st.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={s.section}>
        <div style={s.container}>
          <div style={s.sectionLabel}>Simple Process</div>
          <h2 style={s.sectionTitle}>How MediClan Works</h2>
          <p style={s.sectionSub}>From signup to hired — in just a few steps</p>
          <div style={s.stepsRow}>
            {steps.map((step, i) => (
              <div key={i} className={`animate-fadeInUp delay-${i + 1}`} style={s.stepCard}>
                <div style={s.stepNumber}>{step.n}</div>
                <div style={s.stepIcon}>{step.icon}</div>
                <h3 style={s.stepTitle}>{step.title}</h3>
                <p style={s.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR PHARMACISTS ── */}
      <section style={s.section}>
        <div style={s.container}>
          <div style={s.splitInner}>
            <div style={s.splitImg} className="animate-slideLeft">
              <img src={PHARM_IMG} alt="Pharmacist" style={s.splitImgEl} loading="lazy" />
              <div style={s.splitBadge}>
                <span style={{ fontSize: 22 }}>💊</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>For Pharmacists</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Find work near home</div>
                </div>
              </div>
            </div>
            <div style={s.splitText} className="animate-slideRight">
              <div style={s.sectionLabel}>Pharmacists</div>
              <h2 style={s.splitTitle}>Your next job is around the corner</h2>
              <p style={s.splitDesc}>
                Stop sending CVs into the void. MediClan shows you verified openings sorted by distance — your next job could be a 5-minute walk away.
              </p>
              <ul style={s.splitList}>
                {['Distance-sorted job listings', 'One-tap applications', 'Direct appointment scheduling', 'License verification badge'].map((item, i) => (
                  <li key={i} style={s.splitItem}>
                    <span style={s.tick}>✓</span> {item}
                  </li>
                ))}
              </ul>
              <Link href="/simple-login">
                <button style={s.splitBtn}>Find Jobs Near Me →</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOR STORES ── */}
      <section style={{ ...s.section, background: '#f0fdfd' }}>
        <div style={s.container}>
          <div style={{ ...s.splitInner, flexDirection: 'row-reverse' }}>
            <div style={s.splitImg} className="animate-slideRight">
              <img src={STORE_IMG} alt="Pharmacy Store" style={s.splitImgEl} loading="lazy" />
              <div style={{ ...s.splitBadge, background: AMBER }}>
                <span style={{ fontSize: 22 }}>🏪</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>For Store Owners</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Hire with confidence</div>
                </div>
              </div>
            </div>
            <div style={s.splitText} className="animate-slideLeft">
              <div style={{ ...s.sectionLabel, color: AMBER, background: '#fef3c7' }}>Store Owners</div>
              <h2 style={s.splitTitle}>Find verified pharmacists fast</h2>
              <p style={s.splitDesc}>
                Post a job in under 2 minutes. Get applications from license-verified pharmacists nearby. Review, shortlist, and schedule — all in one place.
              </p>
              <ul style={s.splitList}>
                {['Post jobs in 2 minutes', 'View license documents', 'Schedule interviews directly', 'Admin-verified applicants only'].map((item, i) => (
                  <li key={i} style={s.splitItem}>
                    <span style={{ ...s.tick, background: '#fef3c7', color: AMBER }}>✓</span> {item}
                  </li>
                ))}
              </ul>
              <Link href="/simple-login">
                <button style={{ ...s.splitBtn, background: AMBER }}>Post a Job Opening →</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={s.section}>
        <div style={s.container}>
          <div style={s.sectionLabel}>Why MediClan</div>
          <h2 style={s.sectionTitle}>Everything you need, nothing you don't</h2>
          <div style={s.featuresGrid}>
            {features.map((f, i) => (
              <div key={i} className={`animate-fadeInUp delay-${i + 1}`} style={s.featureCard}>
                <div style={s.featureIcon}>{f.icon}</div>
                <h3 style={s.featureTitle}>{f.title}</h3>
                <p style={s.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section style={s.trustSection}>
        <div style={s.container}>
          <div style={s.splitInner}>
            <div style={s.splitText}>
              <div style={{ ...s.sectionLabel, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.15)' }}>
                Built for India
              </div>
              <h2 style={{ ...s.splitTitle, color: 'white' }}>Made by pharmacists,<br />for pharmacists</h2>
              <p style={{ ...s.splitDesc, color: 'rgba(255,255,255,0.8)' }}>
                MediClan was built to solve the real hiring problem that Indian pharmacy owners face every day — finding reliable, qualified staff quickly. We understand the counter, the shift, and the software.
              </p>
              <Link href="/simple-login">
                <button style={s.trustBtn}>Join MediClan Today →</button>
              </Link>
            </div>
            <div style={{ ...s.splitImg }} className="animate-float">
              <img src={TEAM_IMG} alt="Healthcare team" style={{ ...s.splitImgEl, maxHeight: 360 }} loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerBrand}>
            <img src="/brand/mediclan-logo.png" alt="MediClan" style={s.footerLogo} />
            <div>
              <div style={s.footerName}>MediClan</div>
              <div style={s.footerTag}>Relations, over the counter.</div>
            </div>
          </div>
          <p style={s.footerCopy}>© 2025 MediClan. Built for India's pharmacy community.</p>
        </div>
      </footer>
    </div>
  )
}

const s = {
  page: { fontFamily: "'Nunito', 'Segoe UI', sans-serif", color: '#1a1a2e', overflowX: 'hidden' },

  // HERO
  hero: { position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  heroBg: { position: 'absolute', inset: 0, zIndex: 0 },
  heroBgImg: { width: '100%', height: '100%', objectFit: 'cover' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,52,96,0.93) 0%, rgba(14,144,144,0.78) 100%)' },
  heroContent: { position: 'relative', zIndex: 1, padding: '100px 24px 40px', maxWidth: 1100, margin: '0 auto', width: '100%' },
  heroLeft: { maxWidth: 580 },
  logoPill: { display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', padding: '8px 18px', borderRadius: 50, marginBottom: 28 },
  heroLogo: { width: 38, height: 38, objectFit: 'contain' },
  heroLogoText: { color: 'white', fontWeight: 900, fontSize: 18 },
  heroTitle: { fontSize: 'clamp(30px, 6vw, 58px)', fontWeight: 900, color: 'white', lineHeight: 1.15, marginBottom: 20 },
  heroAccent: { color: '#5eead4' },
  heroSub: { fontSize: 17, color: 'rgba(255,255,255,0.82)', lineHeight: 1.75, marginBottom: 32, maxWidth: 460 },
  heroButtons: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 },
  heroBtn: { padding: '14px 28px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 50, fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(14,144,144,0.4)' },
  heroBtn2: { padding: '14px 28px', background: 'rgba(255,255,255,0.12)', color: 'white', border: '2px solid rgba(255,255,255,0.35)', borderRadius: 50, fontSize: 15, fontWeight: 800, cursor: 'pointer' },
  heroTagline: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontStyle: 'italic' },
  statRow: { position: 'relative', zIndex: 1, display: 'flex', gap: 16, padding: '0 24px 48px', maxWidth: 1100, margin: '0 auto', width: '100%', flexWrap: 'wrap' },
  statPill: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 16, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 130 },
  statNumber: { fontSize: 28, fontWeight: 900, color: 'white' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 600 },

  // SECTIONS
  section: { padding: '80px 24px', background: '#fff' },
  container: { maxWidth: 1100, margin: '0 auto' },
  sectionLabel: { display: 'inline-block', background: '#e0f7f7', color: '#0e9090', padding: '4px 14px', borderRadius: 50, fontSize: 12, fontWeight: 800, marginBottom: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, color: '#0f3460', marginBottom: 8 },
  sectionSub: { fontSize: 16, color: '#64748b', marginBottom: 44 },

  // STEPS
  stepsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 },
  stepCard: { background: '#f8fafc', borderRadius: 20, padding: 28, textAlign: 'center', border: '1px solid #e2e8f0' },
  stepNumber: { fontSize: 11, fontWeight: 900, color: '#0e9090', letterSpacing: 2, marginBottom: 12 },
  stepIcon: { fontSize: 36, marginBottom: 12 },
  stepTitle: { fontSize: 17, fontWeight: 800, color: '#0f3460', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.65 },

  // SPLIT
  splitInner: { display: 'flex', gap: 60, alignItems: 'center', flexWrap: 'wrap' },
  splitImg: { flex: '1 1 300px', position: 'relative', minWidth: 280 },
  splitImgEl: { width: '100%', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.1)', objectFit: 'cover', maxHeight: 420, display: 'block' },
  splitBadge: { position: 'absolute', bottom: -16, left: 24, background: '#0e9090', color: 'white', padding: '12px 18px', borderRadius: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 8px 24px rgba(14,144,144,0.3)' },
  splitText: { flex: '1 1 300px', minWidth: 280 },
  splitTitle: { fontSize: 'clamp(20px, 3.5vw, 32px)', fontWeight: 900, color: '#0f3460', margin: '12px 0 14px' },
  splitDesc: { fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 22 },
  splitList: { listStyle: 'none', marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 },
  splitItem: { fontSize: 14, color: '#334155', display: 'flex', alignItems: 'center', gap: 10 },
  tick: { background: '#e0f7f7', color: '#0e9090', width: 22, height: 22, borderRadius: 50, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, flexShrink: 0 },
  splitBtn: { padding: '12px 26px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 50, fontSize: 14, fontWeight: 800, cursor: 'pointer' },

  // FEATURES
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 36 },
  featureCard: { background: '#f8fafc', borderRadius: 20, padding: 26, border: '1px solid #e2e8f0' },
  featureIcon: { fontSize: 30, marginBottom: 12 },
  featureTitle: { fontSize: 16, fontWeight: 800, color: '#0f3460', marginBottom: 8 },
  featureDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.7 },

  // TRUST
  trustSection: { padding: '80px 24px', background: 'linear-gradient(135deg, #0f3460 0%, #0e9090 100%)' },
  trustBtn: { padding: '12px 26px', background: 'white', color: '#0e9090', border: 'none', borderRadius: 50, fontSize: 14, fontWeight: 900, cursor: 'pointer' },

  // FOOTER
  footer: { background: '#0f172a', padding: '36px 24px' },
  footerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
  footerBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  footerLogo: { width: 36, height: 36, objectFit: 'contain' },
  footerName: { color: 'white', fontWeight: 900, fontSize: 17 },
  footerTag: { color: '#64748b', fontSize: 12 },
  footerCopy: { color: '#475569', fontSize: 13 },
}