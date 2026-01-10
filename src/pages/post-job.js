import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function PostJob() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const submitJob = async () => {
    setMessage('Posting job…');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/simple-login');
      return;
    }

    const { error } = await supabase.from('jobs').insert({
      title,
      location,
      description,
      store_owner_id: user.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Job posted successfully.');
    setTitle('');
    setLocation('');
    setDescription('');
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Post a Job</h1>

        <label style={styles.label}>Job Title</label>
        <input
          style={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Full-time Pharmacist"
        />

        <label style={styles.label}>Location</label>
        <input
          style={styles.input}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Dehu Road, Pune"
        />

        <label style={styles.label}>Job Description</label>
        <textarea
          style={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Working hours, experience required, shift details"
        />

        <button style={styles.primaryBtn} onClick={submitJob}>
          Post Job
        </button>

        {message && <p style={{ marginTop: 12 }}>{message}</p>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: 20,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    background: 'white',
    padding: 24,
    borderRadius: 12,
    boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
  },
  heading: {
    fontSize: 22,
    marginBottom: 20,
  },
  label: {
    display: 'block',
    marginTop: 12,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #cbd5f5',
    fontSize: 14,
  },
  textarea: {
    width: '100%',
    minHeight: 100,
    padding: 12,
    borderRadius: 8,
    border: '1px solid #cbd5f5',
    fontSize: 14,
  },
  primaryBtn: {
    marginTop: 20,
    width: '100%',
    padding: 14,
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
  },
};
