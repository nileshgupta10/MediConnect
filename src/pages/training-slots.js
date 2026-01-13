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
    if (!month || count < 1) {
      alert('Select month and slot count');
      return;
    }

    const { data: auth } = await supabase.auth.getUser();

    const rows = Array.from({ length: count }).map((_, i) => ({
      store_owner_id: auth.user.id,
      month,
      slot_number: i + 1,
    }));

    await supabase.from('training_slots').insert(rows);

    alert('Slots created');
    load();
  };

  return (
    <>
      <h2>Create Training Slots</h2>

      <div style={box}>
        <label>Month</label><br />
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
        />
        <br /><br />

        <label>Number of slots</label><br />
        <input
          type="number"
          min="1"
          value={count}
          onChange={e => setCount(Number(e.target.value))}
        />
        <br /><br />

        <button onClick={createSlots}>Create Slots</button>
      </div>

      <h3>Existing Slots</h3>

      {slots.map(s => (
        <div key={s.id} style={box}>
          <b>{s.month}</b> — Slot {s.slot_number}
          <p>Status: <b>{s.status}</b></p>
        </div>
      ))}
    </>
  );
}

const box = {
  border: '1px solid #ccc',
  padding: 12,
  marginBottom: 12,
};
