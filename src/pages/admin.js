import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPanel() {
  const [pharmacists, setPharmacists] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: pharmacistData } = await supabase
      .from('pharmacist_profiles')
      .select('*')
      .eq('is_verified', false);

    const { data: storeData } = await supabase
      .from('store_profiles')
      .select('*')
      .eq('is_verified', false);

    setPharmacists(pharmacistData || []);
    setStores(storeData || []);
    setLoading(false);
  };

  const verifyPharmacist = async (user_id) => {
    await supabase
      .from('pharmacist_profiles')
      .update({ is_verified: true })
      .eq('user_id', user_id);

    loadData();
  };

  const verifyStore = async (user_id) => {
    await supabase
      .from('store_profiles')
      .update({ is_verified: true })
      .eq('user_id', user_id);

    loadData();
  };

  if (loading) return <p style={{ padding: 40 }}>Loading admin panel…</p>;

  return (
    <div style={{ padding: 40 }}>
      <h1>🛡️ Admin Verification Panel</h1>

      <h2>Unverified Pharmacists</h2>
      {pharmacists.length === 0 && <p>No pending pharmacists.</p>}

      {pharmacists.map(p => (
        <Card key={p.user_id}>
          <p><b>Name:</b> {p.name}</p>
          <a href={p.license_url} target="_blank">View License</a>
          <br />
          <button onClick={() => verifyPharmacist(p.user_id)}>
            ✅ Verify Pharmacist
          </button>
        </Card>
      ))}

      <h2 style={{ marginTop: 40 }}>Unverified Stores</h2>
      {stores.length === 0 && <p>No pending stores.</p>}

      {stores.map(s => (
        <Card key={s.user_id}>
          <p><b>Store:</b> {s.store_name || s.name}</p>
          <a href={s.license_url} target="_blank">View License</a>
          <br />
          <button onClick={() => verifyStore(s.user_id)}>
            ✅ Verify Store
          </button>
        </Card>
      ))}
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{
      background: '#fff',
      padding: 20,
      marginBottom: 15,
      borderRadius: 8,
      boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
    }}>
      {children}
    </div>
  );
}
