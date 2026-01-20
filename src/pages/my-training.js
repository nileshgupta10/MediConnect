import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MyTraining() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    // 1️⃣ Requests
    const { data: reqs, error } = await supabase
      .from('training_requests')
      .select(`
        id,
        status,
        appointment_at,
        store_owner_id,
        training_slots ( month, slot_number )
      `)
      .eq('pharmacist_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    if (!reqs || reqs.length === 0) {
      setItems([]);
      return;
    }

    // 2️⃣ Stores
    const storeIds = [...new Set(reqs.map(r => r.store_owner_id))];

    const { data: stores } = await supabase
      .from('store_profiles')
      .select('user_id, store_name')
      .in('user_id', storeIds);

    const storeMap = Object.fromEntries(
      (stores || []).map(s => [s.user_id, s.store_name])
    );

    // 3️⃣ Merge
    setItems(
      reqs.map(r => ({
        ...r,
        store_name: storeMap[r.store_owner_id],
      }))
    );
  };

  const formatTime = (dt) =>
    new Date(dt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true,
    });

  return (
    <>
      <h2>My Training</h2>

      {items.length === 0 && (
        <p style={{ color: '#475569' }}>No training activity yet.</p>
      )}

      {items.map(i => (
        <div key={i.id} style={card}>
          <b>{i.store_name || 'Store'}</b>

          <p>
            Slot {i.training_slots?.month} — #
            {i.training_slots?.slot_number}
          </p>

          {i.appointment_at && (
            <p>📅 {formatTime(i.appointment_at)}</p>
          )}

          <span style={badge(i.status)}>{i.status}</span>
        </div>
      ))}
    </>
  );
}

const card = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

const badge = (s) => ({
  display: 'inline-block',
  marginTop: 6,
  padding: '4px 10px',
  borderRadius: 12,
  fontSize: 12,
  background:
    s === 'confirmed'
      ? '#dcfce7'
      : s === 'scheduled'
      ? '#dbeafe'
      : '#fef3c7',
});
