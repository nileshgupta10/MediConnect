// src/pages/auth/callback.js

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const finalize = async () => {
      await supabase.auth.exchangeCodeForSession(window.location.href);
      router.replace('/role-select');
    };
    finalize();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <p>Signing you in…</p>
    </div>
  );
}
