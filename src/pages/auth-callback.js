import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const finalizeAuth = async () => {
      // Read tokens from URL hash (implicit flow)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) {
        console.error('Missing OAuth tokens in callback');
        router.replace('/simple-login');
        return;
      }

      // 🔑 THIS is what actually persists the session
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error('Failed to set session:', error);
        router.replace('/simple-login');
        return;
      }

      // ✅ Session is now stored in LocalStorage
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
