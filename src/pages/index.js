import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.brand}>MediConnect</div>

          <h1 style={styles.heroTitle}>
            Trusted hiring & training for pharmacies
          </h1>

          <p style={styles.heroSubtitle}>
            A verification-first platform that connects pharmacies with
            reliable pharmacists — and builds industry-ready talent through
            structured training.
          </p>

          <div style={styles.heroCta}>
            <Link href="/simple-login">
              <button style={styles.primaryBtn}>Get Started</button>
            </Link>
            <span style={styles.ctaHint}>Free • Secure • No agents</span>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={styles.trustStrip}>
        <div style={styles.trustGrid}>
          <TrustItem title="Manual Verification" text="Licenses are reviewed by an admin — not auto-approved." />
          <TrustItem title="Privacy First" text="Contact details unlock only at the right stage." />
          <TrustItem title="India-Ready" text="Built for real pharmacy workflows and timings." />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How MediConnect works</h2>

        <div style={styles.steps}>
          <Step
            step="1"
            title="Sign in securely"
            text="Simple Google sign-in. No passwords to remember."
          />
          <Step
            step="2"
            title="Verify & apply"
            text="Upload license. Apply for jobs or training only after verification."
          />
          <Step
            step="3"
            title="Schedule confidently"
            text="Slots, confirmations, and direct contact — all at the right time."
          />
        </div>
      </section>

      {/* FOR PHARMACIES */}
      <section style={styles.split}>
        <div style={styles.splitText}>
          <h3 style={styles.splitTitle}>For Pharmacy Owners</h3>
          <ul style={styles.list}>
            <li>Hire verified pharmacists</li>
            <li>Offer structured industry training</li>
            <li>Schedule meetings without chaos</li>
            <li>Reduce dependency on agents</li>
          </ul>
        </div>
        <div style={styles.splitCard}>
          <p style={styles.cardTitle}>Why it matters</p>
          <p style={styles.cardText}>
            Better hiring and training improves compliance, service quality,
            and long-term trust with patients.
          </p>
        </div>
      </section>

      {/* FOR PHARMACISTS */}
      <section style={{ ...styles.split, background: '#f8fafc' }}>
        <div style={styles.splitCard}>
          <p style={styles.cardTitle}>Industry-ready growth</p>
          <p style={styles.cardText}>
            Training slots, clear scheduling, and direct coordination help you
            build real-world skills — not just resumes.
          </p>
        </div>
        <div style={styles.splitText}>
          <h3 style={styles.splitTitle}>For Pharmacists</h3>
          <ul style={styles.list}>
            <li>Verified profiles increase trust</li>
            <li>Apply to real training slots</li>
            <li>Clear meeting confirmations</li>
            <li>Direct communication at the right stage</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta}>
        <h2 style={styles.ctaTitle}>Built for trust. Designed for clarity.</h2>
        <p style={styles.ctaText}>
          Start with a verified profile and experience a calmer, more reliable
          way to hire and train.
        </p>
        <Link href="/simple-login">
          <button style={styles.secondaryBtn}>Create your profile</button>
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

function TrustItem({ title, text }) {
  return (
    <div style={styles.trustItem}>
      <p style={styles.trustTitle}>{title}</p>
      <p style={styles.trustText}>{text}</p>
    </div>
  );
}

function Step({ step, title, text }) {
  return (
    <div style={styles.stepCard}>
      <div style={styles.stepNo}>{step}</div>
      <h3 style={styles.stepTitle}>{title}</h3>
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
    background: 'linear-gradient(180deg, #eff6ff, #ffffff)',
    padding: '64px 20px',
  },
  heroInner: {
    maxWidth: 920,
    margin: '0 auto',
  },
  brand: {
    fontSize: 22,
    fontWeight: 700,
    color: '#2563eb',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 14,
  },
  heroSubtitle: {
    fontSize: 17,
    color: '#334155',
    maxWidth: 680,
    lineHeight: 1.6,
    marginBottom: 26,
  },
  heroCta: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  primaryBtn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '14px 26px',
    borderRadius: 10,
    fontSize: 16,
    cursor: 'pointer',
  },
  ctaHint: {
    fontSize: 13,
    color: '#475569',
  },

  trustStrip: {
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    background: '#ffffff',
    padding: '18px 20px',
  },
  trustGrid: {
    maxWidth: 920,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  },
  trustItem: {
    padding: 12,
  },
  trustTitle: {
    fontWeight: 600,
    marginBottom: 4,
  },
  trustText: {
    fontSize: 14,
    color: '#475569',
  },

  section: {
    padding: '56px 20px',
    background: '#ffffff',
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: 600,
    marginBottom: 28,
  },
  steps: {
    maxWidth: 920,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 18,
  },
  stepCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 20,
  },
  stepNo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    background: '#2563eb',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    marginBottom: 10,
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
    maxWidth: 920,
    margin: '0 auto',
    padding: '56px 20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
  },
  splitText: {},
  splitTitle: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 14,
  },
  list: {
    paddingLeft: 18,
    lineHeight: 1.9,
    color: '#334155',
  },
  splitCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 24,
  },
  cardTitle: {
    fontWeight: 600,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 1.7,
  },

  cta: {
    background: '#0f172a',
    color: '#ffffff',
    padding: '56px 20px',
    textAlign: 'center',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: 600,
    marginBottom: 10,
  },
  ctaText: {
    fontSize: 15,
    opacity: 0.9,
    marginBottom: 20,
  },
  secondaryBtn: {
    background: '#ffffff',
    color: '#0f172a',
    border: 'none',
    padding: '14px 26px',
    borderRadius: 10,
    fontSize: 16,
    cursor: 'pointer',
  },

  footer: {
    background: '#020617',
    color: '#ffffff',
    textAlign: 'center',
    padding: 22,
  },
  footerText: {
    fontSize: 13,
    opacity: 0.8,
  },
};
