// src/pages/auth-callback.js

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const finishLogin = async () => {
      // This restores the session after OAuth redirect
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        router.replace('/role-select');
      } else {
        router.replace('/simple-login');
      }
    };

    finishLogin();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <p>Signing you in…</p>
    </div>
  );
}
