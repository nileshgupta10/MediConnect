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
        <b>MediClan</b>
        <p style={styles.footerText}>Relations, over the counter.</p>
      </footer>
    </div>
  );
}

const styles = {
  page: { background: '#ffffff', color: '#0f172a' },

  hero: { padding: '80px 20px', background: '#f8fafc' },
  heroInner: { maxWidth: 900, margin: '0 auto' },

  brandBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  logo: { width: 64, height: 64, objectFit: 'contain' },
  brandName: { fontSize: 28, fontWeight: 700 },
  tagline: { fontSize: 13, color: '#475569' },

  title: {
    fontSize: 32,
    fontWeight: 800,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
    maxWidth: 600,
    marginBottom: 28,
  },
  accent: { color: ACCENT, fontWeight: 700 },

  primaryBtn: {
    background: ACCENT,
    color: '#fff',
    border: 'none',
    padding: '12px 34px',
    borderRadius: 8,
    cursor: 'pointer',
  },

  footer: {
    textAlign: 'center',
    padding: 24,
    background: '#020617',
    color: '#ffffff',
  },
  footerText: { fontSize: 13, opacity: 0.8 },
};
