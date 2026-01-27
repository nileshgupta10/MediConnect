import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const finishLogin = async () => {
      // 🔑 Ensure Supabase processes the OAuth session
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        router.replace('/simple-login');
        return;
      }

      if (!data?.session) {
        // Session not ready yet — retry once after short delay
        setTimeout(finishLogin, 500);
        return;
      }

      // ✅ Session exists → proceed
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
