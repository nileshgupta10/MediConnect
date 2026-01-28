// src/pages/_app.js

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // 🔒 Passive auth state listener
    // IMPORTANT: No redirects, no routing, no logic here
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, _session) => {
      // Intentionally empty
      // Supabase handles session hydration internally
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
