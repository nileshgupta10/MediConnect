import Link from 'next/link';

const ACCENT = '#1d4ed8';

export default function HomePage() {
  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroInner}>

          {/* BRAND */}
          <div style={styles.brandBlock}>
            <img
              src="/brand/mediclan-logo.png"
              alt="MediClan"
              style={styles.logo}
            />
            <div>
              <h1 style={styles.brandName}>MediClan</h1>
              <p style={styles.tagline}>Relations, over the counter.</p>
            </div>
          </div>

          <h2 style={styles.title}>
            Hiring and training for pharmacies,
            <br />
            built on <span style={styles.accent}>Connection</span>
          </h2>

          <p style={styles.subtitle}>
            MediClan is a verified platform that enables
            <span style={styles.accent}> Credibility</span>,
            clear processes, and genuine
            <span style={styles.accent}> Care</span>
            in pharmacy hiring and training.
          </p>

          <Link href="/simple-login">
            <button style={styles.primaryBtn}>Get Started</button>
          </Link>
        </div>
      </section>

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
    padding: '90px 20px 80px',
    background: '#f8fafc',
  },
  heroInner: {
    maxWidth: 900,
    margin: '0 auto',
  },

  /* BRAND BLOCK */
  brandBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    marginBottom: 36,
  },
  logo: {
    width: 96,          // 🔼 increased size
    height: 96,
    objectFit: 'contain',
  },
  brandName: {
    fontSize: 30,
    fontWeight: 700,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#334155',
  },

  /* CONTENT */
  title: {
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1.25,
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 1.7,
    maxWidth: 620,
    marginBottom: 32,
  },
  accent: {
    color: ACCENT,
    fontWeight: 700,
  },

  primaryBtn: {
    background: ACCENT,
    color: '#ffffff',
    border: 'none',
    padding: '12px 34px',
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 8,
    cursor: 'pointer',
  },

  /* FOOTER */
  footer: {
    textAlign: 'center',
    padding: '32px 20px',
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
