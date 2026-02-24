export default function Contact() {
  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.iconWrap}>📬</div>
        <h1 style={s.title}>Contact Us</h1>
        <p style={s.sub}>
          Have a question, feedback, or need help? We're happy to hear from you.
        </p>

        <div style={s.emailCard}>
          <p style={s.emailLabel}>REACH US AT</p>
          <a href="mailto:askmediclan@gmail.com" style={s.emailLink}>
            askmediclan@gmail.com
          </a>
          <p style={s.emailNote}>We typically respond within 1–2 business days.</p>
        </div>

        <div style={s.footer}>
          <a href="/" style={s.link}>← Back to Home</a>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Nunito', 'Segoe UI', sans-serif", padding: '60px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  container: { maxWidth: 480, width: '100%', background: 'white', padding: '48px 40px', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' },
  iconWrap: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 900, color: '#0f3460', marginBottom: 12 },
  sub: { fontSize: 15, color: '#64748b', lineHeight: 1.75, marginBottom: 32 },
  emailCard: { background: '#f0fdfd', border: '1.5px solid #99f6e4', borderRadius: 14, padding: '24px 28px', marginBottom: 32 },
  emailLabel: { fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  emailLink: { display: 'block', fontSize: 20, fontWeight: 900, color: '#0e9090', textDecoration: 'none' },
  emailNote: { fontSize: 13, color: '#64748b', marginTop: 10 },
  footer: { marginTop: 8 },
  link: { fontSize: 15, color: '#0e9090', fontWeight: 700, textDecoration: 'none' },
}
