import Link from 'next/link';

const ACCENT = '#1d4ed8';

export default function HomePage() {
  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          {/* BRAND */}
          <div style={styles.brandBlock}>
            <h1 style={styles.brandName}>MediClan</h1>
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
            pharmacy ecosystem. Pharmacists create verified profiles. Pharmacy
            owners post genuine job openings. No noise. No complexity.
          </p>

          <Link href="/simple-login">
            <button style={styles.primaryBtn}>Get Started</button>
          </Link>
        </div>
      </section>

      {/* IMAGE SECTION */}
      <section style={styles.imageSection}>
        <div style={styles.imageInner}>
          <div style={styles.imageWrap}>
            <img
              src="/pharmacy/professional-pharmacy.jpg"
              alt="Professional Pharmacy environment"
              style={styles.image}
            />
          </div>

          <div style={styles.imageText}>
            <h3 style={styles.imageTitle}>
              Designed for real pharmacy counters
            </h3>
            <p style={styles.imageDesc}>
              Built around how pharmacies actually operate — patient flow,
              working hours, locality, and trust. MediClan connects the right
              pharmacist to the right store, faster and cleaner.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <b style={styles.footerBrand}>MediClan</b>
        <p style={styles.footerText}>Relations, over the counter.</p>
      </footer>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles = {
  page: {
    background: '#ffffff',
    color: '#0f172a',
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  hero: {
    padding: '96px 20px 72px',
    background: '#f8fafc',
  },
  heroInner: {
    maxWidth: 900,
    margin: '0 auto',
  },

  brandBlock: {
    marginBottom: 28,
  },
  brandName: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
  },

  mainTitle: {
    fontSize: 36,
    fontWeight: 800,
    lineHeight: 1.25,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 17,
    color: '#334155',
    lineHeight: 1.75,
    maxWidth: 680,
    marginBottom: 36,
  },
  accent: {
    color: ACCENT,
    fontWeight: 700,
  },
  primaryBtn: {
    background: ACCENT,
    color: '#ffffff',
    border: 'none',
    padding: '14px 38px',
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 10,
    cursor: 'pointer',
  },

  imageSection: {
    padding: '80px 20px',
    background: '#ffffff',
  },
  imageInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: 48,
    alignItems: 'center',
  },
  imageWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  imageText: {
    maxWidth: 420,
  },
  imageTitle: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 14,
  },
  imageDesc: {
    fontSize: 15,
    lineHeight: 1.85,
    color: '#475569',
  },

  footer: {
    textAlign: 'center',
    padding: '36px 20px',
    background: '#0f172a',
    color: '#e5e7eb',
  },
  footerBrand: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: 0.4,
  },
  footerText: {
    fontSize: 14,
    color: '#cbd5f5',
    marginTop: 6,
  },
};
