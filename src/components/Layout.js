import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
    });

    // Listen for auth changes (NO REDIRECTS HERE)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setRole(data?.role || null));
  }, [user]);

  // ⚠️ IMPORTANT:
  // If no user, DO NOT block rendering.
  // Auth pages handle redirects themselves.
  if (!user) return <>{children}</>;

  return (
    <div style={styles.page}>
      <header style={styles.nav}>
        <div style={styles.navInner}>
          <Link href="/">
            <span style={styles.brand}>MediClan</span>
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
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/');
              }}
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
    borderBottom: '1px solid #e2e8f0',
  },

  navInner: {
    maxWidth: 980,
    margin: '0 auto',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  brand: {
    fontSize: 18,
    fontWeight: 500,
    color: '#0f172a',
    cursor: 'pointer',
  },

  menu: {
    display: 'flex',
    gap: 18,
    alignItems: 'center',
    fontSize: 14,
  },

  logout: {
    background: 'transparent',
    color: '#0ea5a4',
    border: '1px solid #cbd5e1',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },

  content: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '32px 20px',
  },
};
