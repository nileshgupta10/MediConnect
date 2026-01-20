import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MyTraining() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();

    const { data } = await supabase
      .from('training_requests')
      .select(`
        id,
        status,
        appointment_at,
        store_owner_id,
        training_slots ( month, slot_number )
      `)
      .eq('pharmacist_id', auth.user.id);

    if (!data) return;

    const storeIds = [...new Set(data.map(d => d.store_owner_id))];

    const { data: stores } = await supabase
      .from('store_profiles')
      .select('user_id, store_name')
      .in('user_id', storeIds);

    const map = Object.fromEntries(
      (stores || []).map(s => [s.user_id, s.store_name])
    );

    setItems(
      data.map(d => ({ ...d, store: map[d.store_owner_id] }))
    );
  };

  const format = (dt) =>
    new Date(dt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true,
    });

  return (
    <>
      <h2>My Training</h2>

      {items.length === 0 && (
        <p style={{ color: '#475569' }}>
          No training activity yet.
        </p>
      )}

      {items.map(i => (
        <div key={i.id} style={card}>
          <b>{i.store}</b>
          <p>
            Slot {i.training_slots?.month} — #
            {i.training_slots?.slot_number}
          </p>

          {i.appointment_at && (
            <p>📅 {format(i.appointment_at)}</p>
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
