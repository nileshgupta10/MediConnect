import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ApplicantsPage() {
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState([]);

  useEffect(() => {
    loadApplicants();
  }, []);

  const loadApplicants = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('store_owner_id', user.id);

    if (!jobs || jobs.length === 0) {
      setApplicants([]);
      setLoading(false);
      return;
    }

    const jobIds = jobs.map(j => j.id);

    const { data: applications } = await supabase
      .from('job_applications')
      .select(`
        job_id,
        pharmacist_profiles (
          user_id,
          name,
          years_experience,
          software_experience,
          is_verified,
          license_url
        )
      `)
      .in('job_id', jobIds);

    setApplicants(applications || []);
    setLoading(false);
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading applicants…</p>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Job Applicants</h1>

      {applicants.length === 0 && (
        <div style={styles.empty}>
          No applications yet.  
          Once pharmacists apply, they will appear here.
        </div>
      )}

      {applicants.map((app, index) => {
        const p = app.pharmacist_profiles;
        if (!p) return null;

        return (
          <div key={index} style={styles.card}>
            <div style={styles.header}>
              <h2 style={styles.name}>{p.name || 'Unnamed Pharmacist'}</h2>
              {p.is_verified ? (
                <span style={styles.verified}>✅ Verified</span>
              ) : (
                <span style={styles.pending}>⏳ Pending</span>
              )}
            </div>

            <p><b>Experience:</b> {p.years_experience || '—'} years</p>
            <p><b>Software:</b> {p.software_experience || '—'}</p>

            {p.is_verified && p.license_url && (
              <a href={p.license_url} target="_blank">
                View License
              </a>
            )}
          </div>
        );
      })}
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
    marginBottom: 14,
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
    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 18,
    margin: 0,
  },
  verified: {
    color: 'green',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pending: {
    color: '#b45309',
    fontWeight: 'bold',
    fontSize: 14,
  },
};
