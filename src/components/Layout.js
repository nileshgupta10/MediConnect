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
    const getUserAndRole = async (sessionUser) => {
      if (!sessionUser) {
        setUser(null);
        setRole(null);
        return;
      }

      setUser(sessionUser);

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', sessionUser.id)
        .maybeSingle();

      setRole(data?.role || null);
    };

    // Initial load
    supabase.auth.getUser().then(({ data }) => {
      getUserAndRole(data.user);
    });

    // 🔥 Listen to auth changes (THIS FIXES LOGOUT)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        getUserAndRole(session?.user || null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
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
        {role === 'pharmacist' && (
          <>
            <Link href="/jobs">Jobs</Link>
            {<Link href="/training">Training</Link>}
            <Link href="/pharmacist-profile">Profile</Link>
          </>
        )}

        {role === 'store_owner' && (
          <>
            <Link href="/post-job">Post Job</Link>
            <Link href="/applicants">Applicants</Link>
            <Link href="/store-profile">Profile</Link>
          </>
        )}

        {isAdmin && (
          <Link href="/admin" style={{ fontWeight: 'bold' }}>
            Admin Panel
          </Link>
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
