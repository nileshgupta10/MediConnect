// src/pages/role-select.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function RoleSelect() {
  const router = useRouter();

  const [user, setUser] = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  // 🔑 Restore session
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(data.session?.user ?? null);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 🔁 Redirect to login ONLY after session check completes
  useEffect(() => {
    if (user === null) {
      router.replace('/simple-login');
    }
  }, [user, router]);

  // ⏳ Still restoring session
  if (user === undefined) {
    return <p style={{ padding: 40 }}>Finalizing sign-in…</p>;
  }

  // 🔑 Resolve role
  useEffect(() => {
    if (!user) return;

    const resolveRole = async () => {
      // Admin bypass
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

    resolveRole();
  }, [user, router]);

  if (loading) {
    return <p style={{ padding: 40 }}>Loading…</p>;
  }

  const setRole = async (role) => {
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
