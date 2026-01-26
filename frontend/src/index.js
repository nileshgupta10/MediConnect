import Link from 'next/link';

const ACCENT = '#1d4ed8';

export default function HomePage() {
  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.brandBlock}>
            <h1 style={styles.brandName}>MediClan</h1>
            <p style={styles.tagline}>Relations, over the counter.</p>
            <p style={{ color: 'red', fontWeight: 700 }}>
  DEBUG MARKER — COLLAB VERSION
</p>
          </div>

          <h2 style={styles.mainTitle}>
            Hiring and training for Pharmacies,
            <br />
            built on <span style={styles.accent}>Collaboration</span>
          </h2>

          <p style={styles.subtitle}>
            MediClan is a trust-first platform where Pharmacists and
            Pharmacies collaborate with clarity — not confusion.
            Structured training, clear expectations, and respectful
            professional relationships.
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
              Built around real Pharmacy environments
            </h3>
            <p style={styles.imageDesc}>
              MediClan reflects how Pharmacies actually function —
              counters, patients, training, and responsibility.
              It respects time, intent, and professional dignity
              on both sides.
            </p>
          </div>
        </div>
      </section>

      {/* COLLABORATION SECTION */}
      <section style={styles.collabSection}>
        <h3 style={styles.collabTitle}>Why collaboration works</h3>

        <div style={styles.collabGrid}>
          <div style={styles.collabCard}>
            <h4>For Pharmacies</h4>
            <ul>
              <li>Access motivated Pharmacists who want to learn</li>
              <li>Reduce hiring risk through structured training</li>
              <li>Build long-term professional relationships</li>
              <li>Train once, benefit for years</li>
            </ul>
          </div>

          <div style={styles.collabCard}>
            <h4>For Pharmacists</h4>
            <ul>
              <li>Gain real-world Pharmacy experience</li>
              <li>Learn workflows, not just theory</li>
              <li>Understand expectations before commitment</li>
              <li>Grow confidence through guided exposure</li>
            </ul>
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

  /* IMAGE SECTION */
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
    height: '420px',          // 🔹 fixed height for impact
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

  /* COLLAB SECTION */
  collabSection: {
    padding: '80px 20px',
    background: '#f8fafc',
  },
  collabTitle: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 40,
  },
  collabGrid: {
    maxWidth: 900,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 32,
  },
  collabCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    padding: 28,
    borderRadius: 10,
  },

  /* FOOTER */
  footer: {
    textAlign: 'center',
    padding: '36px 20px',
    background: '#0f172a',
    color: '#e5e7eb',
  },
  footerBrand: {
    fontSize: 15,
    fontWeight: 600,
  },
  footerText: {
    fontSize: 14,
    color: '#cbd5f5',
    marginTop: 6,
  },
};

/* MOBILE FIX */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @media (max-width: 768px) {
      .imageInner {
        grid-template-columns: 1fr !important;
      }
      img {
        height: 260px !important;
      }
    }
  `;
  document.head.appendChild(style);
}
