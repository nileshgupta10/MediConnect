import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function RoleSelect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        router.replace('/simple-login');
        return;
      }

      // 🔐 Admin bypass
      if (user.email === ADMIN_EMAIL) {
        router.replace('/admin');
        return;
      }

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleRow?.role === 'pharmacist') {
        router.replace('/pharmacist-profile');
        return;
      }

      if (roleRow?.role === 'store_owner') {
        router.replace('/store-profile');
        return;
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const setRole = async (role) => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;

    await supabase.from('user_roles').upsert({
      user_id: user.id,
      role,
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
