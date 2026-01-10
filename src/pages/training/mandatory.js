import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';

export default function MandatoryTrainingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/simple-login');
        return;
      }

      const { data } = await supabase
        .from('store_profiles')
        .select('store_name, store_timings')
        .eq('is_verified', true);

      setStores(data || []);
      setLoading(false);
    };

    load();
  }, [router]);

  if (loading) {
    return <p style={{ padding: 20 }}>Loading training pharmacies…</p>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Mandatory Practical Training</h1>

      <p style={styles.intro}>
        Below is a list of verified pharmacies offering structured
        three-month practical training for D.Pharmacy students.
      </p>

      {stores.length === 0 && (
        <div style={styles.empty}>
          No training pharmacies listed yet.
        </div>
      )}

      {stores.map((s, idx) => (
        <div key={idx} style={styles.card}>
          <h2 style={styles.name}>
            {s.store_name || 'Unnamed Pharmacy'}
          </h2>

          <p><b>Training Duration:</b> 3 Months</p>
          <p><b>Slots Available:</b> Limited</p>
          <p><b>Software Used:</b> Inventory & Billing Software</p>
          <p><b>Timings:</b> {s.store_timings || 'As per store'}</p>

          <div style={styles.badge}>
            🎓 Industry-Ready Training
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: {
    maxWidth: 900,
    margin: '0 auto',
    padding: 16,
  },
  heading: {
    fontSize: 24,
    marginBottom: 10,
  },
  intro: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 20,
  },
  empty: {
    background: '#fff',
    padding: 16,
    borderRadius: 10,
    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
    fontSize: 14,
  },
  card: {
    background: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  name: {
    fontSize: 18,
    marginBottom: 6,
  },
  badge: {
    marginTop: 10,
    display: 'inline-block',
    padding: '6px 10px',
    background: '#ecfdf5',
    color: '#065f46',
    fontSize: 12,
    borderRadius: 999,
    fontWeight: 600,
  },
};
