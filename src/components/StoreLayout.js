import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function StoreLayout({ children }) {
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
          </div>
          <div style={s.navLinks}>
            <a href="/store-profile" style={router.pathname === '/store-profile' ? s.activeLink : s.link}>
              🏪 Profile
            </a>
            <a href="/post-job" style={router.pathname === '/post-job' ? s.activeLink : s.link}>
              💼 Jobs
            </a>
            <a href="/applicants" style={router.pathname === '/applicants' ? s.activeLink : s.link}>
              👥 Applicants
            </a>
            <a href="/goods-returns" style={router.pathname === '/goods-returns' ? s.activeLink : s.link}>
              📦 Returns
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
  layout: { minHeight: '100vh', background: '#f0fdfd' },
  nav: { background: 'white', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 },
  navInner: { maxWidth: 1200, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', justifyContent: 'space-between' },
  brand: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  logo: { width: 28, height: 28, objectFit: 'contain' },
  brandText: { fontSize: 16, fontWeight: 900, color: '#0f3460' },
  navLinks: { display: 'flex', gap: 4, flexWrap: 'nowrap', flexShrink: 0 },
  link: { fontSize: 13, fontWeight: 700, color: '#64748b', textDecoration: 'none', padding: '7px 10px', borderRadius: 8, transition: 'all 0.2s', whiteSpace: 'nowrap' },
  activeLink: { fontSize: 13, fontWeight: 800, color: '#0e9090', textDecoration: 'none', padding: '7px 10px', borderRadius: 8, background: '#e0f7f7', whiteSpace: 'nowrap' },
  logoutBtn: { padding: '7px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  content: { minHeight: 'calc(100vh - 60px)' },
}