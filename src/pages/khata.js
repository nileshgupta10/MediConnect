// src/pages/khata.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { KhaataLayout } from '../components/khata/KhaataLayout';

export default function KhataPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (!session?.user) {
          router.replace('/simple-login');
          return;
        }

        setUser(session.user);
        setLoading(false);
      } catch (err) {
        console.error("Error verifying user session:", err);
        router.replace('/simple-login');
      }
    };

    checkUser();

    // Subscribe to auth state changes to handle timeouts or sign outs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        router.replace('/simple-login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-10 w-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <KhaataLayout user={user} />
    </div>
  );
}
