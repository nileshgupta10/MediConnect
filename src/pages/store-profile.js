// src/pages/store-profile.js

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

export default function StoreProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [status, setStatus] = useState('');
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const [form, setForm] = useState({
    store_name: '',
    contact_person: '',
    store_timings: '',
    latitude: null,
    longitude: null,
  });

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/simple-login');
        return;
      }

      const { data } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (data) {
        setProfileId(data.id);
        setForm({
          store_name: data.store_name || '',
          contact_person: data.contact_person || '',
          store_timings: data.store_timings || '',
          latitude: data.latitude,
          longitude: data.longitude,
        });

        if (data.latitude && data.longitude) {
          setMapCenter({ lat: data.latitude, lng: data.longitude });
        }
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));

    setMapCenter({ lat, lng });
  }, []);

  // 📍 AUTO-DETECT LOCATION
  const detectLocation = () => {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported on this device.');
    return;
  }

  setStatus('Detecting location…');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setForm((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));

      setMapCenter({ lat, lng });
      setStatus('Location detected. Please verify the pin.');
    },
    (error) => {
      if (error.code === 2) {
        setStatus(
          'Automatic location unavailable on this device. Please place the pin manually.'
        );
      } else if (error.code === 1) {
        setStatus('Location permission denied.');
      } else {
        setStatus('Unable to detect location.');
      }
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};


  const handleSave = async (e) => {
    e.preventDefault();
    if (!profileId) return;

    setSaving(true);
    setStatus('');

    const { error } = await supabase
      .from('store_profiles')
      .update({
        store_name: form.store_name,
        contact_person: form.contact_person,
        store_timings: form.store_timings,
        latitude: form.latitude,
        longitude: form.longitude,
      })
      .eq('id', profileId);

    setSaving(false);

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus('Store profile saved successfully.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading store profile…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto mb-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back
        </button>
      </div>

      <form
        onSubmit={handleSave}
        className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow border"
      >
        <h1 className="text-2xl font-bold text-indigo-700 mb-6 text-center">
          Store Profile
        </h1>

        <div className="space-y-5">
          <input
            name="store_name"
            value={form.store_name}
            onChange={handleChange}
            placeholder="Store Name"
            required
            className="w-full p-3 border rounded-lg"
          />

          <input
            name="contact_person"
            value={form.contact_person}
            onChange={handleChange}
            placeholder="Contact Person"
            required
            className="w-full p-3 border rounded-lg"
          />

          <input
            name="store_timings"
            value={form.store_timings}
            onChange={handleChange}
            placeholder="Store Timings (e.g. 9am–9pm or 24x7)"
            className="w-full p-3 border rounded-lg"
          />

          {/* LOCATION SECTION */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium">Store Location</p>
              <button
                type="button"
                onClick={detectLocation}
                className="text-sm text-indigo-600 hover:underline"
              >
                Detect my location
              </button>
            </div>

            {isLoaded && (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={form.latitude ? 15 : 5}
                center={mapCenter}
                onClick={onMapClick}
              >
                {form.latitude && (
                  <Marker
                    position={{
                      lat: form.latitude,
                      lng: form.longitude,
                    }}
                  />
                )}
              </GoogleMap>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-8 w-full py-3 bg-indigo-600 text-white font-bold rounded-lg"
        >
          {saving ? 'Saving…' : 'Save Store Profile'}
        </button>

        {status && (
          <p className="mt-4 text-center text-sm text-gray-600">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
