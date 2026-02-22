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
      {/* Top Navigation */}
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
            <a href="/goods-returns" style={router.pathname === '/goods-returns' ? s.activeLink : s.link}>
              📦 Returns
            </a>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>
      
      {/* Page Content */}
      <div style={s.content}>
        {children}
      </div>
    </div>
  )
}

const s = {
  layout: { minHeight: '100vh', background: '#f0fdfd' },
  nav: { background: 'white', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 },
  navInner: { maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  logo: { width: 32, height: 32, objectFit: 'contain' },
  brandText: { fontSize: 18, fontWeight: 900, color: '#0f3460' },
  navLinks: { display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' },
  link: { fontSize: 14, fontWeight: 700, color: '#64748b', textDecoration: 'none', padding: '8px 12px', borderRadius: 8, transition: 'all 0.2s', whiteSpace: 'nowrap' },
  activeLink: { fontSize: 14, fontWeight: 800, color: '#0e9090', textDecoration: 'none', padding: '8px 12px', borderRadius: 8, background: '#e0f7f7', whiteSpace: 'nowrap' },
  logoutBtn: { padding: '8px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  content: { minHeight: 'calc(100vh - 60px)' },
}
```

---

## Quick Summary of Navigation Structure:

**Top Nav (Always Visible):**
```
MediClan Logo | Profile | Jobs | Returns | .................... Logout
```

**Jobs Page Content:**
```
[Banner]
👥 View Applicants & Appointments → [clickable link]
[Post Job Form]
[My Jobs Tabs]