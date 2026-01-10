import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function Layout({ children }) {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const loadRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setRole(data?.role || null);
    };

    loadRole();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/simple-login';
  };

  return (
    <div>
      <nav style={styles.nav}>
        <div style={styles.brand}>MediConnect</div>

        <div style={styles.links}>
          {role === 'pharmacist' && (
            <>
              <NavLink href="/jobs">Jobs</NavLink>
              <NavLink href="/training">Training</NavLink>
              <NavLink href="/pharmacist-profile">Profile</NavLink>
            </>
          )}

          {role === 'store_owner' && (
            <>
              <NavLink href="/post-job">Post Job</NavLink>
              <NavLink href="/applicants">Applicants</NavLink>
              <NavLink href="/store-profile">Profile</NavLink>
            </>
          )}

          {role && (
            <button onClick={logout} style={styles.logout}>
              Logout
            </button>
          )}
        </div>
      </nav>

      <main style={styles.main}>{children}</main>
    </div>
  );
}

function NavLink({ href, children }) {
  return (
    <Link href={href}>
      <span style={styles.link}>{children}</span>
    </Link>
  );
}

const styles = {
  nav: {
    height: 56,
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    color: '#2563eb',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    fontSize: 14,
  },
  link: {
    cursor: 'pointer',
  },
  logout: {
    background: 'transparent',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: 14,
  },
  main: {
    padding: 16,
  },
};
