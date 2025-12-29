// src/pages/role-select.js

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
        .single();

      if (roleRow?.role === 'store') {
        router.replace('/post-job');
        return;
      }

      if (roleRow?.role === 'pharmacist') {
        const { data: profile } = await supabase
          .from('pharmacist_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!profile) {
          router.replace('/pharmacist-profile');
        } else {
          router.replace('/jobs');
        }
      }
    };

    init();
  }, [router]);

  return null;
}
