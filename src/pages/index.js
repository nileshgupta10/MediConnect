import Link from 'next/link'
import { useEffect, useState } from 'react'

const TEAL  = '#0e9090'
const AMBER = '#f59e0b'
const DARK  = '#0f3460'

const HERO_IMG  = 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1400&q=80'
const PHARM_IMG = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80'
const STORE_IMG = 'https://images.unsplash.com/photo-1563213126-a4273aed2016?w=800&q=80'

const steps = [
  { n: '01', icon: '👤', title: 'Sign Up',         desc: 'Quick Google login. Choose your role — pharmacist or store owner.' },
  { n: '02', icon: '📋', title: 'Build Profile',   desc: 'Upload your license, set your location, get verified by our team.' },
  { n: '03', icon: '🔍', title: 'Browse & Apply',  desc: 'See verified jobs sorted by distance. Apply with one tap.' },
  { n: '04', icon: '🤝', title: 'Meet & Grow',     desc: 'Schedule interviews, manage your store, and build your career — all in one place.' },
]

const pharmFeatures = [
  '📍 Jobs sorted by distance from your home',
  '💰 Discover new earning opportunities nearby',
  '🩺 Solve day-to-day workplace challenges',
  '🎓 Upskill with training programs (coming soon)',
  '✅ Get verified — stand out to store owners',
  '📅 Direct interview scheduling, no middlemen',
]

const storeFeatures = [
  '⚡ Post a job in under 2 minutes',
  '✅ Hire only license-verified pharmacists',
  '📦 Track goods returns and inventory',
  '📅 Schedule interviews directly with applicants',
  '🔒 Contact shared only after confirmation',
  '🏅 Admin-verified store badge builds trust',
]

const features = [
  { icon: '💊', title: 'More Than Just Hiring',       desc: 'MediClan is built around the everyday realities of pharmacy work — from finding jobs to managing store operations.' },
  { icon: '📍', title: 'Hyper-Local Job Matching',    desc: 'Jobs sorted by distance. No more applying to openings across the city. Your next role could be around the corner.' },
  { icon: '✅', title: 'Verified on Both Sides',      desc: 'Every pharmacist is license-verified. Every store is admin-approved. A community built on trust.' },
  { icon: '📦', title: 'Store Operations Built In',   desc: 'Track goods returns, manage suppliers, and handle day-to-day store needs — without switching apps.' },
  { icon: '🎓', title: 'Training & Upskilling',       desc: 'We\'re building a home for pharmacists to grow their skills and earn more. Coming soon.' },
  { icon: '🤝', title: 'Community First',             desc: 'MediClan is built by people who understand pharmacy. We\'re here to solve real problems, not just post listings.' },
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
              India's home for<br />
              <span style={s.heroAccent}>pharmacy professionals</span>
            </h1>
            <p style={s.heroSub}>
              Hire verified pharmacists. Find jobs near home. Manage your store. Grow your career. — All in one place, built for India's pharmacy community.
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
      </section>

      {/* ── TRUST BAR ── */}
      <section style={s.trustBar}>
        <div style={s.trustInner}>
          {['🔒 Verified Professionals Only', '📍 Hyper-Local Job Matching', '📦 Store Operations Built In', '🎓 Training Coming Soon'].map((t, i) => (
            <div key={i} style={s.trustItem}>{t}</div>
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
      <section style={{ ...s.section, background: '#f0fdfd' }}>
        <div style={s.container}>
          <div style={s.splitInner}>
            <div style={s.splitImg} className="animate-slideLeft">
              <img src={PHARM_IMG} alt="Pharmacist" style={s.splitImgEl} loading="lazy" />
              <div style={s.splitBadge}>
                <span style={{ fontSize: 22 }}>💊</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>For Pharmacists</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Your career, your community</div>
                </div>
              </div>
            </div>
            <div style={s.splitText} className="animate-slideRight">
              <div style={s.sectionLabel}>Pharmacists</div>
              <h2 style={s.splitTitle}>More than a job board — a home for your career</h2>
              <p style={s.splitDesc}>
                MediClan understands the challenges pharmacists face every day. We're building tools to help you find work near home, earn more, solve workplace problems, and grow — all in one trusted platform.
              </p>
              <ul style={s.splitList}>
                {pharmFeatures.map((item, i) => (
                  <li key={i} style={s.splitItem}>
                    <span style={s.tick}>✓</span> {item}
                  </li>
                ))}
              </ul>
              <Link href="/simple-login">
                <button style={s.splitBtn}>Get Started →</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOR STORES ── */}
      <section style={s.section}>
        <div style={s.container}>
          <div style={{ ...s.splitInner, flexDirection: 'row-reverse' }}>
            <div style={s.splitImg} className="animate-slideRight">
              <img src={STORE_IMG} alt="Pharmacy Store" style={s.splitImgEl} loading="lazy" />
              <div style={{ ...s.splitBadge, background: AMBER }}>
                <span style={{ fontSize: 22 }}>🏪</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>For Store Owners</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Hire, manage, grow</div>
                </div>
              </div>
            </div>
            <div style={s.splitText} className="animate-slideLeft">
              <div style={{ ...s.sectionLabel, color: AMBER, background: '#fef3c7' }}>Store Owners</div>
              <h2 style={s.splitTitle}>Run your store smarter, hire with confidence</h2>
              <p style={s.splitDesc}>
                From finding the right pharmacist to tracking goods returns — MediClan handles the operational side of running a pharmacy store so you can focus on your customers.
              </p>
              <ul style={s.splitList}>
                {storeFeatures.map((item, i) => (
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
      <section style={{ ...s.section, background: '#f8fafc' }}>
        <div style={s.container}>
          <div style={s.sectionLabel}>Why MediClan</div>
          <h2 style={s.sectionTitle}>Built around real pharmacy life</h2>
          <p style={s.sectionSub}>We didn't build another job board. We built a platform that actually understands how pharmacies work.</p>
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

      {/* ── COMING SOON STRIP ── */}
      <section style={s.comingSoon}>
        <div style={s.container}>
          <div style={s.csInner}>
            <div style={s.csLeft}>
              <div style={s.csLabel}>What's Coming</div>
              <h2 style={s.csTitle}>MediClan is just getting started</h2>
              <p style={s.csDesc}>We're constantly building new tools to make pharmacy life easier for everyone in the community.</p>
            </div>
            <div style={s.csPills}>
              {['🎓 Training & Upskilling', '📊 Store Analytics Dashboard', '💬 Pharmacist Community Forum', '🏆 Performance Ratings', '📱 Native Mobile App'].map((item, i) => (
                <div key={i} style={s.csPill}>{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={s.ctaSection}>
        <div style={s.ctaInner}>
          <h2 style={s.ctaTitle}>Be part of India's pharmacy community</h2>
          <p style={s.ctaSub}>Join pharmacists and store owners who are already building something better together. It's free.</p>
          <Link href="/simple-login">
            <button style={s.ctaBtn}>Join MediClan Today →</button>
          </Link>
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
          <div style={{ display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="/privacy-policy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms-of-service" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms of Service</a>
            <a href="/disclaimer" style={{ color: '#94a3b8', textDecoration: 'none' }}>Disclaimer</a>
            <a href="/contact" style={{ color: '#94a3b8', textDecoration: 'none' }}>Contact Us</a>
          </div>
          <p style={s.footerCopy}>© 2025 MediClan. Built for India's pharmacy community.</p>
        </div>
      </footer>
    </div>
  )
}

const s = {
  page: { fontFamily: "'Nunito', 'Segoe UI', sans-serif", color: '#1a1a2e', overflowX: 'hidden' },

  hero: { position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  heroBg: { position: 'absolute', inset: 0, zIndex: 0 },
  heroBgImg: { width: '100%', height: '100%', objectFit: 'cover' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,52,96,0.93) 0%, rgba(14,144,144,0.78) 100%)' },
  heroContent: { position: 'relative', zIndex: 1, padding: '100px 24px 60px', maxWidth: 1100, margin: '0 auto', width: '100%' },
  heroLeft: { maxWidth: 620 },
  logoPill: { display: 'inline-flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', padding: '12px 24px', borderRadius: 50, marginBottom: 32 },
  heroLogo: { width: 56, height: 56, objectFit: 'contain' },
  heroLogoText: { color: 'white', fontWeight: 900, fontSize: 28, letterSpacing: 0.5 },
  heroTitle: { fontSize: 'clamp(30px, 6vw, 58px)', fontWeight: 900, color: 'white', lineHeight: 1.15, marginBottom: 20 },
  heroAccent: { color: '#5eead4' },
  heroSub: { fontSize: 17, color: 'rgba(255,255,255,0.82)', lineHeight: 1.8, marginBottom: 36, maxWidth: 520 },
  heroButtons: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 },
  heroBtn: { padding: '15px 32px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 50, fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(14,144,144,0.4)' },
  heroBtn2: { padding: '15px 32px', background: 'rgba(255,255,255,0.12)', color: 'white', border: '2px solid rgba(255,255,255,0.35)', borderRadius: 50, fontSize: 16, fontWeight: 800, cursor: 'pointer' },
  heroTagline: { color: 'rgba(255,255,255,0.45)', fontSize: 15, fontStyle: 'italic' },

  trustBar: { background: DARK, padding: '16px 24px' },
  trustInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  trustItem: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 700, padding: '6px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: 50 },

  section: { padding: '80px 24px', background: '#fff' },
  container: { maxWidth: 1100, margin: '0 auto' },
  sectionLabel: { display: 'inline-block', background: '#e0f7f7', color: '#0e9090', padding: '4px 14px', borderRadius: 50, fontSize: 12, fontWeight: 800, marginBottom: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, color: '#0f3460', marginBottom: 8 },
  sectionSub: { fontSize: 16, color: '#64748b', marginBottom: 44 },

  stepsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 },
  stepCard: { background: '#f8fafc', borderRadius: 20, padding: 28, textAlign: 'center', border: '1px solid #e2e8f0' },
  stepNumber: { fontSize: 11, fontWeight: 900, color: '#0e9090', letterSpacing: 2, marginBottom: 12 },
  stepIcon: { fontSize: 36, marginBottom: 12 },
  stepTitle: { fontSize: 17, fontWeight: 800, color: '#0f3460', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.65 },

  splitInner: { display: 'flex', gap: 60, alignItems: 'center', flexWrap: 'wrap' },
  splitImg: { flex: '1 1 300px', position: 'relative', minWidth: 280 },
  splitImgEl: { width: '100%', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.1)', objectFit: 'cover', maxHeight: 420, display: 'block' },
  splitBadge: { position: 'absolute', bottom: -16, left: 24, background: '#0e9090', color: 'white', padding: '12px 18px', borderRadius: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 8px 24px rgba(14,144,144,0.3)' },
  splitText: { flex: '1 1 300px', minWidth: 280 },
  splitTitle: { fontSize: 'clamp(20px, 3.5vw, 30px)', fontWeight: 900, color: '#0f3460', margin: '12px 0 14px' },
  splitDesc: { fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 22 },
  splitList: { listStyle: 'none', marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 },
  splitItem: { fontSize: 14, color: '#334155', display: 'flex', alignItems: 'center', gap: 10 },
  tick: { background: '#e0f7f7', color: '#0e9090', width: 22, height: 22, borderRadius: 50, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, flexShrink: 0 },
  splitBtn: { padding: '12px 28px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 50, fontSize: 14, fontWeight: 800, cursor: 'pointer' },

  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 36 },
  featureCard: { background: 'white', borderRadius: 20, padding: 26, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' },
  featureIcon: { fontSize: 30, marginBottom: 12 },
  featureTitle: { fontSize: 16, fontWeight: 800, color: '#0f3460', marginBottom: 8 },
  featureDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.7 },

  comingSoon: { padding: '70px 24px', background: 'linear-gradient(135deg, #0f3460 0%, #0e9090 100%)' },
  csInner: { display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap', maxWidth: 1100, margin: '0 auto' },
  csLeft: { flex: '1 1 280px' },
  csLabel: { display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 14px', borderRadius: 50, fontSize: 12, fontWeight: 800, marginBottom: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  csTitle: { fontSize: 'clamp(20px, 3.5vw, 30px)', fontWeight: 900, color: 'white', marginBottom: 10 },
  csDesc: { fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75 },
  csPills: { flex: '1 1 280px', display: 'flex', flexWrap: 'wrap', gap: 10 },
  csPill: { background: 'rgba(255,255,255,0.12)', color: 'white', padding: '10px 16px', borderRadius: 50, fontSize: 13, fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)' },

  ctaSection: { padding: '80px 24px', background: '#f0fdfd', textAlign: 'center' },
  ctaInner: { maxWidth: 640, margin: '0 auto' },
  ctaTitle: { fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, color: '#0f3460', marginBottom: 12 },
  ctaSub: { fontSize: 16, color: '#475569', marginBottom: 32, lineHeight: 1.75 },
  ctaBtn: { padding: '15px 36px', background: '#0e9090', color: 'white', border: 'none', borderRadius: 50, fontSize: 16, fontWeight: 900, cursor: 'pointer' },

  footer: { background: '#0f172a', padding: '36px 24px' },
  footerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
  footerBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  footerLogo: { width: 40, height: 40, objectFit: 'contain' },
  footerName: { color: 'white', fontWeight: 900, fontSize: 18 },
  footerTag: { color: '#64748b', fontSize: 12 },
  footerCopy: { color: '#475569', fontSize: 13 },
}