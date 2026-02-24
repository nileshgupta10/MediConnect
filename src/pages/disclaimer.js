export default function Disclaimer() {
  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.title}>Disclaimer</h1>
        <p style={s.date}>Last updated: February 24, 2026</p>

        <section style={s.section}>
          <h2 style={s.heading}>Platform Role</h2>
          <p style={s.text}>
            MediClan (mediclan.in) is an online platform that connects pharmacists with pharmacy store owners in India. We are a facilitator only — we do not employ pharmacists, operate pharmacy stores, or guarantee any employment outcomes.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>No Employment Guarantee</h2>
          <p style={s.text}>
            MediClan does not guarantee that any pharmacist will find employment, or that any store owner will successfully hire a candidate through the platform. All hiring decisions are made solely between the pharmacist and the store owner.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Verification Limitations</h2>
          <p style={s.text}>
            While MediClan manually reviews pharmacy licenses and store profiles, we cannot guarantee the absolute accuracy or authenticity of information provided by users. Verification is carried out in good faith based on documents submitted. Users are encouraged to exercise their own due diligence before entering into any employment arrangement.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>User Responsibility</h2>
          <p style={s.text}>
            All users are solely responsible for the accuracy of information they provide on the platform. MediClan shall not be held liable for any loss, damage, or dispute arising from false, misleading, or incomplete information submitted by users.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Third-Party Services</h2>
          <p style={s.text}>
            MediClan uses third-party services including Google (authentication and maps) and Supabase (data storage). We are not responsible for the availability, accuracy, or policies of these third-party services.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>No Medical or Legal Advice</h2>
          <p style={s.text}>
            Nothing on this platform constitutes medical, legal, or professional advice. MediClan is a job marketplace only. All professional decisions — including hiring, employment terms, and workplace conditions — are the sole responsibility of the parties involved.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Service Availability</h2>
          <p style={s.text}>
            MediClan does not guarantee uninterrupted or error-free access to the platform. We reserve the right to modify, suspend, or discontinue the Service at any time without prior notice.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Disputes Between Users</h2>
          <p style={s.text}>
            MediClan is not responsible for any disputes, claims, or disagreements that arise between pharmacists and store owners. Any such disputes must be resolved directly between the parties involved.
          </p>
        </section>

        <section style={s.section}>
          <h2 style={s.heading}>Contact Us</h2>
          <p style={s.text}>
            For any questions or concerns regarding this Disclaimer, please contact us at:
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
  footer: { marginTop: 48, paddingTop: 24, borderTop: '1px solid #e2e8f0' },
  link: { fontSize: 15, color: '#0e9090', fontWeight: 700, textDecoration: 'none' },
}