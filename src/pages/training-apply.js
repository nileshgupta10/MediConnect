import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function TrainingApply() {
  const [stores, setStores] = useState([]);
  const [applied, setApplied] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    setUser(data.user);

    const { data: stores } = await supabase
      .from('store_profiles')
      .select('user_id, store_name')
      .eq('is_verified', true)
      .eq('is_training_eligible', true);

    const { data: existing } = await supabase
      .from('training_requests')
      .select('store_owner_id, status')
      .eq('pharmacist_id', data.user.id);

    setStores(stores || []);
    setApplied(existing || []);
    setLoading(false);
  };

  const hasApplied = (storeId) =>
    applied.find((r) => r.store_owner_id === storeId);

  const apply = async (storeId) => {
    await supabase.from('training_requests').insert({
      pharmacist_id: user.id,
      store_owner_id: storeId,
      status: 'pending',
    });

    alert('Training request sent');
    load();
  };

  if (loading) return <Layout><p>Loading…</p></Layout>;

  return (
    <Layout>
      <h2>Apply for Industry Training</h2>

      {stores.map((s) => {
        const req = hasApplied(s.user_id);

        return (
          <div key={s.user_id} style={box}>
            <b>{s.store_name}</b>
            <br />

            {!req && (
              <button onClick={() => apply(s.user_id)}>
                Apply for Training
              </button>
            )}

            {req && <p>Status: <b>{req.status}</b></p>}
          </div>
        );
      })}
    </Layout>
  );
}

const box = {
  border: '1px solid #ccc',
  padding: 12,
  marginBottom: 10,
};
