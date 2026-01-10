import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ADMIN_EMAILS = ['maniac.gupta@gmail.com'];

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    let subscription;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // If session not ready yet, wait for auth change
      if (!user) {
        const { data } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (session?.user) {
              validateAdmin(session.user);
            } else {
              redirectToLogin();
            }
          }
        );
        subscription = data.subscription;
        return;
      }

      validateAdmin(user);
    };

    const validateAdmin = async (user) => {
      if (!ADMIN_EMAILS.includes(user.email)) {
        redirectToLogin();
        return;
      }

      setAuthorized(true);
      await loadStores();
      setLoading(false);
    };

    const redirectToLogin = async () => {
      await supabase.auth.signOut();
      window.location.href = '/simple-login';
    };

    const loadStores = async () => {
      const { data } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('is_verified', true);

      setStores(data || []);
    };

    init();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  if (loading || !authorized) {
    return <p style={{ padding: 40 }}>Loading admin panel…</p>;
  }

  const toggleTraining = async (user_id, current) => {
    await supabase
      .from('store_profiles')
      .update({ is_training_eligible: !current })
      .eq('user_id', user_id);

    const { data } = await supabase
      .from('store_profiles')
      .select('*')
      .eq('is_verified', true);

    setStores(data || []);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Panel – Training Eligibility</h1>

      {stores.length === 0 && <p>No verified stores found.</p>}

      {stores.map(s => (
        <div key={s.user_id} style={card}>
          <b>{s.store_name || 'Unnamed Store'}</b>
          <p>
            Training Eligible:{' '}
            {s.is_training_eligible ? 'Yes' : 'No'}
          </p>

          <button
            onClick={() =>
              toggleTraining(s.user_id, s.is_training_eligible)
            }
          >
            {s.is_training_eligible
              ? 'Remove Eligibility'
              : 'Mark as Training Store'}
          </button>
        </div>
      ))}
    </div>
  );
}

const card = {
  background: 'white',
  padding: 16,
  borderRadius: 10,
  marginBottom: 12,
  boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
};
