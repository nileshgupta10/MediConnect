import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div>
            <span style={styles.accentTag}>Verified Healthcare Platform</span>

            <h1 style={styles.title}>
              Trusted hiring & training
              <br />
              for <span style={styles.accentWord}>pharmacies</span>
            </h1>

            <p style={styles.subtitle}>
              MediConnect connects pharmacies with verified pharmacists
              through a simple, structured and reliable process.
            </p>

            <Link href="/simple-login">
              <button style={styles.primaryBtn}>
                Get Started
              </button>
            </Link>
          </div>

          {/* VISUAL BLOCK (IMAGE REPLACEMENT) */}
          <div style={styles.visual}>
            <div style={styles.visualBar} />
            <div style={styles.visualContent}>
              <p style={styles.visualBig}>01</p>
              <p style={styles.visualText}>
                Verification-first.
                <br />
                No middlemen.
                <br />
                Built for India.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={styles.trust}>
        <div>Manual license verification</div>
        <div>Privacy-first communication</div>
        <div>Real pharmacy workflows</div>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How it works</h2>

        <div style={styles.steps}>
          <Step no="1" text="Create a verified profile" />
          <Step no="2" text="Apply or offer training" />
          <Step no="3" text="Schedule and meet" />
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section style={styles.split}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>For Pharmacies</h3>
          <ul style={styles.list}>
            <li>Hire verified pharmacists</li>
            <li>Offer structured training slots</li>
            <li>Reduce dependency on agents</li>
          </ul>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>For Pharmacists</h3>
          <ul style={styles.list}>
            <li>Build real-world experience</li>
            <li>Apply to genuine opportunities</li>
            <li>Clear scheduling & confirmation</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta}>
        <h2 style={styles.ctaTitle}>
          Simple. Verified. Reliable.
        </h2>

        <Link href="/simple-login">
          <button style={styles.secondaryBtn}>
            Create your profile
          </button>
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <b>MediConnect</b>
        <p style={styles.footerText}>
          Relations, over the counter.
        </p>
      </footer>
    </div>
  );
}

function Step({ no, text }) {
  return (
    <div style={styles.step}>
      <div style={styles.stepNo}>{no}</div>
      <p>{text}</p>
    </div>
  );
}

/* ---------- STYLES ---------- */

const ACCENT = '#0ea5a4';

const styles = {
  page: {
    background: '#ffffff',
    color: '#0f172a',
  },

  hero: {
    padding: '80px 20px',
    background: '#f8fafc',
  },
  heroInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: 48,
    alignItems: 'center',
  },
  accentTag: {
    color: ACCENT,
    fontWeight: 600,
    fontSize: 13,
    marginBottom: 12,
    display: 'inline-block',
  },
  title: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1.2,
    marginBottom: 14,
  },
  accentWord: {
    color: ACCENT,
  },
  subtitle: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 1.6,
    maxWidth: 420,
    marginBottom: 28,
  },
  primaryBtn: {
    background: ACCENT,
    color: '#ffffff',
    border: 'none',
    padding: '12px 30px',
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 10,
    cursor: 'pointer',
  },

  visual: {
    background: '#ffffff',
    borderRadius: 20,
    padding: 28,
    position: 'relative',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
  },
  visualBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    background: ACCENT,
    borderRadius: '20px 0 0 20px',
  },
  visualContent: {
    paddingLeft: 24,
  },
  visualBig: {
    fontSize: 48,
    fontWeight: 800,
    color: ACCENT,
    marginBottom: 8,
  },
  visualText: {
    fontSize: 14,
    lineHeight: 1.8,
    color: '#334155',
  },

  trust: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    textAlign: 'center',
    fontSize: 14,
    color: ACCENT,
    fontWeight: 600,
  },

  section: {
    padding: '64px 20px',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 32,
  },
  steps: {
    maxWidth: 900,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 24,
  },
  step: {
    border: `2px dashed ${ACCENT}`,
    borderRadius: 16,
    padding: 24,
    fontSize: 14,
  },
  stepNo: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: ACCENT,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    margin: '0 auto 12px',
  },

  split: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '64px 20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 32,
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 18,
    padding: 28,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
    color: ACCENT,
  },
  list: {
    paddingLeft: 18,
    lineHeight: 1.9,
    fontSize: 14,
  },

  cta: {
    background: ACCENT,
    color: '#ffffff',
    textAlign: 'center',
    padding: '64px 20px',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 18,
  },
  secondaryBtn: {
    background: '#ffffff',
    color: ACCENT,
    border: 'none',
    padding: '12px 34px',
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 10,
    cursor: 'pointer',
  },

  footer: {
    textAlign: 'center',
    padding: 24,
    background: '#020617',
    color: '#ffffff',
  },
  footerText: {
    fontSize: 13,
    opacity: 0.8,
  },
};
