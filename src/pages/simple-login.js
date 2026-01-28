// src/pages/simple-login.js

import { supabase } from '../lib/supabase';

export default function SimpleLogin() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 🔑 PKCE flow — Supabase handles everything
        redirectTo: `${window.location.origin}/role-select`,
      },
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          padding: 30,
          border: '1px solid #ccc',
          borderRadius: 8,
          maxWidth: 360,
        }}
      >
        <h2>MediClan Login</h2>
        <p>Login using Google to continue</p>

        <button
          onClick={handleGoogleLogin}
          style={{
            marginTop: '12px',
            padding: '10px 16px',
            cursor: 'pointer',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            width: '100%',
          }}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
