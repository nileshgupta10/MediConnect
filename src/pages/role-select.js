// src/pages/role-select.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function RoleSelect() {
  const router = useRouter();

  const [user, setUser] = useState(undefined); // undefined = still loading
  const [loading, setLoading] = useState(true);

  // 🔑 STEP 1: Wait for session to restore
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

  // ⏳ Still initializing → show loader
  if (user === undefined) {
    return <p style={{ padding: 40 }}>Finalizing sign-in…</p>;
  }

  // ❌ No user → go to login ONCE
  if (!user) {
    router.replace('/simple-login');
    return null;
  }

  // 🔑 STEP 2: Role logic (runs only AFTER user exists)
  useEffect(() => {
    const resolveRole = async () => {
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

      // No role yet → show selector
      setLoading(false);
    };

    resolveRole();
  }, [user, router]);

  // ⏳ Checking role
  if (loading) {
    return <p style={{ padding: 40 }}>Loading…</p>;
  }

  // 🔑 STEP 3: Role selection (first-time users)
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
