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

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
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

  if (!user) return <>{children}</>;

  return (
    <div>
      <header style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
        <Link href="/">MediClan</Link>

        <button
          style={{ marginLeft: 20 }}
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace('/');
          }}
        >
          Logout
        </button>
      </header>

      <main>{children}</main>
    </div>
  );
}
