import Link from 'next/link';

export default function TrainingPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Training & Skill Development</h1>

      {/* MANAGEMENT TRAINING */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Management Training</h2>
        <p style={styles.text}>
          Short crash courses on pharmacy management, inventory discipline,
          and day-to-day operations, curated from Maharashtra-based professionals.
        </p>

        <div style={styles.videoBox}>
          ▶ YouTube Video: Pharmacy Management Basics (placeholder)
        </div>
      </section>

      {/* SOFTWARE TRAINING */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Software Training</h2>
        <p style={styles.text}>
          Learn commonly used pharmacy software through guided video tutorials.
        </p>

        <ul style={styles.list}>
          <li>Software 1 – Tutorial | Request Demo</li>
          <li>Software 2 – Tutorial | Request Demo</li>
          <li>Software 3 – Tutorial | Request Demo</li>
          <li>Software 4 – Tutorial | Request Demo</li>
          <li>Software 5 – Tutorial | Request Demo</li>
        </ul>
      </section>

      {/* MANDATORY TRAINING */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Mandatory Practical Training</h2>
        <p style={styles.text}>
          D.Pharmacy students are required to complete three months of practical
          training at a recognised pharmacy before becoming eligible for a license.
        </p>

        <p style={styles.note}>
          Selected verified pharmacies offer structured training programs.
          Completion of training earns an <b>Industry-Ready</b> badge.
        </p>

        <Link href="/training/mandatory">
          <span style={styles.link}>
            View training pharmacies →
          </span>
        </Link>
      </section>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: {
    maxWidth: 900,
    margin: '0 auto',
    padding: 16,
  },
  heading: {
    fontSize: 24,
    marginBottom: 20,
  },
  section: {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  note: {
    fontSize: 14,
    marginBottom: 12,
  },
  list: {
    paddingLeft: 20,
    fontSize: 14,
    lineHeight: 1.8,
  },
  videoBox: {
    background: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    fontSize: 14,
  },
  link: {
    color: '#2563eb',
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: 500,
  },
};
