export default function PrivacyPolicy() {
  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.title}>Privacy Policy</h1>
        <p style={s.date}>Last updated: February 18, 2026</p>

        <section style={s.section}>
          <h2 style={s.heading}>Introduction</h2>
          <p style={s.text}>
            MediClan ("we", "our", or "us") operates mediclan.in (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Information We Collect</h2>
          <p style={s.text}>We collect the following types of information:</p>
          <ul style={s.list}>
            <li style={s.listItem}><b>Account Information:</b> Name, email address, and profile picture from your Google account</li>
            <li style={s.listItem}><b>Profile Information:</b> Pharmacy license details (for pharmacists), store name and location (for store owners), phone number, work experience, and software experience</li>
            <li style={s.listItem}><b>Job Information:</b> Job postings, applications, and appointment details</li>
            <li style={s.listItem}><b>Location Data:</b> Approximate location (latitude/longitude) to show nearby job opportunities</li>
          </ul>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>How We Use Your Information</h2>
          <p style={s.text}>We use the collected information for:</p>
          <ul style={s.list}>
            <li style={s.listItem}>Providing and maintaining our Service</li>
            <li style={s.listItem}>Connecting pharmacists with pharmacy job opportunities</li>
            <li style={s.listItem}>Verifying pharmacy licenses and credentials</li>
            <li style={s.listItem}>Facilitating communication between pharmacists and store owners</li>
            <li style={s.listItem}>Improving our Service and user experience</li>
          </ul>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Information Sharing</h2>
          <p style={s.text}>We share your information only in the following circumstances:</p>
          <ul style={s.list}>
            <li style={s.listItem}><b>With Store Owners:</b> When you apply for a job, your profile information (excluding phone number) is shared with the store owner. Phone numbers are only shared after appointment confirmation.</li>
            <li style={s.listItem}><b>With Pharmacists:</b> Store owners can view applicant profiles including verified license status</li>
            <li style={s.listItem}><b>With Admin:</b> MediClan admin can view profiles for verification purposes only</li>
            <li style={s.listItem}>We do NOT sell your personal information to third parties</li>
          </ul>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Data Security</h2>
          <p style={s.text}>
            We use industry-standard security measures to protect your data. Your information is stored securely using Supabase infrastructure with encryption. Pharmacy licenses are stored with signed URLs and time-limited access.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Your Rights</h2>
          <p style={s.text}>You have the right to:</p>
          <ul style={s.list}>
            <li style={s.listItem}>Access your personal data</li>
            <li style={s.listItem}>Update your profile information</li>
            <li style={s.listItem}>Request deletion of your account</li>
            <li style={s.listItem}>Withdraw consent at any time</li>
          </ul>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Cookies and Tracking</h2>
          <p style={s.text}>
            We use essential cookies for authentication and to maintain your session. We do not use tracking cookies or third-party analytics beyond what is necessary for the Service to function.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Changes to This Policy</h2>
          <p style={s.text}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Contact Us</h2>
          <p style={s.text}>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p style={s.text}>
            Email: <a href="mailto:askmediclan@gmail.com" style={{ color: '#0e9090', fontWeight: 700 }}>askmediclan@gmail.com</a><br />
            Website: mediclan.in
          </p>
        </section>

        <div style={s.footer}>
          <a href="/" style={s.link}>← Back to Home</a>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Nunito', 'Segoe UI', sans-serif", padding: '40px 20px' },
  container: { maxWidth: 800, margin: '0 auto', background: 'white', padding: '48px 40px', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  title: { fontSize: 36, fontWeight: 900, color: '#0f3460', marginBottom: 8 },
  date: { fontSize: 14, color: '#64748b', marginBottom: 32 },
  section: { marginBottom: 32 },
  heading: { fontSize: 22, fontWeight: 800, color: '#0f3460', marginBottom: 12 },
  text: { fontSize: 15, color: '#475569', lineHeight: 1.75, marginBottom: 12 },
  list: { marginLeft: 24, marginTop: 12, marginBottom: 12 },
  listItem: { fontSize: 15, color: '#475569', lineHeight: 1.75, marginBottom: 8 },
  footer: { marginTop: 48, paddingTop: 24, borderTop: '1px solid #e2e8f0' },
  link: { fontSize: 15, color: '#0e9090', fontWeight: 700, textDecoration: 'none' },
}