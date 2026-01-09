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

      // 🔹 New user → must choose role
      if (!roleRow) {
        return; // role-select UI should render
      }

      // 🔹 Store owner → ALWAYS allow profile access
      if (roleRow.role === 'store_owner') {
        router.replace('/store-profile');
        return;
      }

      // 🔹 Pharmacist → ALWAYS allow profile access
      if (roleRow.role === 'pharmacist') {
        router.replace('/pharmacist-profile');
        return;
      }

      // 🔹 Safety fallback
      router.replace('/simple-login');
    };

    init();
  }, [router]);

  // 👇 Only shown for NEW users without a role
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Select your role</h2>

      <button
        onClick={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;

          await supabase.from('user_roles').insert({
            user_id: session.user.id,
            role: 'pharmacist',
          });

          router.replace('/pharmacist-profile');
        }}
        style={{ margin: 10, padding: 10 }}
      >
        I am a Pharmacist
      </button>

      <button
        onClick={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;

          await supabase.from('user_roles').insert({
            user_id: session.user.id,
            role: 'store_owner',
          });

          router.replace('/store-profile');
        }}
        style={{ margin: 10, padding: 10 }}
      >
        I am a Store Owner
      </button>
    </div>
  );
}
