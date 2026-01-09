import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ADMIN_EMAILS = [
  'maniac.gupta@gmail.com', // 🔴 CHANGE THIS
];

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [pharmacists, setPharmacists] = useState([]);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        await supabase.auth.signOut();
        window.location.href = '/simple-login';
        return;
      }

      setAuthorized(true);
      loadData();
    };

    init();
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

  if (!authorized || loading) {
    return <p style={{ padding: 40 }}>Loading admin panel…</p>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>🛡️ Admin Verification Panel</h1>

      <Section title="Unverified Pharmacists">
        {pharmacists.length === 0 && <p>No pending pharmacists.</p>}
        {pharmacists.map(p => (
          <Card key={p.user_id}>
            <p><b>Name:</b> {p.name || '—'}</p>
            <a href={p.license_url} target="_blank">View License</a>
            <button style={styles.primaryBtn} onClick={() => verifyPharmacist(p.user_id)}>
              ✅ Verify
            </button>
          </Card>
        ))}
      </Section>

      <Section title="Unverified Stores">
        {stores.length === 0 && <p>No pending stores.</p>}
        {stores.map(s => (
          <Card key={s.user_id}>
            <p><b>Store:</b> {s.store_name || '—'}</p>
            <a href={s.license_url} target="_blank">View License</a>
            <button style={styles.primaryBtn} onClick={() => verifyStore(s.user_id)}>
              ✅ Verify
            </button>
          </Card>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 30 }}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={styles.card}>
      {children}
    </div>
  );
}

/* ---------- MOBILE-FIRST STYLES ---------- */

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: 16,
  },
  heading: {
    fontSize: 22,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  card: {
    background: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  primaryBtn: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 8,
  },
};
