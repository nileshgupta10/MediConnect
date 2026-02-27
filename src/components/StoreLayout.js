import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function StoreLayout({ children }) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const nl = (path) => router.pathname === path ? s.activeLink : s.link

  return (
    <div style={s.wrap}>
      <nav style={s.nav}>
        <a href="/" style={s.brand}>
          <img src="/brand/mediclan-logo.png" alt="" style={s.logo} />
          <span style={s.brandTxt}>MediClan</span>
        </a>
        <a href="/store-profile" style={nl('/store-profile')}>Profile</a>
        <a href="/post-job" style={nl('/post-job')}>Jobs</a>
        <a href="/applicants" style={nl('/applicants')}>Applicants</a>
        <a href="/goods-returns" style={nl('/goods-returns')}>Returns</a>
        <button style={s.logout} onClick={handleLogout}>Logout</button>
      </nav>
      {children}
    </div>
  )
}

const s = {
  wrap: { minHeight: '100vh', background: '#f0fdfd' },
  nav: {
    background: 'white',
    borderBottom: '2px solid #e2e8f0',
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', alignItems: 'center',
    padding: '0 8px', gap: 2,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginRight: 4, flexShrink: 0 },
  logo: { width: 22, height: 22, objectFit: 'contain' },
  brandTxt: { fontSize: 13, fontWeight: 900, color: '#0f3460', whiteSpace: 'nowrap' },
  link: { fontSize: 12, fontWeight: 700, color: '#64748b', textDecoration: 'none', padding: '10px 7px', whiteSpace: 'nowrap', flexShrink: 0 },
  activeLink: { fontSize: 12, fontWeight: 800, color: '#0e9090', textDecoration: 'none', padding: '10px 7px', whiteSpace: 'nowrap', flexShrink: 0, borderBottom: '3px solid #0e9090' },
  logout: { marginLeft: 'auto', padding: '6px 10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
}