import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TrainingSlots() {
  const [month, setMonth] = useState('');
  const [count, setCount] = useState(1);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data } = await supabase
      .from('training_slots')
      .select('*')
      .eq('store_owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    setSlots(data || []);
  };

  const createSlots = async () => {
    const { data: auth } = await supabase.auth.getUser();

    const rows = Array.from({ length: count }).map((_, i) => ({
      store_owner_id: auth.user.id,
      month,
      slot_number: i + 1,
      status: 'open',
    }));

    await supabase.from('training_slots').insert(rows);
    alert('Slots created');
    load();
  };

  const closeSlot = async (id) => {
    await supabase
      .from('training_slots')
      .update({ status: 'closed' })
      .eq('id', id);

    alert('Slot closed');
    load();
  };

  return (
    <>
      <h2>Training Slots</h2>

      <div style={box}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        <input type="number" min="1" value={count} onChange={e => setCount(e.target.value)} />
        <button onClick={createSlots}>Create Slots</button>
      </div>

      {slots.map(s => (
        <div key={s.id} style={box}>
          {s.month} — Slot #{s.slot_number}
          <p>Status: <b>{s.status}</b></p>
          {s.status === 'open' && (
            <button onClick={() => closeSlot(s.id)}>Close Slot</button>
          )}
        </div>
      ))}
    </>
  );
}

const box = { border: '1px solid #ccc', padding: 12, marginBottom: 12 };
