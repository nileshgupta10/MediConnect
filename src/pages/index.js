import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroText}>
            <h1 style={styles.title}>
              Trusted hiring & training
              <br /> for pharmacies
            </h1>

            <p style={styles.subtitle}>
              A verified platform connecting pharmacies with
              reliable pharmacists — simply and securely.
            </p>

            <Link href="/simple-login">
              <button style={styles.primaryBtn}>
                Get Started
              </button>
            </Link>
          </div>

          <div style={styles.heroImage}>
            <img
              src="https://images.unsplash.com/photo-1580281658629-7d5b8f6d3c4f"
              alt="Pharmacy"
              style={styles.image}
            />
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section style={styles.trust}>
        <div style={styles.trustItem}>✔ Manual verification</div>
        <div style={styles.trustItem}>✔ No agents or middlemen</div>
        <div style={styles.trustItem}>✔ Built for Indian pharmacies</div>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How it works</h2>

        <div style={styles.steps}>
          <Step no="1" text="Sign in and get verified" />
          <Step no="2" text="Apply or offer training" />
          <Step no="3" text="Schedule and meet confidently" />
        </div>
      </section>

      {/* WHO IT’S FOR */}
      <section style={styles.split}>
        <div>
          <h3 style={styles.splitTitle}>For Pharmacies</h3>
          <p style={styles.splitText}>
            Hire verified pharmacists and offer
            structured industry training without chaos.
          </p>
        </div>

        <div>
          <h3 style={styles.splitTitle}>For Pharmacists</h3>
          <p style={styles.splitText}>
            Build real-world experience through
            genuine pharmacy training opportunities.
          </p>
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

const styles = {
  page: {
    background: '#ffffff',
    color: '#0f172a',
  },

  hero: {
    background: '#eff6ff',
    padding: '80px 20px',
  },
  heroInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    alignItems: 'center',
    gap: 40,
  },
  heroText: {
    animation: 'fadeIn 0.8s ease',
  },
  title: {
    fontSize: 42,
    fontWeight: 800,
    lineHeight: 1.1,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 17,
    color: '#334155',
    lineHeight: 1.6,
    marginBottom: 28,
    maxWidth: 420,
  },
  primaryBtn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '14px 34px',
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 12,
    cursor: 'pointer',
  },
  heroImage: {
    animation: 'fadeInUp 0.9s ease',
  },
  image: {
    width: '100%',
    borderRadius: 20,
    boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
  },

  trust: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '24px 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    fontWeight: 600,
    color: '#1e40af',
  },
  trustItem: {
    background: '#dbeafe',
    padding: 14,
    borderRadius: 12,
    textAlign: 'center',
  },

  section: {
    padding: '64px 20px',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 32,
  },
  steps: {
    maxWidth: 900,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 24,
  },
  step: {
    border: '2px solid #2563eb',
    borderRadius: 16,
    padding: 24,
    fontWeight: 500,
  },
  stepNo: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: '#2563eb',
    color: '#fff',
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
    gap: 40,
  },
  splitTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 10,
  },
  splitText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 1.6,
  },

  cta: {
    background: '#2563eb',
    color: '#ffffff',
    textAlign: 'center',
    padding: '64px 20px',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 18,
  },
  secondaryBtn: {
    background: '#ffffff',
    color: '#2563eb',
    border: 'none',
    padding: '14px 36px',
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 12,
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
