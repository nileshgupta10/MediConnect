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
      setUser(user || null);

      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        setRole(data?.role || null);
      } else {
        setRole(null);
      }
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

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
      <div style={styles.nav}>
        {role === 'pharmacist' && (
          <>
            <Link href="/jobs">Jobs</Link>
            <Link href="/training">Training</Link>
            <Link href="/my-training">My Training</Link>
            <Link href="/pharmacist-profile">Profile</Link>
          </>
        )}

        {role === 'store_owner' && (
          <>
            <Link href="/post-job">Post Job</Link>
            <Link href="/applicants">Applicants</Link>
            <Link href="/training-requests">Training Requests</Link>
            <Link href="/store-profile">Profile</Link>
          </>
        )}

        {isAdmin && (
          <>
            <Link href="/admin">Admin Panel</Link>
            <Link href="/training-requests">Training Scheduling</Link>
          </>
        )}

        <button onClick={handleLogout} style={{ marginLeft: 'auto' }}>
          Logout
        </button>
      </div>

      <main>{children}</main>
    </>
  );
}

const styles = {
  nav: {
    padding: 12,
    borderBottom: '1px solid #ddd',
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
};
