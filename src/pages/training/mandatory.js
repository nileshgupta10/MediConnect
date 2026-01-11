import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function MandatoryTraining() {
  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      const { data, error } = await supabase
        .from('store_profiles')
        .select('user_id, store_name')
        .eq('is_verified', true)
        .eq('is_training_eligible', true);

      if (!error) {
        setStores(data || []);
      }

      setLoading(false);
    };

    init();
  }, []);

  const requestTraining = async (storeId) => {
    if (!user) {
      alert('Please login to request training');
      return;
    }

    const { error } = await supabase.from('training_requests').insert({
      pharmacist_id: user.id,
      store_id: storeId,
    });

    if (error) {
      alert('You have already requested training or an error occurred.');
      return;
    }

    setMessage('✅ Training request submitted successfully');
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading training opportunities…</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Mandatory Industry Training</h1>

      <p>
        Selected pharmacies offer <b>3-month mandatory industry training</b>{' '}
        for pharmacists and students.
      </p>

      {!user && (
        <p style={{ color: 'red' }}>
          Please login to request training.
        </p>
      )}

      {message && (
        <p style={{ color: 'green', marginTop: 10 }}>{message}</p>
      )}

      {stores.length === 0 && (
        <p>No training-eligible stores available.</p>
      )}

      {stores.map((store) => (
        <div
          key={store.user_id}
          style={{
            border: '1px solid #ccc',
            padding: 12,
            marginBottom: 12,
            borderRadius: 6,
          }}
        >
          <h3>{store.store_name}</h3>

          <p>Duration: 3 months</p>
          <p>Badge: Industry-Ready Training</p>

          <button
            onClick={() => requestTraining(store.user_id)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              marginTop: 8,
            }}
          >
            Request Training
          </button>
        </div>
      ))}
    </div>
  );
}
