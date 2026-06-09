import Link from 'next/link'
import { useEffect, useState } from 'react'

const TEAL  = '#0e9090'
const DARK  = '#0f3460'
const AMBER = '#d97706'

const coreFeatures = [
  {
    icon: '🧾',
    title: 'Bill Converter',
    desc: 'Convert distributor bills directly into your software format. No manual entry, no errors.',
  },
  {
    icon: '📦',
    title: 'Inward Stock',
    desc: 'Record and track incoming goods with barcode support. Full purchase history per supplier.',
  },
  {
    icon: '👥',
    title: 'Staff Hiring',
    desc: 'Post jobs and connect with license-verified pharmacists near your store. No middlemen.',
  },
]

const billFeatureTags = [
  '✓ GST accurate',
  '✓ Expiry auto-formatted',
  '✓ Credit notes handled',
  '✓ Multiple distributors',
  '✓ No manual entry',
]

const hiringFeatures = [
  { icon: '🪪', title: 'License verified', desc: 'Every applicant\'s pharmacy license is verified before they can apply.' },
  { icon: '📍', title: 'Hyper-local matching', desc: 'Jobs sorted by distance. Pharmacists near your store see your listing first.' },
  { icon: '📅', title: 'Direct interviews', desc: 'Schedule interviews and share contact details directly — after you confirm interest.' },
  { icon: '🛡️', title: 'Admin-verified store', desc: 'Get your store verified to build trust with applicants.' },
]

const comingFeatures = [
  '📊 Store analytics dashboard',
  '↩️ Goods returns management',
  '💬 Pharmacist community forum',
  '📱 Native mobile app',
  '🏆 Performance ratings',
]

export default function HomePage() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 50) }, [])

  return (
    <div style={s.page}>

      {/* ── NAV ── */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.navBrand}>
            <img src="/brand/mediclan-logo.png" alt="MediClan" style={s.navLogo} />
            <span style={s.navName}>MediClan</span>
          </div>
          <div style={s.navLinks}>
            <Link href="/simple-login">
              <button style={s.navLoginBtn}>Login</button>
            </Link>
            <Link href="/simple-login">
              <button style={s.navSignupBtn}>Sign up free</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroBadge}>
            <span style={s.heroBadgeDot} />
            Built for India's pharmacy stores
          </div>
          <h1 style={s.heroTitle}>
            Run your pharmacy store<br />
            <span style={s.heroAccent}>smarter, every day</span>
          </h1>
          <p style={s.heroSub}>
            Convert distributor bills to your software format, manage inward stock,
            and hire verified pharmacists — all in one platform.
          </p>
          <div style={s.heroButtons}>
            <Link href="/simple-login">
              <button style={s.heroPrimaryBtn}>Get started free →</button>
            </Link>
            <Link href="/simple-login">
              <button style={s.heroSecondaryBtn}>See how it works</button>
            </Link>
          </div>
          <p style={s.heroTagline}>"Relations, over the counter."</p>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div style={s.trustBar}>
        {['✅ Distributor bills converted instantly', '🔒 License-verified pharmacists', '📍 Hyper-local job matching', '🇮🇳 Built for India'].map((t, i) => (
          <span key={i} style={s.trustItem}>{t}</span>
        ))}
      </div>

      {/* ── CORE FEATURES ── */}
      <section style={s.section}>
        <div style={s.container}>
          <div style={s.sectionLabel}>What MediClan does</div>
          <h2 style={s.sectionTitle}>Everything your store needs</h2>
          <p style={s.sectionSub}>From bill conversion to staff hiring — built around the daily realities of running a pharmacy store.</p>
          <div style={s.grid3}>
            {coreFeatures.map((f, i) => (
              <div key={i} style={{ ...s.featureCard, ...(i === 0 ? s.featureCardPrimary : {}) }}>
                <div style={s.featureIcon}>{f.icon}</div>
                <h3 style={s.featureTitle}>{f.title}</h3>
                <p style={s.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BILL CONVERTER SPOTLIGHT ── */}
      <section style={{ ...s.section, background: '#f0fdfd' }}>
        <div style={s.container}>
          <div style={s.sectionLabel}>Bill Converter</div>
          <h2 style={s.sectionTitle}>From distributor bill to your software format in seconds</h2>
          <p style={s.sectionSub}>
            Upload your distributor's bill. MediClan converts it into the exact format your pharmacy software needs —
            ready to import, with zero manual data entry.
          </p>
          <div style={s.billFlow}>
            <div style={s.billFlowStep}>
              <div style={s.billFlowIcon}>📄</div>
              <div style={s.billFlowLabel}>Upload distributor bill</div>
              <div style={s.billFlowSub}>CSV format from any distributor</div>
            </div>
            <div style={s.billFlowArrow}>→</div>
            <div style={s.billFlowStep}>
              <div style={s.billFlowIcon}>⚙️</div>
              <div style={s.billFlowLabel}>Auto-converted</div>
              <div style={s.billFlowSub}>GST, expiry, batches — all handled</div>
            </div>
            <div style={s.billFlowArrow}>→</div>
            <div style={s.billFlowStep}>
              <div style={s.billFlowIcon}>✅</div>
              <div style={s.billFlowLabel}>Import to your software</div>
              <div style={s.billFlowSub}>Ready to use, no manual entry</div>
            </div>
          </div>
          <div style={s.billTags}>
            {billFeatureTags.map((tag, i) => (
              <span key={i} style={s.billTag}>{tag}</span>
            ))}
          </div>
          <Link href="/simple-login">
            <button style={s.tealBtn}>Try Bill Converter →</button>
          </Link>
        </div>
      </section>

      {/* ── HIRING SECTION ── */}
      <section style={s.section}>
        <div style={s.container}>
          <div style={{ ...s.sectionLabel, background: '#fef3c7', color: AMBER }}>For store owners</div>
          <h2 style={s.sectionTitle}>Hire pharmacists you can trust</h2>
          <p style={s.sectionSub}>
            Every pharmacist on MediClan is license-verified. Post a job in 2 minutes
            and connect directly — no agency fees, no middlemen.
          </p>
          <div style={s.grid2}>
            {hiringFeatures.map((f, i) => (
              <div key={i} style={s.hiringCard}>
                <span style={s.hiringIcon}>{f.icon}</span>
                <div>
                  <h3 style={s.hiringTitle}>{f.title}</h3>
                  <p style={s.hiringDesc}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/simple-login">
            <button style={{ ...s.tealBtn, background: AMBER, marginTop: 28 }}>Post a job opening →</button>
          </Link>
        </div>
      </section>

      {/* ── COMING SOON ── */}
      <section style={{ ...s.section, background: `linear-gradient(135deg, ${DARK} 0%, #0e7070 100%)` }}>
        <div style={s.container}>
          <div style={s.csInner}>
            <div style={s.csLeft}>
              <div style={s.csLabel}>Coming soon</div>
              <h2 style={{ ...s.sectionTitle, color: 'white' }}>MediClan is just getting started</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.75 }}>
                We're constantly building new tools to make pharmacy store operations easier.
              </p>
            </div>
            <div style={s.csPills}>
              {comingFeatures.map((item, i) => (
                <span key={i} style={s.csPill}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={s.ctaSection}>
        <div style={s.ctaInner}>
          <h2 style={s.ctaTitle}>Ready to run your store smarter?</h2>
          <p style={s.ctaSub}>Free to use. No credit card. Built for Indian pharmacy stores.</p>
          <Link href="/simple-login">
            <button style={s.tealBtn}>Create your free account →</button>
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
          <div style={s.footerLinks}>
            <a href="/privacy-policy" style={s.footerLink}>Privacy Policy</a>
            <a href="/terms-of-service" style={s.footerLink}>Terms of Service</a>
            <a href="/disclaimer" style={s.footerLink}>Disclaimer</a>
            <a href="/contact" style={s.footerLink}>Contact Us</a>
          </div>
          <p style={s.footerCopy}>© 2025 MediClan. Built for India's pharmacy community.</p>
        </div>
      </footer>

    </div>
  )
}

const s = {
  page: { fontFamily: "'Nunito', 'Segoe UI', sans-serif", color: '#1a1a2e', overflowX: 'hidden' },

  nav: { background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  navBrand: { display: 'flex', alignItems: 'center', gap: 10 },
  navLogo: { width: 28, height: 28, objectFit: 'contain' },
  navName: { fontSize: 16, fontWeight: 900, color: DARK },
  navLinks: { display: 'flex', gap: 10 },
  navLoginBtn: { background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer', padding: '6px 12px' },
  navSignupBtn: { background: TEAL, color: 'white', border: 'none', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '7px 18px' },

  hero: { background: `linear-gradient(135deg, ${DARK} 0%, #0e7070 100%)`, padding: '80px 24px 72px' },
  heroInner: { maxWidth: 640, margin: '0 auto', textAlign: 'center' },
  heroBadge: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', padding: '5px 14px', borderRadius: 50, fontSize: 12, fontWeight: 700, marginBottom: 24 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: '50%', background: '#5eead4', display: 'inline-block' },
  heroTitle: { fontSize: 'clamp(28px, 5.5vw, 52px)', fontWeight: 900, color: 'white', lineHeight: 1.2, marginBottom: 18 },
  heroAccent: { color: '#5eead4' },
  heroSub: { fontSize: 16, color: 'rgba(255,255,255,0.78)', lineHeight: 1.8, marginBottom: 32, maxWidth: 520, margin: '0 auto 32px' },
  heroButtons: { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 },
  heroPrimaryBtn: { padding: '13px 28px', background: TEAL, color: 'white', border: 'none', borderRadius: 50, fontSize: 15, fontWeight: 800, cursor: 'pointer' },
  heroSecondaryBtn: { padding: '13px 28px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 50, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  heroTagline: { color: 'rgba(255,255,255,0.38)', fontSize: 13, fontStyle: 'italic', marginTop: 8 },

  trustBar: { background: DARK, padding: '12px 24px', display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' },
  trustItem: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 700 },

  section: { padding: '72px 24px', background: 'white' },
  container: { maxWidth: 1100, margin: '0 auto' },
  sectionLabel: { display: 'inline-block', background: '#e0f7f7', color: TEAL, padding: '3px 13px', borderRadius: 50, fontSize: 11, fontWeight: 800, marginBottom: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 'clamp(20px, 3.5vw, 32px)', fontWeight: 900, color: DARK, marginBottom: 8 },
  sectionSub: { fontSize: 15, color: '#64748b', marginBottom: 36, lineHeight: 1.75, maxWidth: 620 },

  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 },
  featureCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28 },
  featureCardPrimary: { background: '#f0fdfd', border: `1.5px solid ${TEAL}` },
  featureIcon: { fontSize: 32, marginBottom: 14 },
  featureTitle: { fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 8 },
  featureDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.7 },

  billFlow: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 },
  billFlowStep: { flex: '1 1 160px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 16px', textAlign: 'center' },
  billFlowIcon: { fontSize: 28, marginBottom: 8 },
  billFlowLabel: { fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 4 },
  billFlowSub: { fontSize: 12, color: '#64748b' },
  billFlowArrow: { fontSize: 22, color: TEAL, fontWeight: 900, flexShrink: 0 },
  billTags: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 },
  billTag: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 50, padding: '5px 14px', fontSize: 13, color: '#334155', fontWeight: 600 },

  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 },
  hiringCard: { display: 'flex', gap: 14, alignItems: 'flex-start', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 },
  hiringIcon: { fontSize: 24, flexShrink: 0, marginTop: 2 },
  hiringTitle: { fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 4 },
  hiringDesc: { fontSize: 13, color: '#64748b', lineHeight: 1.65 },

  csInner: { display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' },
  csLeft: { flex: '1 1 260px' },
  csLabel: { display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: 'white', padding: '3px 13px', borderRadius: 50, fontSize: 11, fontWeight: 800, marginBottom: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  csPills: { flex: '1 1 260px', display: 'flex', flexWrap: 'wrap', gap: 10 },
  csPill: { background: 'rgba(255,255,255,0.1)', color: 'white', padding: '8px 16px', borderRadius: 50, fontSize: 13, fontWeight: 700, border: '1px solid rgba(255,255,255,0.18)' },

  ctaSection: { padding: '72px 24px', background: '#f0fdfd', textAlign: 'center' },
  ctaInner: { maxWidth: 560, margin: '0 auto' },
  ctaTitle: { fontSize: 'clamp(20px, 3.5vw, 32px)', fontWeight: 900, color: DARK, marginBottom: 10 },
  ctaSub: { fontSize: 15, color: '#475569', marginBottom: 28, lineHeight: 1.75 },

  tealBtn: { padding: '12px 26px', background: TEAL, color: 'white', border: 'none', borderRadius: 50, fontSize: 14, fontWeight: 800, cursor: 'pointer' },

  footer: { background: '#0f172a', padding: '36px 24px' },
  footerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' },
  footerBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  footerLogo: { width: 36, height: 36, objectFit: 'contain' },
  footerName: { color: 'white', fontWeight: 900, fontSize: 16 },
  footerTag: { color: '#475569', fontSize: 12 },
  footerLinks: { display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap', justifyContent: 'center' },
  footerLink: { color: '#94a3b8', textDecoration: 'none' },
  footerCopy: { color: '#475569', fontSize: 12 },
}