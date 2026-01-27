import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const finalizeAuth = async () => {
      // This call tells Supabase:
      // "Read access_token / refresh_token from URL hash
      //  and persist the session"
      const { error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        router.replace('/simple-login');
        return;
      }

      // ✅ Session is now written to LocalStorage
      router.replace('/role-select');
    };

    finalizeAuth();
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <p>Signing you in…</p>
    </div>
  );
}
