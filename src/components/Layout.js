import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session) router.push('/');
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setRole(data?.role));
  }, [user]);

  if (!user) return <>{children}</>;

  return (
    <div style={styles.page}>
      <header style={styles.nav}>
        <div style={styles.navInner}>
          <Link href="/">
            <b style={styles.brand}>MediClan</b>
          </Link>

          <nav style={styles.menu}>
            {role === 'pharmacist' && (
              <>
                <Link href="/jobs">Jobs</Link>
                <Link href="/training-apply">Training</Link>
                <Link href="/my-training">My Training</Link>
                <Link href="/pharmacist-profile">Profile</Link>
              </>
            )}

            {role === 'store_owner' && (
              <>
                <Link href="/post-job">Post Job</Link>
                <Link href="/applicants">Applicants</Link>
                <Link href="/training-slots">Training Slots</Link>
                <Link href="/training-requests">Training Requests</Link>
                <Link href="/store-profile">Profile</Link>
              </>
            )}

            <button
              style={styles.logout}
              onClick={() => supabase.auth.signOut()}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main style={styles.content}>{children}</main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
  },
  nav: {
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  navInner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 18,
    color: '#2563eb',
  },
  menu: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  logout: {
    background: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  content: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '28px 20px',
  },
};
