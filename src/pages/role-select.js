import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function RoleSelect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // ✅ SINGLE SOURCE OF TRUTH
      const { data: { session } } = await supabase.auth.getSession();

      // 🔒 If no session, go to login
      if (!session) {
        router.replace('/simple-login');
        return;
      }

      const user = session.user;

      // 🔐 ADMIN BYPASS
      if (user.email === ADMIN_EMAIL) {
        router.replace('/admin');
        return;
      }

      // 🔎 Check if role already exists
      const { data: roleRow, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Role fetch error:', error);
        setLoading(false);
        return;
      }

      // 🚀 Auto-redirect if role already chosen
      if (roleRow?.role === 'pharmacist') {
        router.replace('/pharmacist-profile');
        return;
      }

      if (roleRow?.role === 'store_owner') {
        router.replace('/store-profile');
        return;
      }

      // 🟢 No role yet → show role selection
      setLoading(false);
    };

    init();
  }, [router]);

  const setRole = async (role) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/simple-login');
      return;
    }

    const user = session.user;

    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role,
      });

    if (error) {
      alert('Failed to save role. Please try again.');
      return;
    }

    router.replace(
      role === 'pharmacist'
        ? '/pharmacist-profile'
        : '/store-profile'
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Select your role</h2>

      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => setRole('pharmacist')}
          style={{ margin: 10, padding: '10px 20px' }}
        >
          I am a Pharmacist
        </button>

        <button
          onClick={() => setRole('store_owner')}
          style={{ margin: 10, padding: '10px 20px' }}
        >
          I am a Store Owner
        </button>
      </div>
    </div>
  );
}
