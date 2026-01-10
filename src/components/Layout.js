import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUser(user);

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setRole(data?.role || null);
    };

    loadUser();
  }, []);

  if (!user) return <>{children}</>;

  const isAdmin = user.email === ADMIN_EMAIL;

  return (
    <>
      {/* 🔝 TOP NAV BAR */}
      <div
        style={{
          padding: 12,
          borderBottom: '1px solid #ddd',
          display: 'flex',
          gap: 16,
        }}
      >
        {/* Pharmacist Nav */}
        {role === 'pharmacist' && (
          <>
            <Link href="/jobs">Jobs</Link>
            <Link href="/training">Training</Link>
            <Link href="/pharmacist-profile">Profile</Link>
          </>
        )}

        {/* Store Owner Nav */}
        {role === 'store_owner' && (
          <>
            <Link href="/post-job">Post Job</Link>
            <Link href="/applicants">Applicants</Link>
            <Link href="/store-profile">Profile</Link>
          </>
        )}

        {/* 🔐 ADMIN TAB (EMAIL-BASED) */}
        {isAdmin && (
          <Link href="/admin" style={{ fontWeight: 'bold' }}>
            Admin Panel
          </Link>
        )}

        {/* Logout */}
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ marginLeft: 'auto', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {/* PAGE CONTENT */}
      <main>{children}</main>
    </>
  );
}
