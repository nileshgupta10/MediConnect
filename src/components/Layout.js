import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      setRole(data?.role || null);
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/simple-login');
  };

  if (!user) return <>{children}</>;

  const isAdmin = user.email === ADMIN_EMAIL;

  return (
    <>
      <div
        style={{
          padding: 12,
          borderBottom: '1px solid #ddd',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
      >
        {/* Pharmacist Nav */}
        {role === 'pharmacist' && (
          <>
            <Link href="/jobs">Jobs</Link>
            <Link href="/training">Training</Link>
            <Link href="/my-training">My Training</Link>
            <Link href="/pharmacist-profile">Profile</Link>
          </>
        )}

        {/* Store Owner Nav */}
        {role === 'store_owner' && (
          <>
            <Link href="/post-job">Post Job</Link>
            <Link href="/applicants">Applicants</Link>
            <Link href="/training-requests">Training Requests</Link>
            <Link href="/store-profile">Profile</Link>
          </>
        )}

        {/* Admin Nav */}
        {isAdmin && (
          <>
            <Link href="/admin" style={{ fontWeight: 'bold' }}>
              Admin Panel
            </Link>
            <Link href="/training-requests">
              Training Scheduling
            </Link>
          </>
        )}

        <button
          onClick={handleLogout}
          style={{ marginLeft: 'auto', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      <main>{children}</main>
    </>
  );
}
