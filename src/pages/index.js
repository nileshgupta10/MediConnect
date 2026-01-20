import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroLeft}>
            <span style={styles.badge}>Healthcare • Verified • India</span>

            <h1 style={styles.heroTitle}>
              Trusted hiring & training
              <br />
              for modern pharmacies
            </h1>

            <p style={styles.heroSubtitle}>
              MediConnect is a verification-first platform that helps pharmacies
              hire reliable pharmacists and build industry-ready talent through
              structured, real-world training.
            </p>

            <div style={styles.ctaRow}>
              <Link href="/simple-login">
                <button style={styles.primaryBtn}>
                  Get Started
                </button>
              </Link>

              <span style={styles.ctaHint}>
                No agents • No spam • Free to start
              </span>
            </div>
          </div>

          <div style={styles.heroRight}>
            <div style={styles.heroCard}>
              <p style={styles.cardTitle}>Why MediConnect?</p>

              <ul style={styles.heroList}>
                <li>✔ Manual license verification</li>
                <li>✔ Structured training slots</li>
                <li>✔ Clear scheduling & confirmations</li>
                <li>✔ Direct contact at the right stage</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={styles.trustStrip}>
        <div style={styles.trustGrid}>
          <TrustItem
            title="Manual Verification"
            text="Every pharmacist and store is reviewed before approval."
          />
          <TrustItem
            title="Privacy by Design"
            text="Contact details unlock only after mutual confirmation."
          />
          <TrustItem
            title="Built for India"
            text="Designed around real pharmacy workflows and timings."
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How it works</h2>

        <div style={styles.steps}>
          <Step
            no="1"
            title="Create a verified profile"
            text="Sign in securely and upload your license for manual verification."
          />
          <Step
            no="2"
            title="Apply or offer training"
            text="Pharmacists apply to real training slots. Stores choose when to schedule."
          />
          <Step
            no="3"
            title="Meet with confidence"
            text="Clear confirmations, scheduled meetings, and direct communication."
          />
        </div>
      </section>

      {/* FOR PHARMACIES */}
      <section style={styles.split}>
        <div>
          <h3 style={styles.splitTitle}>For Pharmacy Owners</h3>
          <ul style={styles.list}>
            <li>Hire verified pharmacists</li>
            <li>Offer structured industry training</li>
            <li>Reduce dependency on agents</li>
            <li>Improve compliance & service quality</li>
          </ul>
        </div>

        <div style={styles.infoCard}>
          <p style={styles.infoTitle}>Better teams build better trust</p>
          <p style={styles.infoText}>
            Structured hiring and training improves patient confidence,
            operational efficiency, and long-term growth.
          </p>
        </div>
      </section>

      {/* FOR PHARMACISTS */}
      <section style={{ ...styles.split, background: '#f8fafc' }}>
        <div style={styles.infoCard}>
          <p style={styles.infoTitle}>Industry-ready growth</p>
          <p style={styles.infoText}>
            Training with real pharmacies builds practical skills —
            not just certificates.
          </p>
        </div>

        <div>
          <h3 style={styles.splitTitle}>For Pharmacists</h3>
          <ul style={styles.list}>
            <li>Verified profiles increase credibility</li>
            <li>Apply only to genuine opportunities</li>
            <li>Clear schedules & confirmations</li>
            <li>Direct communication, no middlemen</li>
          </ul>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={styles.finalCta}>
        <h2 style={styles.finalTitle}>
          Built for trust. Designed for clarity.
        </h2>
        <p style={styles.finalText}>
          Whether you are hiring or learning, MediConnect keeps the process
          simple, verified, and transparent.
        </p>

        <Link href="/simple-login">
          <button style={styles.secondaryBtn}>
            Create your profile
          </button>
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p style={{ fontWeight: 600 }}>MediConnect</p>
        <p style={styles.footerText}>
          Relations, over the counter.
        </p>
      </footer>
    </div>
  );
}

/* ---------- COMPONENTS ---------- */

function TrustItem({ title, text }) {
  return (
    <div style={styles.trustItem}>
      <p style={styles.trustTitle}>{title}</p>
      <p style={styles.trustText}>{text}</p>
    </div>
  );
}

function Step({ no, title, text }) {
  return (
    <div style={styles.stepCard}>
      <div style={styles.stepNo}>{no}</div>
      <h4 style={styles.stepTitle}>{title}</h4>
      <p style={styles.stepText}>{text}</p>
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
    background:
      'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
    padding: '72px 20px',
  },
  heroInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: 40,
  },
  heroLeft: {},
  badge: {
    display: 'inline-block',
    background: '#dbeafe',
    color: '#1e3a8a',
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: 800,
    lineHeight: 1.15,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 17,
    color: '#334155',
    lineHeight: 1.7,
    maxWidth: 520,
    marginBottom: 28,
  },
  ctaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  primaryBtn: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '14px 30px',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  ctaHint: {
    fontSize: 13,
    color: '#475569',
  },

  heroRight: {},
  heroCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
  },
  cardTitle: {
    fontWeight: 700,
    marginBottom: 12,
  },
  heroList: {
    paddingLeft: 18,
    lineHeight: 1.9,
    color: '#334155',
  },

  trustStrip: {
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    background: '#ffffff',
    padding: '22px 20px',
  },
  trustGrid: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
  },
  trustItem: {},
  trustTitle: {
    fontWeight: 600,
    marginBottom: 4,
  },
  trustText: {
    fontSize: 14,
    color: '#475569',
  },

  section: {
    padding: '64px 20px',
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 36,
  },
  steps: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 22,
  },
  stepCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 26,
    boxShadow: '0 6px 16px rgba(0,0,0,0.05)',
  },
  stepNo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    background: '#2563eb',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 6,
  },
  stepText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 1.6,
  },

  split: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '64px 20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 36,
  },
  splitTitle: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 14,
  },
  list: {
    paddingLeft: 18,
    lineHeight: 2,
    color: '#334155',
  },
  infoCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 18,
    padding: 28,
    boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
  },
  infoTitle: {
    fontWeight: 700,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 1.7,
  },

  finalCta: {
    background: '#0f172a',
    color: '#ffffff',
    textAlign: 'center',
    padding: '72px 20px',
  },
  finalTitle: {
    fontSize: 30,
    fontWeight: 700,
    marginBottom: 12,
  },
  finalText: {
    fontSize: 15,
    opacity: 0.9,
    marginBottom: 24,
  },
  secondaryBtn: {
    background: '#ffffff',
    color: '#0f172a',
    border: 'none',
    padding: '14px 30px',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },

  footer: {
    background: '#020617',
    color: '#ffffff',
    textAlign: 'center',
    padding: 24,
  },
  footerText: {
    fontSize: 13,
    opacity: 0.75,
  },
};
