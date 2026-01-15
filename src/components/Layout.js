import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  const publicPages = ['/', '/simple-login', '/auth-callback'];
  const isPublicPage = publicPages.includes(router.pathname);

  useEffect(() => {
    if (isPublicPage) return;

    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted || !data.user) return;

      setUser(data.user);

      if (data.user.email === ADMIN_EMAIL) {
        setRole('admin');
        return;
      }

      const { data: r } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      setRole(r?.role);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace('/'); // ✅ redirect to HOME
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router.pathname]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/'); // ✅ HOME, not simple-login
  };

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!user) return null;

  return (
    <div>
      <nav style={styles.nav}>
        {role === 'pharmacist' && (
          <>
            <a href="/jobs">Jobs</a>
            <a href="/training-apply">Training</a>
            <a href="/pharmacist-profile">Profile</a>
            <a href="/my-training">My Training</a>
          </>
        )}

        {role === 'store_owner' && (
  <>
    <a href="/post-job">Post Job</a>
    <a href="/applicants">Applicants</a>
    <a href="/training-slots">Training Slots</a>
    <a href="/training-requests">Training Requests</a>
    <a href="/store-profile">Profile</a>
  </>
)}


        {role === 'admin' && (
          <>
            <a href="/admin">Admin</a>
          </>
        )}

        <button onClick={logout} style={styles.logout}>
          Logout
        </button>
      </nav>

      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

const styles = {
  nav: {
    display: 'flex',
    gap: 18,
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid #e5e7eb',
    background: '#ffffff',
    fontWeight: 500,
  },
  logout: {
    marginLeft: 'auto',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
