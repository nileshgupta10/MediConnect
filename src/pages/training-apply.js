import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function TrainingApply() {
  const [stores, setStores] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      setUser(data.user);

      const { data: stores } = await supabase
        .from('store_profiles')
        .select('user_id, store_name')
        .eq('is_verified', true)
        .eq('is_training_eligible', true);

      setStores(stores || []);
      setLoading(false);
    };

    init();
  }, []);

  const apply = async (storeOwnerId) => {
    await supabase.from('training_requests').insert({
      pharmacist_id: user.id,
      store_owner_id: storeOwnerId,
    });

    alert('Training request sent');
  };

  return (
    <Layout>
      <h2>Apply for Industry Training</h2>

      {loading && <p>Loading...</p>}

      {!loading && stores.length === 0 && (
        <p>No training-enabled stores available.</p>
      )}

      {stores.map((s) => (
        <div
          key={s.user_id}
          style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}
        >
          <b>{s.store_name}</b>
          <br />
          <button onClick={() => apply(s.user_id)}>
            Apply for Training
          </button>
        </div>
      ))}
    </Layout>
  );
}
