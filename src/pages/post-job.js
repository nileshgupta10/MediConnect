// src/pages/post-job.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function PostJobPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/simple-login');
        return;
      }
      setUser(session.user);
    };
    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/simple-login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setStatus('');

    const { error } = await supabase.from('jobs').insert({
      title,
      location,
      description,
      store_owner_id: user.id,
    });

    setLoading(false);

    if (error) {
      setStatus(error.message);
    } else {
      setStatus('Job posted successfully.');
      setTitle('');
      setLocation('');
      setDescription('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 🔵 STORE OWNER DASHBOARD HEADER */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8">
        <div className="flex gap-6 items-center">
          <span className="text-xl font-bold text-indigo-700">
            Store Owner Dashboard
          </span>

          {/* 🔗 WIRED LINKS */}
          <Link
            href="/post-job"
            className="text-sm text-indigo-600 hover:underline"
          >
            Post Job
          </Link>

          <Link
            href="/store-profile"
            className="text-sm text-indigo-600 hover:underline"
          >
            Store Profile
          </Link>

          <Link
            href="/applicants"
            className="text-sm text-indigo-600 hover:underline"
          >
            View Applicants
          </Link>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg"
        >
          Logout
        </button>
      </div>

      {/* 🔽 POST JOB FORM */}
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow"
      >
        <h1 className="text-2xl font-bold text-indigo-700 mb-6 text-center">
          Post a New Pharmacy Job
        </h1>

        <div className="space-y-5">
          <input
            placeholder="Job Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full p-3 border rounded-lg"
          />

          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="w-full p-3 border rounded-lg"
          />

          <textarea
            placeholder="Job Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            required
            className="w-full p-3 border rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full py-3 bg-indigo-600 text-white font-bold rounded-lg"
        >
          {loading ? 'Posting…' : 'Post Job'}
        </button>

        {status && (
          <p className="mt-4 text-center text-sm text-green-600">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
