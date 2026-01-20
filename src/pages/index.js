import Link from 'next/link';

const ACCENT = '#0ea5a4';

export default function HomePage() {
  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div>
            {/* LOGO */}
            <div style={styles.logo}>
              Medi<span style={styles.logoC}>C</span>onnect
            </div>

            <h1 style={styles.title}>
              Trusted hiring & training
              <br />
              for pharmacies
            </h1>

            <p style={styles.subtitle}>
              A verification-first platform that builds
              <span style={styles.highlight}> connection</span>,
              <span style={styles.highlight}> credibility</span>,
              and <span style={styles.highlight}>care</span>
              across pharmacy hiring and training.
            </p>

            <Link href="/simple-login">
              <button style={styles.primaryBtn}>
                Get Started
              </button>
            </Link>
          </div>

          {/* VISUAL MOTIF */}
          <div style={styles.visual}>
            <div style={styles.visualC}>C</div>
            <p style={styles.visualText}>
              Connecting pharmacies
              <br />
              with trusted pharmacists
            </p>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={styles.trust}>
        <Trust text="Manual license verification" />
        <Trust text="Privacy-first communication" />
        <Trust text="Built for Indian pharmacies" />
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          How Medi<span style={styles.logoC}>C</span>onnect works
        </h2>

        <div style={styles.steps}>
          <Step text="Create a verified profile" />
          <Step text="Apply or offer training" />
          <Step text="Schedule and meet" />
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section style={styles.split}>
        <Info
          title="For Pharmacies"
          points={[
            'Hire verified pharmacists',
            'Offer structured training',
            'Reduce dependency on agents',
          ]}
        />
        <Info
          title="For Pharmacists"
          points={[
            'Build real-world experience',
            'Apply to genuine opportunities',
            'Clear scheduling & confirmation',
          ]}
        />
      </section>

      {/* CTA */}
      <section style={styles.cta}>
        <h2 style={styles.ctaTitle}>
          Simple. Verified. Connected.
        </h2>

        <Link href="/simple-login">
          <button style={styles.secondaryBtn}>
            Create your profile
          </button>
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.logoFooter}>
          Medi<span style={styles.logoC}>C</span>onnect
        </div>
        <p style={styles.footerText}>
          Relations, over the counter.
        </p>
      </footer>
    </div>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function Trust({ text }) {
  return <div style={styles.trustItem}>{text}</div>;
}

function Step({ text }) {
  return (
    <div style={styles.step}>
      <div style={styles.stepDot} />
      <p>{text}</p>
    </div>
  );
}

function Info({ title, points }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>
        {title.replace('C', '')}
        <span style={styles.logoC}>C</span>
        {title.includes('C') ? '' : ''}
      </h3>
      <ul style={styles.list}>
        {points.map(p => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: { background: '#ffffff', color: '#0f172a' },

  hero: { padding: '80px 20px', background: '#f8fafc' },
  heroInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: 48,
    alignItems: 'center',
  },

  logo: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 20,
  },
  logoFooter: {
    fontSize: 16,
    fontWeight: 700,
  },
  logoC: {
    color: ACCENT,
    fontWeight: 900,
  },

  title: {
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1.25,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 1.6,
    marginBottom: 28,
    maxWidth: 460,
  },
  highlight: {
    color: ACCENT,
    fontWeight: 600,
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
    padding: 32,
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
  },
  visualC: {
    fontSize: 72,
    fontWeight: 900,
    color: ACCENT,
    marginBottom: 10,
  },
  visualText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 1.6,
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
  trustItem: {
    borderBottom: `2px solid ${ACCENT}`,
    paddingBottom: 8,
  },

  section: { padding: '64px 20px', textAlign: 'center' },
  sectionTitle: { fontSize: 22, fontWeight: 700, marginBottom: 32 },

  steps: {
    maxWidth: 900,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 24,
  },
  step: {
    border: `1px dashed ${ACCENT}`,
    borderRadius: 14,
    padding: 24,
    fontSize: 14,
  },
  stepDot: {
    width: 10,
    height: 10,
    background: ACCENT,
    borderRadius: '50%',
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
  ctaTitle: { fontSize: 22, fontWeight: 700, marginBottom: 18 },
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
