import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ADMIN_EMAILS = ['manaic.gupta@gmail.com']; // keep yours

export default function AdminPanel() {
  const [stores, setStores] = useState([]);

  useEffect(() => {
    checkAdmin();
    loadStores();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      await supabase.auth.signOut();
      window.location.href = '/simple-login';
    }
  };

  const loadStores = async () => {
    const { data } = await supabase
      .from('store_profiles')
      .select('*')
      .eq('is_verified', true);

    setStores(data || []);
  };

  const toggleTraining = async (user_id, current) => {
    await supabase
      .from('store_profiles')
      .update({ is_training_eligible: !current })
      .eq('user_id', user_id);

    loadStores();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Panel – Training Eligibility</h1>

      {stores.map(s => (
        <div key={s.user_id} style={card}>
          <b>{s.store_name}</b>
          <p>Training Eligible: {s.is_training_eligible ? 'Yes' : 'No'}</p>

          <button onClick={() => toggleTraining(s.user_id, s.is_training_eligible)}>
            {s.is_training_eligible ? 'Remove Eligibility' : 'Mark as Training Store'}
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
