import { supabase } from '../lib/supabase';

export default function SimpleLogin() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      },
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ padding: 30, border: '1px solid #ccc', borderRadius: 8 }}>
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
          }}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
