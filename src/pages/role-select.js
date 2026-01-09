import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function RoleSelect() {
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/simple-login');
        return;
      }

      const userId = session.user.id;

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleRow?.role === 'pharmacist') {
        router.replace('/pharmacist-profile');
        return;
      }

      if (roleRow?.role === 'store_owner') {
        router.replace('/store-profile');
        return;
      }

      // Otherwise show role selection UI
    };

    init();
  }, [router]);

  const setRole = async (role) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase
      .from('user_roles')
      .upsert({
        user_id: session.user.id,
        role: role,
      });

    router.replace(
      role === 'pharmacist'
        ? '/pharmacist-profile'
        : '/store-profile'
    );
  };

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
