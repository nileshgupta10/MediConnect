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
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: reqs, error } = await supabase
      .from('training_requests')
      .select('*')
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    if (!reqs || reqs.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const pharmacistIds = [...new Set(reqs.map(r => r.pharmacist_id))];

    const { data: pharmacists } = await supabase
      .from('pharmacist_profiles')
      .select('user_id, name, years_experience, software_experience')
      .in('user_id', pharmacistIds);

    const map = Object.fromEntries(
      (pharmacists || []).map(p => [p.user_id, p])
    );

    setRequests(
      reqs.map(r => ({
        ...r,
        pharmacist: map[r.pharmacist_id],
      }))
    );

    setLoading(false);
  };

  return (
    <Layout>
      {loading && <p>Loading…</p>}

      {!loading && (
        <>
          <h2>Training Requests</h2>

          {requests.length === 0 && <p>No requests received.</p>}

          {requests.map(r => (
            <div key={r.id} style={box}>
              <b>{r.pharmacist?.name || 'Pharmacist'}</b>
              <p>Experience: {r.pharmacist?.years_experience} years</p>
              <p>Software: {r.pharmacist?.software_experience}</p>
              <p>Status: <b>{r.status}</b></p>
            </div>
          ))}
        </>
      )}
    </Layout>
  );
}

const box = {
  border: '1px solid #ccc',
  padding: 15,
  marginBottom: 15,
};
