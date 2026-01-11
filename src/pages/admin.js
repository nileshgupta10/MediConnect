import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'maniac.gupta@gmail.com';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState('stores');
  const [stores, setStores] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/simple-login');
        return;
      }
      if (user.email !== ADMIN_EMAIL) {
        router.replace('/');
        return;
      }
      await loadStores();
      await loadRequests();
      setLoading(false);
    };
    init();
  }, [router]);

  const loadStores = async () => {
    const { data } = await supabase
      .from('store_profiles')
      .select('*')
      .order('store_name', { ascending: true });
    setStores(data || []);
  };

  const loadRequests = async () => {
    const { data } = await supabase
      .from('training_requests')
      .select(`
        id,
        created_at,
        appointment_date,
        status,
        pharmacist_id,
        store_id
      `)
      .order('created_at', { ascending: false });
    setRequests(data || []);
  };

  const toggleTrainingEligibility = async (userId, current) => {
    await supabase
      .from('store_profiles')
      .update({ is_training_eligible: !current })
      .eq('user_id', userId);
    loadStores();
  };

  const setAppointment = async (id, date) => {
    await supabase
      .from('training_requests')
      .update({
        appointment_date: date,
        status: 'scheduled',
      })
      .eq('id', id);
    loadRequests();
  };

  if (loading) return <p style={{ padding: 20 }}>Loading admin panel…</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Panel</h1>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setTab('stores')}>Training Eligibility</button>{' '}
        <button onClick={() => setTab('requests')}>Training Requests</button>
      </div>

      {/* STORES */}
      {tab === 'stores' &&
        stores.map((s) => (
          <div key={s.user_id} style={styles.card}>
            <h3>{s.store_name}</h3>
            <p>Status: <b>{s.verification_status}</b></p>

            {s.verification_status === 'approved' && (
              <div style={styles.toggleBox}>
                <label>
                  <input
                    type="checkbox"
                    checked={s.is_training_eligible === true}
                    onChange={() =>
                      toggleTrainingEligibility(
                        s.user_id,
                        s.is_training_eligible
                      )
                    }
                  />{' '}
                  <b>Approved Training Pharmacy</b>
                </label>
              </div>
            )}
          </div>
        ))}

      {/* REQUESTS */}
      {tab === 'requests' &&
        requests.map((r) => (
          <div key={r.id} style={styles.card}>
            <p><b>Request ID:</b> {r.id}</p>
            <p>Status: {r.status || 'requested'}</p>

            <label>Appointment Date</label>
            <input
              type="date"
              defaultValue={r.appointment_date || ''}
              onChange={(e) =>
                setAppointment(r.id, e.target.value)
              }
            />
          </div>
        ))}
    </div>
  );
}

const styles = {
  card: {
    border: '1px solid #ccc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 14,
  },
  toggleBox: {
    marginTop: 10,
    padding: 10,
    background: '#ecfdf5',
    borderRadius: 6,
  },
};
