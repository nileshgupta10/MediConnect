// src/pages/applicants.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function ApplicantsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/simple-login');
        return;
      }

      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          id,
          created_at,
          jobs (
            title,
            location
          ),
          pharmacist_profiles (
            name,
            age,
            sex,
            marital_status,
            current_address,
            ready_to_move,
            years_experience,
            software_experience
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setApplications(data || []);
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/simple-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading applicants…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-indigo-700">
          Job Applicants
        </h1>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg"
        >
          Logout
        </button>
      </div>

      {applications.length === 0 ? (
        <p className="text-center text-gray-500">
          No applications yet.
        </p>
      ) : (
        <div className="max-w-6xl mx-auto grid gap-6">
          {applications.map((app) => {
            const p = app.pharmacist_profiles;

            return (
              <div
                key={app.id}
                className="bg-white p-6 rounded-xl shadow-sm border"
              >
                {/* Job Info */}
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {app.jobs?.title}
                  </h2>
                  <p className="text-sm text-gray-500">
                    📍 {app.jobs?.location}
                  </p>
                </div>

                {/* Pharmacist Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  <p><strong>Name:</strong> {p?.name || 'N/A'}</p>
                  <p><strong>Age:</strong> {p?.age || 'N/A'}</p>
                  <p><strong>Sex:</strong> {p?.sex || 'N/A'}</p>
                  <p><strong>Marital Status:</strong> {p?.marital_status || 'N/A'}</p>
                  <p><strong>Current Address:</strong> {p?.current_address || 'N/A'}</p>
                  <p><strong>Ready to Move:</strong> {p?.ready_to_move ? 'Yes' : 'No'}</p>
                  <p><strong>Experience:</strong> {p?.years_experience || 'N/A'} years</p>
                  <p><strong>Software Experience:</strong> {p?.software_experience || 'N/A'}</p>
                </div>

                {/* Applied Date */}
                <p className="mt-4 text-xs text-gray-400">
                  Applied on {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
