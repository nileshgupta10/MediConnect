import Link from 'next/link';

const ACCENT = '#1d4ed8';

export default function HomePage() {
  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
        <h1 style={{ color: 'red' }}>
  THIS IS THE NEW MEDICLAN HOMEPAGE — TEST 123
</h1>

          {/* BRAND (TEXT ONLY FOR NOW) */}
          <div style={styles.brandBlock}>
            <h1 style={styles.brandName}>MediClan</h1>
            <p style={styles.tagline}>Relations, over the counter.</p>
          </div>

          <h2 style={styles.mainTitle}>
            Hiring and training for Pharmacies,
            <br />
            built on <span style={styles.accent}>Connection</span>
          </h2>

          <p style={styles.subtitle}>
            MediClan is a verified platform that enables
            <span style={styles.accent}> Credibility</span>,
            clear processes, and genuine
            <span style={styles.accent}> Care</span>
            for Pharmacists and Pharmacies.
          </p>

          <Link href="/simple-login">
            <button style={styles.primaryBtn}>Get Started</button>
          </Link>
        </div>
      </section>

      {/* PROFESSIONAL IMAGE SECTION */}
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
              Built for real Pharmacy environments
            </h3>
            <p style={styles.imageDesc}>
              MediClan is designed around how Pharmacies actually work —
              real counters, real patients, real training, and real trust.
              Structured processes help Pharmacists and Pharmacy owners
              connect with clarity and confidence.
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
  },

  hero: {
    padding: '100px 20px 80px',
    background: '#f8fafc',
  },
  heroInner: {
    maxWidth: 900,
    margin: '0 auto',
  },

  brandBlock: {
    marginBottom: 32,
  },
  brandName: {
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#475569',
  },

  mainTitle: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1.25,
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 17,
    color: '#334155',
    lineHeight: 1.7,
    maxWidth: 650,
    marginBottom: 34,
  },
  accent: {
    color: ACCENT,
    fontWeight: 700,
  },
  primaryBtn: {
    background: ACCENT,
    color: '#ffffff',
    border: 'none',
    padding: '13px 36px',
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 8,
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
    borderRadius: 14,
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
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 14,
  },
  imageDesc: {
    fontSize: 15,
    lineHeight: 1.8,
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
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 14,
    color: '#cbd5f5',
    marginTop: 6,
  },
};
