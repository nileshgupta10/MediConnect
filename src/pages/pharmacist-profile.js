// src/pages/pharmacist-profile.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function PharmacistProfile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const [form, setForm] = useState({
    name: '',
    age: '',
    sex: '',
    marital_status: '',
    current_address: '',
    ready_to_move: false,
    years_experience: '',
    software_experience: '',
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/simple-login');
        return;
      }

      setUser(session.user);

      // 🔍 Check if profile already exists
      const { data } = await supabase
        .from('pharmacist_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (data) {
        router.replace('/jobs');
        return;
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setStatus('');

    const { error } = await supabase.from('pharmacist_profiles').insert({
      user_id: user.id,
      ...form,
      role: 'pharmacist',
    });

    setSaving(false);

    if (error) {
      setStatus(error.message);
    } else {
      router.push('/jobs');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow"
      >
        <h1 className="text-2xl font-bold text-indigo-700 mb-6 text-center">
          Pharmacist Profile
        </h1>

        <div className="grid gap-4">
          <input name="name" placeholder="Full Name" onChange={handleChange} required className="p-3 border rounded" />
          <input name="age" placeholder="Age" onChange={handleChange} className="p-3 border rounded" />
          <input name="sex" placeholder="Sex" onChange={handleChange} className="p-3 border rounded" />
          <input name="marital_status" placeholder="Marital Status" onChange={handleChange} className="p-3 border rounded" />
          <input name="current_address" placeholder="Current Address" onChange={handleChange} className="p-3 border rounded" />
          <input name="years_experience" placeholder="Years of Experience" onChange={handleChange} className="p-3 border rounded" />
          <input name="software_experience" placeholder="Software Experience" onChange={handleChange} className="p-3 border rounded" />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ready_to_move" onChange={handleChange} />
            Ready to relocate
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-lg"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>

        {status && (
          <p className="mt-4 text-center text-sm text-red-600">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
