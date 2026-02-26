import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function AdminLayout({ children, activeSection }) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={s.layout}>
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.brand}>
            <img src="/brand/mediclan-logo.png" alt="MediClan" style={s.logo} />
            <span style={s.brandText}>MediClan</span>
            <span style={s.adminTag}>Admin</span>
          </div>
          <div style={s.navLinks}>
            <a href="/admin?section=pharmacists" style={activeSection === 'pharmacists' ? s.activeLink : s.link}>
              💊 Pharmacists
            </a>
            <a href="/admin?section=stores" style={activeSection === 'stores' ? s.activeLink : s.link}>
              🏪 Stores
            </a>
            <a href="/admin?section=jobs" style={activeSection === 'jobs' ? s.activeLink : s.link}>
              💼 Jobs
            </a>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>
      <div style={s.content}>
        {children}
      </div>
    </div>
  )
}

const s = {
  layout: { minHeight: '100vh', background: '#f8fafc' },
  nav: { background: 'white', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 },
  navInner: { maxWidth: 1200, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', justifyContent: 'space-between' },
  brand: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  logo: { width: 28, height: 28, objectFit: 'contain' },
  brandText: { fontSize: 16, fontWeight: 900, color: '#0f3460' },
  adminTag: { background: '#2563eb', color: 'white', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 },
  navLinks: { display: 'flex', gap: 4, flexWrap: 'nowrap', flexShrink: 0 },
  link: { fontSize: 13, fontWeight: 700, color: '#64748b', textDecoration: 'none', padding: '7px 10px', borderRadius: 8, whiteSpace: 'nowrap' },
  activeLink: { fontSize: 13, fontWeight: 800, color: '#2563eb', textDecoration: 'none', padding: '7px 10px', borderRadius: 8, background: '#eff6ff', whiteSpace: 'nowrap' },
  logoutBtn: { padding: '7px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  content: { minHeight: 'calc(100vh - 60px)' },
}