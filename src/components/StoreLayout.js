import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function StoreLayout({ children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unseenCount, setUnseenCount] = useState(0)

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
          .select('store_name, is_verified, khata_premium_unlocked')
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const hasDetails = !!profile?.store_name
  const isVerified = !!profile?.is_verified
  const premiumUnlocked = !!profile?.khata_premium_unlocked

  const tabs = [
    { label: 'Profile', path: '/store-profile', allowed: true },
    { label: 'Bill Conv', path: '/bill-converter', allowed: hasDetails, lockMsg: 'Please complete your store profile name and location details first.' },
    { label: 'Khaata', path: '/khata-simple', allowed: hasDetails, lockMsg: 'Please complete your store profile name and location details first.', isKhaata: true },
    { label: 'Khaata Premium', path: '/khata', allowed: hasDetails && premiumUnlocked, lockMsg: !hasDetails ? 'Please complete your store profile name and location details first.' : 'Khaata Premium unlocks after your upgrade payment is verified by the admin.', isKhaata: true },
    { label: 'Jobs', path: '/post-job', allowed: isVerified, lockMsg: 'Jobs tab unlocks only after your store is verified by the administrator.' },
    { label: 'Applicants', path: '/applicants', allowed: isVerified, lockMsg: 'Applicants tab unlocks only after your store is verified by the administrator.' },
    { label: 'Rx Vault', path: '/prescription-vault', allowed: hasDetails, lockMsg: 'Please complete your store profile name and location details first.' }
  ]

  return (
    <div style={s.wrap}>
      <nav style={s.nav}>
        <Link href="/store-profile" style={s.brand}>
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
                {tab.label}
                {tab.label === 'Applicants' && unseenCount > 0 && (
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
              style={{
                ...style,
                ...(tab.isKhaata ? { fontVariant: 'small-caps', textTransform: 'none' } : {})
              }}
            >
              {tab.label}
              {tab.label === 'Applicants' && unseenCount > 0 && (
                <span style={s.badge}>{unseenCount}</span>
              )}
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
  }
}