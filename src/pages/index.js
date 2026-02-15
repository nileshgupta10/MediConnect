import Link from 'next/link';

const ACCENT = '#1d4ed8';

export default function HomePage() {
  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.brandBlock}>
            <div style={styles.logoRow}>
              <img
                src="/brand/mediclan-logo.png"
                alt="MediClan Logo"
                style={styles.logo}
              />
              <h1 style={styles.brandName}>MediClan</h1>
            </div>
            <p style={styles.tagline}>Relations, over the counter.</p>
          </div>

          <h2 style={styles.mainTitle}>
            Hiring made simple
            <br />
            for <span style={styles.accent}>Pharmacies</span> and{' '}
            <span style={styles.accent}>Pharmacists</span>
          </h2>

          <p style={styles.subtitle}>
            MediClan is a focused employment platform built exclusively for the
            pharmacy ecosystem. Pharmacists create verified profiles and apply
            for nearby jobs. Pharmacy owners post genuine job openings and receive
            applications from qualified candidates. No noise. No complexity. Just
            direct connections between verified professionals and trusted stores.
          </p>

          <Link href="/simple-login">
            <button style={styles.primaryBtn}>Get Started</button>
          </Link>
        </div>
      </section>

      <section style={styles.howItWorks}>
        <div style={styles.howInner}>
          <h2 style={styles.sectionTitle}>How MediClan Works</h2>
          <div style={styles.grid}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <h3 style={styles.stepTitle}>Sign Up with Google</h3>
              <p style={styles.stepDesc}>
                Quick and secure login using your Google account. Choose whether
                you're a pharmacist looking for work or a pharmacy owner looking to hire.
              </p>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <h3 style={styles.stepTitle}>Create Your Profile</h3>
              <p style={styles.stepDesc}>
                Pharmacists upload their license and experience. Store owners set
                their location and operating hours. Admin verification ensures quality.
              </p>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <h3 style={styles.stepTitle}>Connect & Hire</h3>
              <p style={styles.stepDesc}>
                Browse jobs by location. Apply instantly. Store owners review verified
                candidates and contact them directly. Simple, fast, and effective.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.imageSection}>
        <div style={styles.imageInner}>
          <div style={styles.imageWrap}>
            <img
              src="/pharmacy/professional-pharmacy.jpg"
              alt="Professional Pharmacy environment"
              style={styles.image}
              loading="lazy"
            />
          </div>
          <div style={styles.imageText}>
            <h3 style={styles.imageTitle}>Designed for real pharmacy counters</h3>
            <p style={styles.imageDesc}>
              Built around how pharmacies actually operate — patient flow,
              working hours, locality, and trust. MediClan connects the right
              pharmacist to the right store, faster and cleaner. Our platform
              understands the unique needs of pharmacy employment: shift patterns,
              software experience, license verification, and location proximity.
            </p>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <b style={styles.footerBrand}>MediClan</b>
        <p style={styles.footerText}>Relations, over the counter.</p>
      </footer>
    </div>
  )
}

const styles = {
  page: { background: '#ffffff', color: '#0f172a', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  hero: { padding: '96px 20px 72px', background: '#f8fafc' },
  heroInner: { maxWidth: 900, margin: '0 auto' },
  brandBlock: { marginBottom: 28 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 },
  logo: { width: 48, height: 48, objectFit: 'contain' },
  brandName: { fontSize: 36, fontWeight: 800, letterSpacing: 0.4, margin: 0 },
  tagline: { fontSize: 14, color: '#64748b' },
  mainTitle: { fontSize: 36, fontWeight: 800, lineHeight: 1.25, marginBottom: 20 },
  subtitle: { fontSize: 17, color: '#334155', lineHeight: 1.75, maxWidth: 680, marginBottom: 36 },
  accent: { color: ACCENT, fontWeight: 700 },
  primaryBtn: { background: ACCENT, color: '#ffffff', border: 'none', padding: '14px 38px', fontSize: 16, fontWeight: 600, borderRadius: 10, cursor: 'pointer' },
  howItWorks: { padding: '80px 20px', background: '#ffffff' },
  howInner: { maxWidth: 1100, margin: '0 auto' },
  sectionTitle: { fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 48 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 },
  step: { textAlign: 'center' },
  stepNumber: { width: 56, height: 56, borderRadius: '50%', background: ACCENT, color: 'white', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  stepTitle: { fontSize: 20, fontWeight: 600, marginBottom: 12 },
  stepDesc: { fontSize: 15, lineHeight: 1.7, color: '#475569' },
  imageSection: { padding: '80px 20px', background: '#f8fafc' },
  imageInner: { maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: 48, alignItems: 'center' },
  imageWrap: { borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', width: '100%', maxWidth: 600, margin: '0 auto' },
  image: { width: '100%', height: 'auto', display: 'block' },
  imageText: { maxWidth: 600, margin: '0 auto' },
  imageTitle: { fontSize: 26, fontWeight: 700, marginBottom: 14 },
  imageDesc: { fontSize: 15, lineHeight: 1.85, color: '#475569' },
  footer: { textAlign: 'center', padding: '36px 20px', background: '#0f172a', color: '#e5e7eb' },
  footerBrand: { fontSize: 15, fontWeight: 600, letterSpacing: 0.4 },
  footerText: { fontSize: 14, color: '#cbd5e1', marginTop: 6 },
}