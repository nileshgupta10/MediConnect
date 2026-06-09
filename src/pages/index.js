import Link from 'next/link'
import { useEffect, useState } from 'react'

const TEAL  = '#0e9090'
const DARK  = '#0f3460'
const AMBER = '#d97706'

const billFeatureTags = [
  '✓ GST accurate',
  '✓ Expiry auto-formatted',
  '✓ Credit notes handled',
  '✓ Multiple distributors',
  '✓ No manual entry',
]

const comingFeatures = [
  '📒 Khata mobile view',
  '📊 Store analytics dashboard',
  '↩️ Goods returns management',
  '💬 Pharmacist community forum',
  '📱 Native mobile app',
  '🏆 Pharmacist performance ratings',
  '🔔 Job alert notifications',
]

const khataFeatures = [
  { icon: '📋', title: 'Purchase Ledger', desc: 'Every distributor bill recorded automatically when you convert it.' },
  { icon: '💸', title: 'Payment Tracking', desc: 'Mark invoices as paid, partial, or pending. Know exactly what\'s due.' },
  { icon: '📊', title: 'Monthly Summary', desc: 'See your total purchases and outstanding at a glance.' },
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
            🇮🇳 India&apos;s Pharmacy Jobs &amp; Growth Platform
          </div>
          <h1 style={s.heroTitle}>
            Where Pharmacies and<br />
            <span style={s.heroAccent}>Pharmacists Grow Together</span>
          </h1>
          <p style={s.heroSub}>
            Post jobs, find verified pharmacists, manage your store khata — all built for Indian pharmacy retail.
          </p>
          <div style={s.heroButtons}>
            <Link href="/simple-login">
              <button style={s.heroPrimaryBtn}>Post a Job →</button>
            </Link>
            <Link href="/simple-login">
              <button style={s.heroSecondaryBtn}>Find Jobs Near You</button>
            </Link>
          </div>
          <div style={s.heroStats}>
            <span style={s.heroStatPill}>500+ Pharmacists</span>
            <span style={s.heroStatDivider} />
            <span style={s.heroStatPill}>200+ Stores</span>
            <span style={s.heroStatDivider} />
            <span style={s.heroStatPill}>Free to Join</span>
          </div>
          <p style={s.heroTagline}>&quot;Relations, over the counter.&quot;</p>
        </div>
      </section>

      {/* ── SECTION 3: DUAL AUDIENCE SPLIT ── */}
      <section style={{ ...s.section, background: 'white' }}>
        <div style={s.container}>
          <div style={s.audienceGrid}>

            {/* Left — Store Owners */}
            <div style={s.audienceCardDark}>
              <div style={s.audienceIcon}>🏪</div>
              <h2 style={s.audienceTitleLight}>For Store Owners</h2>
              <ul style={s.audienceList}>
                {['Post jobs in 2 minutes', 'License-verified applicants only', 'Manage store khata & accounts', 'No agency fees, no middlemen'].map((pt, i) => (
                  <li key={i} style={s.audienceItemLight}>✓ {pt}</li>
                ))}
              </ul>
              <Link href="/simple-login">
                <button style={s.audienceBtnTeal}>Post a Job Free →</button>
              </Link>
            </div>

            {/* Right — Pharmacists */}
            <div style={s.audienceCardLight}>
              <div style={s.audienceIcon}>👨‍⚕️</div>
              <h2 style={s.audienceTitleDark}>For Pharmacists</h2>
              <ul style={s.audienceList}>
                {['Browse jobs near your city', 'Build a verified profile', 'Apply directly to stores', 'Free to register'].map((pt, i) => (
                  <li key={i} style={s.audienceItemDark}>✓ {pt}</li>
                ))}
              </ul>
              <Link href="/simple-login">
                <button style={s.audienceBtnTeal}>Find Pharmacy Jobs →</button>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 4: JOBS FEATURE ── */}
      <section style={s.section}>
        <div style={s.container}>
          <div style={{ ...s.sectionLabel, background: '#fef3c7', color: AMBER }}>🔥 Hiring Now</div>
          <h2 style={s.sectionTitle}>Pharmacy Jobs, Near You, Right Now</h2>
          <p style={s.sectionSub}>
            MediClan connects verified pharmacists with stores across India. Every listing is from a real store. Every applicant is license-verified.
          </p>
          <div style={s.jobsComingSoon}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 8 }}>Job listings coming soon</div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Be the first store to post a job on MediClan. It takes 2 minutes.</div>
            <Link href="/simple-login">
              <button style={s.tealBtn}>Post the First Job →</button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: KHATA ── */}
      <section style={{ ...s.section, background: '#f8fafc' }}>
        <div style={s.container}>
          <div style={{ ...s.sectionLabel, color: TEAL }}>📒 Khata</div>
          <h2 style={s.sectionTitle}>Your Store&apos;s Account Book, Digitised</h2>
          <p style={s.sectionSub}>
            Track what you owe distributors, record payments, and keep your purchase accounts clean — the way Indian pharmacy stores actually work.
          </p>
          <div style={s.khataGrid}>
            {khataFeatures.map((f, i) => (
              <div key={i} style={s.khataCard}>
                <div style={s.khataIcon}>{f.icon}</div>
                <h3 style={s.khataTitle}>{f.title}</h3>
                <p style={s.khataDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
          <p style={s.khataNoteItalic}>
            Khata works hand-in-hand with Bill Converter — convert a bill and it gets logged automatically.
          </p>
          <Link href="/simple-login">
            <button style={s.tealBtn}>Explore Khata →</button>
          </Link>
        </div>
      </section>

      {/* ── SECTION 6: BILL CONVERTER (utility) ── */}
      <section style={{ ...s.section, background: '#f0fdfd' }}>
        <div style={s.container}>
          <div style={s.sectionLabel}>Also inside MediClan</div>
          <h2 style={s.sectionTitle}>Bill Converter — Still Powerful, Always Free</h2>
          <p style={s.sectionSub}>
            Upload your distributor&apos;s bill. MediClan converts it into the exact format your pharmacy software needs —
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

      {/* ── SECTION 7: COMING SOON ── */}
      <section style={{ ...s.section, background: `linear-gradient(135deg, ${DARK} 0%, #0e7070 100%)` }}>
        <div style={s.container}>
          <div style={s.csInner}>
            <div style={s.csLeft}>
              <div style={s.csLabel}>Coming soon</div>
              <h2 style={{ ...s.sectionTitle, color: 'white' }}>MediClan is just getting started</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.75 }}>
                We&apos;re constantly building new tools to make pharmacy store operations easier.
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

      {/* ── SECTION 8: CTA ── */}
      <section style={s.ctaSection}>
        <div style={s.ctaInner}>
          <h2 style={s.ctaTitle}>Post Your First Job in 2 Minutes. Free.</h2>
          <p style={s.ctaSub}>Join hundreds of pharmacy stores and pharmacists already on MediClan.</p>
          <Link href="/simple-login">
            <button style={s.tealBtn}>Create Free Account →</button>
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
          <p style={s.footerCopy}>© 2025 MediClan. Built for India&apos;s pharmacy community.</p>
        </div>
      </footer>

    </div>
  )
}

const s = {
  page: { fontFamily: "'Nunito', 'Segoe UI', sans-serif", color: '#1a1a2e', overflowX: 'hidden' },

  // NAV (unchanged)
  nav: { background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  navBrand: { display: 'flex', alignItems: 'center', gap: 10 },
  navLogo: { width: 28, height: 28, objectFit: 'contain' },
  navName: { fontSize: 16, fontWeight: 900, color: DARK },
  navLinks: { display: 'flex', gap: 10 },
  navLoginBtn: { background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer', padding: '6px 12px' },
  navSignupBtn: { background: TEAL, color: 'white', border: 'none', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '7px 18px' },

  // HERO
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
  heroStats: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20, marginTop: 8 },
  heroStatPill: { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', padding: '5px 14px', borderRadius: 50, fontSize: 12, fontWeight: 700 },
  heroStatDivider: { width: 1, height: 16, background: 'rgba(255,255,255,0.2)', display: 'inline-block' },
  heroTagline: { color: 'rgba(255,255,255,0.38)', fontSize: 13, fontStyle: 'italic', marginTop: 4 },

  // SHARED SECTION STRUCTURE
  section: { padding: '72px 24px', background: 'white' },
  container: { maxWidth: 1100, margin: '0 auto' },
  sectionLabel: { display: 'inline-block', background: '#e0f7f7', color: TEAL, padding: '3px 13px', borderRadius: 50, fontSize: 11, fontWeight: 800, marginBottom: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 'clamp(20px, 3.5vw, 32px)', fontWeight: 900, color: DARK, marginBottom: 8 },
  sectionSub: { fontSize: 15, color: '#64748b', marginBottom: 36, lineHeight: 1.75, maxWidth: 620 },
  tealBtn: { padding: '12px 26px', background: TEAL, color: 'white', border: 'none', borderRadius: 50, fontSize: 14, fontWeight: 800, cursor: 'pointer' },

  // SECTION 3 — DUAL AUDIENCE
  audienceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
  audienceCardDark: { background: 'linear-gradient(135deg, #0f3460, #0e7070)', borderRadius: 24, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 0 },
  audienceCardLight: { background: '#f0fdfd', border: '1.5px solid #0e9090', borderRadius: 24, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 0 },
  audienceIcon: { fontSize: 40, marginBottom: 14 },
  audienceTitleLight: { fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 18 },
  audienceTitleDark: { fontSize: 22, fontWeight: 900, color: DARK, marginBottom: 18 },
  audienceList: { listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 },
  audienceItemLight: { fontSize: 14, color: 'rgba(255,255,255,0.88)', fontWeight: 600 },
  audienceItemDark: { fontSize: 14, color: '#334155', fontWeight: 600 },
  audienceBtnTeal: { padding: '11px 24px', background: TEAL, color: 'white', border: 'none', borderRadius: 50, fontSize: 14, fontWeight: 800, cursor: 'pointer', alignSelf: 'flex-start' },

  // SECTION 4 — JOBS COMING SOON
  jobsComingSoon: { background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 16, padding: '40px 24px', textAlign: 'center', marginBottom: 0 },

  // SECTION 5 — KHATA
  khataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 },
  khataCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 },
  khataIcon: { fontSize: 28, marginBottom: 12 },
  khataTitle: { fontSize: 15, fontWeight: 800, color: DARK, marginBottom: 6 },
  khataDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.7 },
  khataNoteItalic: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginBottom: 24 },

  // SECTION 6 — BILL CONVERTER
  billFlow: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 },
  billFlowStep: { flex: '1 1 160px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 16px', textAlign: 'center' },
  billFlowIcon: { fontSize: 28, marginBottom: 8 },
  billFlowLabel: { fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 4 },
  billFlowSub: { fontSize: 12, color: '#64748b' },
  billFlowArrow: { fontSize: 22, color: TEAL, fontWeight: 900, flexShrink: 0 },
  billTags: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 },
  billTag: { background: 'white', border: '1px solid #e2e8f0', borderRadius: 50, padding: '5px 14px', fontSize: 13, color: '#334155', fontWeight: 600 },

  // SECTION 7 — COMING SOON
  csInner: { display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' },
  csLeft: { flex: '1 1 260px' },
  csLabel: { display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: 'white', padding: '3px 13px', borderRadius: 50, fontSize: 11, fontWeight: 800, marginBottom: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  csPills: { flex: '1 1 260px', display: 'flex', flexWrap: 'wrap', gap: 10 },
  csPill: { background: 'rgba(255,255,255,0.1)', color: 'white', padding: '8px 16px', borderRadius: 50, fontSize: 13, fontWeight: 700, border: '1px solid rgba(255,255,255,0.18)' },

  // SECTION 8 — CTA
  ctaSection: { padding: '72px 24px', background: '#f0fdfd', textAlign: 'center' },
  ctaInner: { maxWidth: 560, margin: '0 auto' },
  ctaTitle: { fontSize: 'clamp(20px, 3.5vw, 32px)', fontWeight: 900, color: DARK, marginBottom: 10 },
  ctaSub: { fontSize: 15, color: '#475569', marginBottom: 28, lineHeight: 1.75 },

  // FOOTER (unchanged)
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