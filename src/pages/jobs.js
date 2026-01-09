import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [user, setUser] = useState(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/simple-login');
        return;
      }

      setUser(user);

      // 🔍 Check pharmacist verification
      const { data: profile } = await supabase
        .from('pharmacist_profiles')
        .select('is_verified')
        .eq('user_id', user.id)
        .maybeSingle();

      setVerified(profile?.is_verified === true);

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: applications } = await supabase
        .from('job_applications')
        .select('job_id')
        .eq('pharmacist_id', user.id);

      setJobs(jobsData || []);
      setAppliedJobIds(applications?.map(a => a.job_id) || []);
      setLoading(false);
    };

    init();
  }, [router]);

  const handleApply = async (jobId) => {
    if (!verified) return;

    await supabase.from('job_applications').insert({
      job_id: jobId,
      pharmacist_id: user.id,
    });

    setAppliedJobIds([...appliedJobIds, jobId]);
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading jobs…</p>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Available Jobs</h1>

      {!verified && (
        <div style={styles.warning}>
          ⚠️ Your profile is under verification.  
          You can apply to jobs once verified.
        </div>
      )}

      {jobs.map(job => {
        const applied = appliedJobIds.includes(job.id);

        return (
          <div key={job.id} style={styles.card}>
            <h2 style={styles.title}>{job.title}</h2>
            <p style={styles.location}>{job.location}</p>
            <p>{job.description}</p>

            <button
              disabled={!verified || applied}
              onClick={() => handleApply(job.id)}
              style={{
                ...styles.applyBtn,
                background: applied
                  ? '#9ca3af'
                  : verified
                  ? '#16a34a'
                  : '#d1d5db',
                cursor: verified && !applied ? 'pointer' : 'not-allowed',
              }}
            >
              {applied
                ? 'Applied ✓'
                : verified
                ? 'Apply'
                : 'Verification Pending'}
            </button>
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
    marginBottom: 12,
  },
  warning: {
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  card: {
    background: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 18,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  applyBtn: {
    width: '100%',
    border: 'none',
    padding: '12px',
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
};
