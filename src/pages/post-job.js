import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function PostJob() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [shift, setShift] = useState('');
  const [numOpenings, setNumOpenings] = useState('');
  const [requiredExperience, setRequiredExperience] = useState('');
  const [preferredSoftware, setPreferredSoftware] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  const submitJob = async () => {
    if (!title || !shift || !numOpenings || !requiredExperience) {
      setMessage('Please fill in all required fields.');
      return;
    }

    setMessage('Posting job…');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/simple-login');
      return;
    }

    // Get store location from profile
    const { data: storeProfile } = await supabase
      .from('store_profiles')
      .select('latitude, longitude, store_name')
      .eq('user_id', user.id)
      .single();

    const location = storeProfile?.store_name || 'Location not set';

    const { error } = await supabase.from('jobs').insert({
      title,
      shift,
      num_openings: parseInt(numOpenings),
      required_experience: requiredExperience,
      preferred_software: preferredSoftware || null,
      description: description || null,
      location,
      store_owner_id: user.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Job posted successfully.');
    setTitle('');
    setShift('');
    setNumOpenings('');
    setRequiredExperience('');
    setPreferredSoftware('');
    setDescription('');
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Post a Job</h1>

        <label style={styles.label}>Job Title *</label>
        <input
          style={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Full-time Pharmacist"
        />

        <label style={styles.label}>Shift *</label>
        <select
          style={styles.select}
          value={shift}
          onChange={(e) => setShift(e.target.value)}
        >
          <option value="">Select Shift</option>
          <option value="Morning">Morning</option>
          <option value="Night">Night</option>
          <option value="Both">Both (Morning & Night)</option>
        </select>

        <label style={styles.label}>Number of Openings *</label>
        <input
          type="number"
          style={styles.input}
          value={numOpenings}
          onChange={(e) => setNumOpenings(e.target.value)}
          placeholder="e.g. 2"
        />

        <label style={styles.label}>Required Experience *</label>
        <select
          style={styles.select}
          value={requiredExperience}
          onChange={(e) => setRequiredExperience(e.target.value)}
        >
          <option value="">Select Experience</option>
          <option value="Fresher">Fresher</option>
          <option value="1-5 years">1-5 years</option>
          <option value="5+ years">5+ years</option>
        </select>

        <label style={styles.label}>Preferred Software (Optional)</label>
        <input
          style={styles.input}
          value={preferredSoftware}
          onChange={(e) => setPreferredSoftware(e.target.value)}
          placeholder="e.g. PharmERP, Marg, GoFrugal"
        />

        <label style={styles.label}>Job Description (Optional)</label>
        <textarea
          style={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details about working hours, benefits, etc."
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
    border: '1px solid #cbd5e1',
    fontSize: 14,
  },
  select: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    background: 'white',
  },
  textarea: {
    width: '100%',
    minHeight: 100,
    padding: 12,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
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