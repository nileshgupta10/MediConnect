import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const finishLogin = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/simple-login');
        return;
      }

      // ✅ Always go to role-select.
      // Role-based routing is handled later.
      router.replace('/role-select');
    };

    finishLogin();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <p>Signing you in…</p>
    </div>
  );
}
