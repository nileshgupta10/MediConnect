import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function StoreLayout({ children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unseenCount, setUnseenCount] = useState(0)
  const [remarkUnseen, setRemarkUnseen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (mounted) setLoading(false)
        return
      }

      const [profileRes, jobsRes] = await Promise.all([
        supabase
          .from('store_profiles')
          .select('store_name, is_verified, khata_premium_unlocked, remark_seen')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('jobs')
          .select('id')
          .eq('store_owner_id', user.id)
      ])

      const data = profileRes.data
      const jobs = jobsRes.data

      let count = 0
      if (jobs && jobs.length > 0) {
        const jobIds = jobs.map(j => j.id)
        const { count: unseenRes } = await supabase
          .from('job_applications')
          .select('id', { count: 'exact', head: true })
          .in('job_id', jobIds)
          .eq('seen', false)
        if (unseenRes) {
          count = unseenRes
        }
      }

      if (mounted) {
        setProfile(data)
        setRemarkUnseen(data ? data.remark_seen === false : false)
        setUnseenCount(count)
        setLoading(false)
      }
    }
    checkProfile()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (loading) return
    const path = router.pathname
    const hasDetails = !!profile?.store_name
    const isVerified = !!profile?.is_verified
    const premiumUnlocked = !!profile?.khata_premium_unlocked

    if (path === '/khata') {
      if (!hasDetails) {
        router.replace('/store-profile')
      } else if (!premiumUnlocked) {
        router.replace('/khata-simple')
      }
    } else if (path === '/khata-simple') {
      if (!hasDetails) {
        router.replace('/store-profile')
      }
    } else if (path === '/bill-converter') {
      if (!hasDetails) {
        router.replace('/store-profile')
      }
    } else if (path === '/post-job' || path === '/applicants') {
      if (!isVerified) {
        router.replace('/store-profile')
      }
    }
  }, [loading, profile, router.pathname])

  // Close mobile menu on route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [router.pathname])

  const handleLogout = async () => {
    setMobileMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  const hasDetails = !!profile?.store_name
  const isVerified = !!profile?.is_verified
  const premiumUnlocked = !!profile?.khata_premium_unlocked

  const tabs = [
    { label: 'Home', path: '/store-profile', allowed: true },
    { label: 'Bill Conv', path: '/bill-converter', allowed: hasDetails, lockMsg: 'Please complete your store profile name and location details first.' },
    { label: 'Khaata', path: '/khata-simple', allowed: hasDetails, lockMsg: 'Please complete your store profile name and location details first.', isKhaata: true },
    { label: 'Khaata Premium', path: '/khata', allowed: hasDetails && premiumUnlocked, lockMsg: !hasDetails ? 'Please complete your store profile name and location details first.' : 'Khaata Premium unlocks after your upgrade payment is verified by the admin.', isKhaata: true },
    { label: 'Jobs', path: '/post-job', allowed: isVerified, lockMsg: 'Jobs tab unlocks only after your store is verified by the administrator.' },
    { label: 'Insurance', path: '/insurance-leads', allowed: hasDetails, lockMsg: 'Please complete your store profile name and location details first.' },
    { label: 'Rx Vault', path: '/prescription-vault', allowed: hasDetails, lockMsg: 'Please complete your store profile name and location details first.' }
  ]

  const renderTab = (tab, isMobile = false) => {
    const isActive = router.pathname === tab.path
    const style = isActive ? s.activeLink : (tab.allowed ? s.link : s.lockedLink)
    const combinedStyle = isMobile ? { ...style, ...s.mobileTabLink } : style

    if (!tab.allowed) {
      return (
        <span 
          key={tab.path} 
          style={{
            ...combinedStyle,
            ...(tab.isKhaata ? { fontVariant: 'small-caps', textTransform: 'none' } : {})
          }} 
          title={tab.lockMsg}
          onClick={() => {
            if (isMobile) {
              alert(tab.lockMsg)
            }
          }}
        >
          {tab.label}
          {tab.label === 'Jobs' && unseenCount > 0 && (
            <span style={s.badge}>{unseenCount}</span>
          )}
          {' '}🔒
        </span>
      )
    }

    return (
      <Link 
        key={tab.path} 
        href={tab.path} 
        onClick={() => setMobileMenuOpen(false)}
        style={{
          ...combinedStyle,
          ...(tab.isKhaata ? { fontVariant: 'small-caps', textTransform: 'none' } : {})
        }}
      >
        {tab.label}
        {tab.label === 'Jobs' && unseenCount > 0 && (
          <span style={s.badge}>{unseenCount}</span>
        )}
        {tab.label === 'Home' && remarkUnseen && (
          <span style={s.badge}>!</span>
        )}
      </Link>
    )
  }

  return (
    <div style={s.wrap}>
      <nav style={s.nav}>
        <Link href="/store-profile" style={s.brand}>
          <img src="/brand/mediclan-logo.png" alt="" style={s.logo} />
          <span style={s.brandTxt}>MediClan</span>
        </Link>

        {/* Hamburger Button (visible on mobile only) */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="nav-hamburger"
          style={s.hamburger}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Desktop Links (hidden on mobile) */}
        <div className="nav-desktop-links">
          {tabs.map((tab) => renderTab(tab, false))}
          <Link href="/store-profile?edit=1" style={s.editLink}>✏️ Edit Profile</Link>
          <button style={s.logout} onClick={handleLogout}>Logout</button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="nav-mobile-panel" style={s.mobilePanel}>
            {tabs.map((tab) => renderTab(tab, true))}
            <Link href="/store-profile?edit=1" style={{ ...s.editLink, ...s.mobileTabLink }} onClick={() => setMobileMenuOpen(false)}>✏️ Edit Profile</Link>
            <div style={s.mobileLogoutWrapper}>
              <button style={{ ...s.logout, ...s.mobileLogoutBtn }} onClick={handleLogout}>Logout</button>
            </div>
          </div>
        )}
      </nav>

      {/* Styled JSX overrides */}
      <style jsx global>{`
        @media (max-width: 767px) {
          nav {
            overflow-x: visible !important;
            position: relative !important;
          }
          .nav-desktop-links {
            display: none !important;
          }
          .nav-hamburger {
            display: flex !important;
          }
          .nav-mobile-panel {
            display: flex !important;
          }
        }
        @media (min-width: 768px) {
          .nav-desktop-links {
            display: flex !important;
            align-items: center;
            flex-grow: 1;
            gap: 4px;
          }
          .nav-hamburger {
            display: none !important;
          }
          .nav-mobile-panel {
            display: none !important;
          }
        }
      `}</style>

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
    padding: '0 12px', gap: '4px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 24, flexShrink: 0 },
  logo: { width: 24, height: 24, objectFit: 'contain' },
  brandTxt: { fontSize: 14, fontWeight: 900, color: '#0f3460', whiteSpace: 'nowrap' },
  link: { fontSize: 12, fontWeight: 700, color: '#64748b', textDecoration: 'none', padding: '14px 10px', whiteSpace: 'nowrap', flexShrink: 0 },
  activeLink: { fontSize: 12, fontWeight: 800, color: '#0e9090', textDecoration: 'none', padding: '14px 10px', whiteSpace: 'nowrap', flexShrink: 0, borderBottom: '3px solid #0e9090' },
  lockedLink: { 
    fontSize: 12, 
    fontWeight: 700, 
    color: '#94a3b8', 
    textDecoration: 'none', 
    padding: '14px 10px', 
    whiteSpace: 'nowrap', 
    flexShrink: 0,
    cursor: 'not-allowed',
    opacity: 0.65,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  logout: { marginLeft: 'auto', padding: '8px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 9999, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  editLink: { fontSize: 12, fontWeight: 700, color: '#0e9090', textDecoration: 'none', padding: '14px 10px', whiteSpace: 'nowrap', flexShrink: 0, opacity: 0.8 },
  badge: {
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '9999px',
    marginLeft: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    lineHeight: '1'
  },
  hamburger: {
    background: 'transparent',
    border: 'none',
    fontSize: 24,
    cursor: 'pointer',
    padding: '8px 12px',
    color: '#0f3460',
    outline: 'none',
    marginLeft: 'auto',
  },
  mobilePanel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    borderBottom: '2px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
  },
  mobileTabLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    fontSize: '14px',
    borderBottom: '1px solid #f1f5f9',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'left',
    cursor: 'pointer',
    flexShrink: 0,
    marginLeft: 0,
    marginRight: 0,
  },
  mobileLogoutWrapper: {
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'flex-start',
    background: '#fafafa',
  },
  mobileLogoutBtn: {
    marginLeft: 0,
    width: '100%',
    textAlign: 'center',
    justifyContent: 'center',
    display: 'flex',
  }
}