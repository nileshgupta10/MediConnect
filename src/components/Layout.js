import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  // 🚨 DO NOT RUN AUTH LOGIC ON LOGIN PAGES
  const isPublicPage =
    router.pathname === '/simple-login' ||
    router.pathname === '/auth-callback';

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
          router.push('/simple-login');
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
    router.push('/simple-login');
  };

  // 🔴 Public pages render without Layout logic
  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!user) return null;

  return (
    <div>
      <nav style={{ marginBottom: 20 }}>
        {role === 'pharmacist' && (
          <>
            <a href="/jobs">Jobs</a> |{' '}
            <a href="/training-apply">Training</a> |{' '}
            <a href="/pharmacist-profile">Profile</a>
          </>
        )}

        {role === 'store_owner' && (
          <>
            <a href="/post-job">Post Job</a> |{' '}
            <a href="/applicants">Applicants</a> |{' '}
            <a href="/training-requests">Training Requests</a> |{' '}
            <a href="/store-profile">Profile</a>
          </>
        )}

        {role === 'admin' && (
          <>
            <a href="/admin">Admin Panel</a>
          </>
        )}

        {' | '}
        <button onClick={logout}>Logout</button>
      </nav>

      {children}
    </div>
  );
}
