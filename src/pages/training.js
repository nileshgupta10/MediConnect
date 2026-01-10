export default function TrainingPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Training & Skill Development</h1>

      {/* MANAGEMENT */}
      <section style={styles.section}>
        <h2>Management Training</h2>
        <p style={styles.text}>
          Short management crash courses curated from Maharashtra-based pharmacy professionals.
        </p>

        <div style={styles.videoBox}>
          ▶ YouTube Video – Pharmacy Management Basics (Placeholder)
        </div>
      </section>

      {/* SOFTWARE */}
      <section style={styles.section}>
        <h2>Software Training</h2>
        <p style={styles.text}>
          Learn commonly used pharmacy software through guided tutorials.
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
        <h2>Mandatory Practical Training</h2>
        <p style={styles.text}>
          D.Pharmacy students are required to complete three months of practical
          training at a recognised pharmacy before license eligibility.
        </p>

        <p style={styles.note}>
          Selected verified pharmacies offer structured training programs.
          Completion will earn an <b>Industry-Ready</b> badge.
        </p>

        <div style={styles.infoBox}>
          Training listings will appear here.
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 900,
    margin: '0 auto',
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
  text: {
    fontSize: 14,
    color: '#475569',
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
  infoBox: {
    background: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    fontSize: 14,
    color: '#64748b',
  },
  note: {
    fontSize: 14,
    marginBottom: 10,
  },
};
