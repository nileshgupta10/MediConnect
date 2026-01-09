import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function RoleSelect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/simple-login');
        return;
      }

      setUser(user);

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      // ✅ ROLE EXISTS → REDIRECT IMMEDIATELY
      if (roleRow?.role === 'pharmacist') {
        router.replace('/pharmacist-profile');
        return;
      }

      if (roleRow?.role === 'store_owner') {
        router.replace('/store-profile');
        return;
      }

      // ❌ No role → show role selection UI
      setLoading(false);
    };

    init();
  }, [router]);

  const setRole = async (role) => {
    if (!user) return;

    await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: role,
      });

    router.replace(
      role === 'pharmacist'
        ? '/pharmacist-profile'
        : '/store-profile'
    );
  };

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Select your role</h2>

      <button onClick={() => setRole('pharmacist')} style={{ margin: 10 }}>
        I am a Pharmacist
      </button>

      <button onClick={() => setRole('store_owner')} style={{ margin: 10 }}>
        I am a Store Owner
      </button>
    </div>
  );
}
