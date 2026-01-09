// src/pages/jobs.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: applications } = await supabase
        .from('job_applications')
        .select('job_id')
        .eq('pharmacist_id', session.user.id);

      setJobs(jobsData || []);
      setAppliedJobIds(applications?.map(a => a.job_id) || []);
      setLoading(false);
    };

    init();
  }, [router]);

  const handleApply = async (jobId) => {
    if (!user) return;

    await supabase.from('job_applications').insert({
      job_id: jobId,
      pharmacist_id: user.id,
    });

    setAppliedJobIds([...appliedJobIds, jobId]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/simple-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading jobs…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-indigo-700">
          Available Jobs
        </h1>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg"
        >
          Logout
        </button>
      </div>

      <div className="max-w-5xl mx-auto grid gap-6">
        {jobs.map((job) => {
          const applied = appliedJobIds.includes(job.id);

          return (
            <div
              key={job.id}
              className="bg-white p-6 rounded-xl shadow border"
            >
              <h2 className="text-xl font-semibold">{job.title}</h2>
              <p className="text-sm text-gray-500">{job.location}</p>
              <p className="mt-3">{job.description}</p>

              <button
                disabled={applied}
                onClick={() => handleApply(job.id)}
                className={`mt-4 px-4 py-2 rounded-lg text-white ${
                  applied
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {applied ? 'Applied ✓' : 'Apply'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
