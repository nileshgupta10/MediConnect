import Link from 'next/link';

const ACCENT = '#1d4ed8';

export default function HomePage() {
  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.title}>
            Hiring and training for pharmacies,
            <br />
            built on <span style={styles.accent}>Connection</span>
          </h1>

          <p style={styles.subtitle}>
            MediClan is a verified platform that enables
            <span style={styles.accent}> Credibility</span>,
            clear processes, and genuine
            <span style={styles.accent}> Care</span>
            in pharmacy hiring and training.
          </p>

          <Link href="/simple-login">
            <button style={styles.primaryBtn}>
              Get Started
            </button>
          </Link>
        </div>
      </section>

      {/* PHILOSOPHY STRIP */}
      <section style={styles.philosophy}>
        <p>
          No agents. No noise. Just the right
          <span style={styles.accent}> Connections</span>
          , built with trust.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>How it works</h2>

        <div style={styles.steps}>
          <Step
            title="Verified profiles"
            text="Every pharmacist and pharmacy is manually verified for credibility."
          />
          <Step
            title="Clear training flow"
            text="Structured slots, requests, confirmations and scheduling."
          />
          <Step
            title="Confirmed meetings"
            text="Direct communication only after mutual confirmation."
          />
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section style={styles.split}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>For Pharmacies</h3>
          <ul style={styles.list}>
            <li>Hire verified pharmacists</li>
            <li>Offer structured training</li>
            <li>Build long-term trust</li>
          </ul>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>For Pharmacists</h3>
          <ul style={styles.list}>
            <li>Gain real-world experience</li>
            <li>Apply to genuine opportunities</li>
            <li>Know when and where to report</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta}>
        <h2 style={styles.ctaTitle}>
          Built with <span style={styles.accent}>Care</span>.
          <br />
          Designed for <span style={styles.accent}>Credibility</span>.
        </h2>

        <Link href="/simple-login">
          <button style={styles.secondaryBtn}>
            Create your profile
          </button>
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <b>MediClan</b>
        <p style={styles.footerText}>
          Relations, over the counter.
        </p>
      </footer>
    </div>
  );
}

function Step({ title, text }) {
  return (
    <div style={styles.step}>
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
    padding: '90px 20px 70px',
    background: '#f8fafc',
  },
  heroInner: {
    maxWidth: 900,
    margin: '0 auto',
  },
  title: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1.25,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 1.7,
    maxWidth: 600,
    marginBottom: 28,
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

  philosophy: {
    padding: '24px 20px',
    textAlign: 'center',
    fontSize: 15,
    color: '#334155',
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
  },

  section: {
    padding: '64px 20px',
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 36,
  },
  steps: {
    maxWidth: 900,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 28,
  },
  step: {
    padding: 24,
    borderLeft: `4px solid ${ACCENT}`,
    background: '#f8fafc',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 6,
  },
  stepText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 1.6,
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
    border: '1px solid #e5e7eb',
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
    background: '#0f172a',
    color: '#ffffff',
    textAlign: 'center',
    padding: '70px 20px',
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 20,
  },
  secondaryBtn: {
    background: '#ffffff',
    color: '#0f172a',
    border: 'none',
    padding: '12px 36px',
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 8,
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
