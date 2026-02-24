export default function TermsOfService() {
  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.title}>Terms of Service</h1>
        <p style={s.date}>Last updated: February 18, 2026</p>

        <section style={s.section}>
          <h2 style={s.heading}>Agreement to Terms</h2>
          <p style={s.text}>
            By accessing or using MediClan (mediclan.in), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the Service.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Description of Service</h2>
          <p style={s.text}>
            MediClan is an employment platform that connects pharmacists with pharmacy store owners in India. The Service allows:
          </p>
          <ul style={s.list}>
            <li style={s.listItem}>Pharmacists to create profiles, upload credentials, and apply for jobs</li>
            <li style={s.listItem}>Store owners to post job openings and review applicants</li>
            <li style={s.listItem}>Direct communication and appointment scheduling between parties</li>
          </ul>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>User Accounts</h2>
          <p style={s.text}>
            To use MediClan, you must:
          </p>
          <ul style={s.list}>
            <li style={s.listItem}>Be at least 18 years of age</li>
            <li style={s.listItem}>Register using a valid Google account</li>
            <li style={s.listItem}>Provide accurate and complete information</li>
            <li style={s.listItem}>Maintain the security of your account</li>
            <li style={s.listItem}>Select one role (pharmacist or store owner) which cannot be changed</li>
          </ul>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>User Responsibilities</h2>
          <p style={s.text}><b>For Pharmacists:</b></p>
          <ul style={s.list}>
            <li style={s.listItem}>You must upload a valid, current pharmacy license</li>
            <li style={s.listItem}>All credentials and experience information must be truthful</li>
            <li style={s.listItem}>You are responsible for attending confirmed appointments</li>
          </ul>
          <p style={s.text}><b>For Store Owners:</b></p>
          <ul style={s.list}>
            <li style={s.listItem}>Job postings must be genuine and for actual pharmacy positions</li>
            <li style={s.listItem}>You may post a maximum of 2 active jobs at any time</li>
            <li style={s.listItem}>You must treat applicants professionally and respectfully</li>
          </ul>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Verification Process</h2>
          <p style={s.text}>
            MediClan admin manually reviews all pharmacist licenses and store profiles. Verification does not guarantee employment or the quality of candidates. MediClan is a platform for connecting parties and is not responsible for employment outcomes.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Prohibited Activities</h2>
          <p style={s.text}>You may not:</p>
          <ul style={s.list}>
            <li style={s.listItem}>Post false or misleading information</li>
            <li style={s.listItem}>Upload fake or expired credentials</li>
            <li style={s.listItem}>Harass, abuse, or discriminate against other users</li>
            <li style={s.listItem}>Use the Service for any illegal purpose</li>
            <li style={s.listItem}>Attempt to access another user's account</li>
            <li style={s.listItem}>Scrape, copy, or misuse data from the platform</li>
          </ul>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Job Posting Limits</h2>
          <p style={s.text}>
            Store owners are limited to 2 active job postings at any time. Jobs automatically expire after 30 days. You must hold, close, or delete existing jobs to post new ones.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Privacy</h2>
          <p style={s.text}>
            Your use of the Service is also governed by our Privacy Policy. Phone numbers are only shared after appointment confirmation. We do not sell user data.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Disclaimer of Warranties</h2>
          <p style={s.text}>
            MediClan is provided "as is" without any warranties. We do not guarantee:
          </p>
          <ul style={s.list}>
            <li style={s.listItem}>The accuracy of information provided by users</li>
            <li style={s.listItem}>Employment outcomes or successful matches</li>
            <li style={s.listItem}>That the Service will be uninterrupted or error-free</li>
          </ul>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Limitation of Liability</h2>
          <p style={s.text}>
            MediClan shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service. We are not responsible for disputes between pharmacists and store owners.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Account Termination</h2>
          <p style={s.text}>
            We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity. You may request account deletion at any time.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Changes to Terms</h2>
          <p style={s.text}>
            We may update these Terms of Service at any time. Continued use of the Service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Governing Law</h2>
          <p style={s.text}>
            These Terms shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Maharashtra, India.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Contact Information</h2>
          <p style={s.text}>
            For questions about these Terms, contact us at:
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