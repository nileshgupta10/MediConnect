import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Supabase v2 already processes the OAuth response internally.
    // This page must NOT try to exchange tokens again.
    router.replace('/role-select');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <p>Finalizing sign-in…</p>
    </div>
  );
}
