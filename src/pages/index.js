import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={styles.page}>
      {/* HERO SECTION */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.logo}>💊 MediConnect</div>

          <h1 style={styles.title}>
            Connecting Pharmacies with Trusted Pharmacists
          </h1>

          <p style={styles.subtitle}>
            A verified, local-first employment platform built exclusively for
            the pharmacy ecosystem.
          </p>

          <Link href="/simple-login">
            <button style={styles.primaryBtn}>
              Get Started
            </button>
          </Link>

          <p style={styles.tagline}>
            Relations, over the counter.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How MediConnect Works</h2>

        <div style={styles.steps}>
          <Step
            number="1"
            title="Sign in with Google"
            text="Quick, secure login with no passwords to remember."
          />
          <Step
            number="2"
            title="Complete Profile & Upload License"
            text="Pharmacists and stores upload licenses for manual verification."
          />
          <Step
            number="3"
            title="Verified Hiring"
            text="Stores hire only verified pharmacists. Pharmacists apply with confidence."
          />
        </div>
      </section>

      {/* TRUST SECTION */}
      <section style={styles.trust}>
        <h2 style={styles.sectionTitle}>Why Choose MediConnect?</h2>

        <ul style={styles.trustList}>
          <li>✅ Manual license verification</li>
          <li>✅ No spam, no middlemen</li>
          <li>✅ Built for Indian pharmacies</li>
          <li>✅ Mobile-first & easy to use</li>
        </ul>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p><b>MediConnect</b></p>
        <p style={{ fontSize: 14 }}>
          Pharmacy employment, simplified.
        </p>
      </footer>
    </div>
  );
}

/* ---------- COMPONENTS ---------- */

function Step({ number, title, text }) {
  return (
    <div style={styles.stepCard}>
      <div style={styles.stepNumber}>{number}</div>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 14 }}>{text}</p>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: {
    fontFamily: 'system-ui, sans-serif',
    color: '#0f172a',
  },

  hero: {
    minHeight: '90vh',
    background: 'linear-gradient(135deg, #e0f2fe, #ecfdf5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    textAlign: 'center',
  },

  heroContent: {
    maxWidth: 520,
  },

  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2563eb',
  },

  title: {
    fontSize: 32,
    marginBottom: 14,
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    color: '#334155',
  },

  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '14px 22px',
    fontSize: 16,
    borderRadius: 8,
    cursor: 'pointer',
  },

  tagline: {
    marginTop: 16,
    fontStyle: 'italic',
    color: '#475569',
  },

  section: {
    padding: '40px 20px',
    background: '#f8fafc',
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 24,
    marginBottom: 24,
  },

  steps: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 16,
    maxWidth: 700,
    margin: '0 auto',
  },

  stepCard: {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
  },

  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#16a34a',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    margin: '0 auto 10px',
  },

  trust: {
    padding: '40px 20px',
    textAlign: 'center',
  },

  trustList: {
    listStyle: 'none',
    padding: 0,
    fontSize: 16,
    lineHeight: 1.8,
  },

  footer: {
    padding: 20,
    background: '#0f172a',
    color: 'white',
    textAlign: 'center',
  },
};
