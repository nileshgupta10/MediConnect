import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.logo}>MediConnect</div>

          <h1 style={styles.title}>
            Hiring made reliable for pharmacies
          </h1>

          <p style={styles.subtitle}>
            A verified employment platform connecting pharmacies
            with trusted pharmacists — locally and securely.
          </p>

          <Link href="/simple-login">
            <button style={styles.primaryBtn}>
              Get Started
            </button>
          </Link>

          <p style={styles.tagline}>
            Relations, over the counter
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How it works</h2>

        <div style={styles.steps}>
          <Step
            title="Sign in securely"
            text="Quick Google login with no passwords to remember."
          />
          <Step
            title="Upload & verify"
            text="Licenses are manually verified to maintain trust."
          />
          <Step
            title="Hire with confidence"
            text="Apply or hire only after verification."
          />
        </div>
      </section>

      {/* TRUST */}
      <section style={styles.trust}>
        <h2 style={styles.sectionTitle}>Built for pharmacies</h2>

        <ul style={styles.trustList}>
          <li>Manual license verification</li>
          <li>No agents or middlemen</li>
          <li>Designed for Indian pharmacy workflows</li>
          <li>Mobile-first and simple to use</li>
        </ul>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p style={{ fontWeight: 600 }}>MediConnect</p>
        <p style={{ fontSize: 14, opacity: 0.8 }}>
          Pharmacy employment, simplified.
        </p>
      </footer>
    </div>
  );
}

function Step({ title, text }) {
  return (
    <div style={styles.stepCard}>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#475569' }}>{text}</p>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  hero: {
    minHeight: '85vh',
    background: 'linear-gradient(135deg, #e0f2fe, #ecfdf5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
  },
  heroContent: {
    maxWidth: 560,
  },
  logo: {
    fontSize: 26,
    fontWeight: 700,
    color: '#2563eb',
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 700,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 1.6,
    marginBottom: 28,
    color: '#334155',
  },
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '14px 26px',
    fontSize: 16,
    borderRadius: 8,
    cursor: 'pointer',
  },
  tagline: {
    marginTop: 14,
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  section: {
    padding: '48px 20px',
    background: '#f8fafc',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 28,
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 18,
    maxWidth: 720,
    margin: '0 auto',
  },
  stepCard: {
    background: 'white',
    borderRadius: 12,
    padding: 22,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  trust: {
    padding: '48px 20px',
    textAlign: 'center',
  },
  trustList: {
    listStyle: 'none',
    padding: 0,
    fontSize: 16,
    lineHeight: 1.9,
    color: '#334155',
  },
  footer: {
    padding: 24,
    background: '#0f172a',
    color: 'white',
    textAlign: 'center',
  },
};
