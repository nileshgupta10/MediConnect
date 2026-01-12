export default function Training() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Training Module</h1>

        <p style={styles.intro}>
          MediConnect training resources are designed to help pharmacists
          and students become industry-ready.
        </p>

        <hr />

        <h3>🧠 Management Training</h3>
        <ul>
          <li>Customer handling basics</li>
          <li>Inventory discipline</li>
          <li>Prescription workflow understanding</li>
        </ul>

        <h3>💻 Software Training</h3>
        <ul>
          <li>
            <a
              href="https://youtu.be/Od9fwj8mOOk"
              target="_blank"
              rel="noreferrer"
              style={styles.link}
            >
              CARE Pharmacy Software – Basic Walkthrough (YouTube)
            </a>
          </li>
        </ul>

        <h3>🏥 Mandatory Industry Training</h3>
        <p>
          Selected pharmacies offer mandatory 3-month industry training.
        </p>

        <p style={styles.note}>
          🔒 Mandatory training requests will be enabled after admin approval.
        </p>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 20,
  },
  card: {
    background: 'white',
    padding: 30,
    borderRadius: 12,
    maxWidth: 600,
    width: '100%',
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
  },
  heading: {
    fontSize: 26,
    marginBottom: 10,
  },
  intro: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 20,
  },
  link: {
    color: '#2563eb',
    textDecoration: 'underline',
  },
  note: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
};
