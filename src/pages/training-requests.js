import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function TrainingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { data: reqs, error } = await supabase
      .from('training_requests')
      .select(`
        id,
        status,
        created_at,
        pharmacist_profiles (
          name,
          years_experience,
          software_experience
        )
      `)
      .eq('store_owner_id', data.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setRequests(reqs || []);
    setLoading(false);
  };

  if (loading) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <Layout>
      <h2>Training Requests</h2>

      {requests.length === 0 && <p>No requests received.</p>}

      {requests.map((r) => (
        <div
          key={r.id}
          style={{
            border: '1px solid #ccc',
            padding: 15,
            marginBottom: 15,
          }}
        >
          <b>{r.pharmacist_profiles?.name}</b>
          <p>Experience: {r.pharmacist_profiles?.years_experience} years</p>
          <p>Software: {r.pharmacist_profiles?.software_experience}</p>
          <p>Status: {r.status}</p>
        </div>
      ))}
    </Layout>
  );
}
