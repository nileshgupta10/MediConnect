import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function StoreLayout({ children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (mounted) setLoading(false)
        return
      }
      const { data } = await supabase
        .from('store_profiles')
        .select('store_name, is_verified')
        .eq('user_id', user.id)
        .maybeSingle()
      if (mounted) {
        setProfile(data)
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

    if (path === '/bill-converter' || path === '/khata') {
      if (!hasDetails) {
        router.replace('/store-profile')
      }
    } else if (path === '/post-job' || path === '/applicants') {
      if (!isVerified) {
        router.replace('/store-profile')
      }
    }
  }, [loading, profile, router.pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const hasDetails = !!profile?.store_name
  const isVerified = !!profile?.is_verified

  const tabs = [
    { label: 'Profile', path: '/store-profile', allowed: true },
    { label: 'Bill Conv', path: '/bill-converter', allowed: hasDetails, lockMsg: 'Please complete your store profile name and location details first.' },
    { label: 'Khaata', path: '/khata', allowed: hasDetails, lockMsg: 'Please complete your store profile name and location details first.', isKhaata: true },
    { label: 'Jobs', path: '/post-job', allowed: isVerified, lockMsg: 'Jobs tab unlocks only after your store is verified by the administrator.' },
    { label: 'Applicants', path: '/applicants', allowed: isVerified, lockMsg: 'Applicants tab unlocks only after your store is verified by the administrator.' }
  ]

  return (
    <div style={s.wrap}>
      <nav style={s.nav}>
        <Link href="/" style={s.brand}>
          <img src="/brand/mediclan-logo.png" alt="" style={s.logo} />
          <span style={s.brandTxt}>MediClan</span>
        </Link>
        {tabs.map((tab) => {
          const isActive = router.pathname === tab.path
          const style = isActive ? s.activeLink : (tab.allowed ? s.link : s.lockedLink)
          
          if (!tab.allowed) {
            return (
              <span 
                key={tab.path} 
                style={{
                  ...style,
                  ...(tab.isKhaata ? { fontVariant: 'small-caps', textTransform: 'none' } : {})
                }} 
                title={tab.lockMsg}
              >
                {tab.label} 🔒
              </span>
            )
          }

          return (
            <Link 
              key={tab.path} 
              href={tab.path} 
              style={{
                ...style,
                ...(tab.isKhaata ? { fontVariant: 'small-caps', textTransform: 'none' } : {})
              }}
            >
              {tab.label}
            </Link>
          )
        })}
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
    padding: '0 24px', gap: '24px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
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
}