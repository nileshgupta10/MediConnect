// src/pages/login.js

import { useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import { GoogleMap, useLoadScript, Marker, StandaloneSearchBox } from '@react-google-maps/api';

// --- CONFIGURATION ---
const libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '8px',
};
const defaultCenter = {
  lat: 20.5937, // Center of India
  lng: 78.9629,
};
const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
};
// ---------------------

// --- SEARCH COMPONENT ---
function Search({ onPlaceSelect, mapInstance }) {
    const searchBoxRef = useRef(null);

    const onPlacesChanged = () => {
        if (searchBoxRef.current) {
            const places = searchBoxRef.current.getPlaces();
            if (places && places.length > 0) {
                const selectedPlace = places[0];
                const lat = selectedPlace.geometry.location.lat();
                const lng = selectedPlace.geometry.location.lng();
                
                onPlaceSelect({ lat, lng });

                if (mapInstance) {
                    mapInstance.panTo({ lat, lng });
                    mapInstance.setZoom(15);
                }
            }
        }
    };

    return (
        <div className="search-box-container mb-3">
            <StandaloneSearchBox
                onLoad={(ref) => searchBoxRef.current = ref}
                onPlacesChanged={onPlacesChanged}
            >
                <input
                    type="text"
                    placeholder="Type your shop address or city..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 shadow-sm"
                />
            </StandaloneSearchBox>
        </div>
    );
}
// ----------------------------


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [map, setMap] = useState(null);
  
  // State for Location (Kept for later map fix)
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const router = useRouter();

  // Load the Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
  });

  // Handle map instance loading
  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);
  
  // Unified function to handle location update from map click OR search
  const handleLocationUpdate = useCallback(({ lat, lng }) => {
    setLatitude(lat);
    setLongitude(lng);
  }, []);

  const onMapClick = useCallback((event) => {
    handleLocationUpdate({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  }, [handleLocationUpdate]);
  
  const center = useMemo(() => defaultCenter, []);

  // Auto-Detect Location Function (Kept for optional use)
  const handleLocateMe = () => {
    setMessage('Attempting to find your current location...');
    
    if (!navigator.geolocation) {
      setMessage('Error: Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        
        handleLocationUpdate({ lat: newLat, lng: newLng });
        setMessage('Location detected! Please confirm by viewing the marker.');
        
        if (map) {
          map.panTo({ lat: newLat, lng: newLng });
          map.setZoom(15);
        }
      },
      (error) => {
        console.error('Geolocation Error:', error);
        setMessage('Error: Failed to get location. Please click on the map manually or use the search bar.');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // LOGIC FOR SIGN UP (Bypassed Location Check)
  const handleSignUp = async () => {
    setLoading(true);
    setMessage('');

    if (!email || !password) {
        setMessage('Error: Please enter both email and password.');
        setLoading(false);
        return;
    }
    
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
          data: {
              // Location data is saved as null if the map is not used
              shop_latitude: latitude,
              shop_longitude: longitude,
          }
      }
    });

    setLoading(false);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Success! Check your email to confirm your account.');
      setEmail('');
      setPassword('');
      setLatitude(null);
      setLongitude(null);
    }
  };

  // LOGIC FOR LOG IN
  const handleLogin = async () => {
    setLoading(true);
    setMessage('');

    if (!email || !password) {
        setMessage('Error: Please enter both email and password.');
        setLoading(false);
        return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setLoading(false);

    if (error) {
      setMessage(`Login Error: ${error.message}`);
    } else {
      setMessage('Login Successful! Redirecting...');
      router.push('/post-job');
    }
  };

  if (loadError) return <p className="text-center p-10">Error loading maps</p>;
  if (!isLoaded) return <p className="text-center p-10">Loading Maps...</p>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="p-8 bg-white shadow-xl rounded-lg w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">
          Pharmacist / Store Owner Access
        </h1>
        
        {message && (
            <div className={`p-3 mb-4 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : message.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {message}
            </div>
        )}
        
        {/* Map Section */}
        <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">1. Locate Your Shop</label>
            
            <Search onPlaceSelect={handleLocationUpdate} mapInstance={map} />
            
            <p className="text-xs text-gray-500 mb-3 text-center">
                ... or use auto-detect, or click on the map.
            </p>

            {/* Auto-Detect Button */}
            <button
                onClick={handleLocateMe}
                className="w-full py-2 mb-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition duration-150"
            >
                Auto-Detect My Current Location
            </button>
            

            <div className="border border-gray-300 rounded-lg overflow-hidden">
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    zoom={latitude ? 15 : 5}
                    center={latitude && longitude ? { lat: latitude, lng: longitude } : center}
                    options={mapOptions}
                    onClick={onMapClick}
                    onLoad={onLoad}
                >
                    {latitude && longitude && (
                        <Marker position={{ lat: latitude, lng: longitude }} />
                    )}
                </GoogleMap>
            </div>
            {latitude && longitude && (
                <p className="mt-2 text-sm text-green-600">Location selected: Lat {latitude.toFixed(4)}, Lng {longitude.toFixed(4)}</p>
            )}
        </div>
        
        {/* Form Section */}
        <div className="space-y-4">
          <label className="block text-gray-700 font-semibold mb-2">2. Enter Login Details</label>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />

          {/* Log In Button */}
          <button 
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150 disabled:opacity-50"
            onClick={handleLogin} 
            disabled={loading}
          >
            {loading && message.includes('Login') ? 'Logging In...' : 'Log In'}
          </button>
          
          <div className='text-center text-sm text-gray-500 py-2'>— OR —</div>

          {/* Sign Up Button */}
          <button 
            className="w-full py-3 border border-green-600 text-white bg-green-600 font-semibold rounded-lg hover:bg-green-700 transition duration-150 disabled:opacity-50"
            onClick={handleSignUp}
            disabled={loading || !isLoaded}
          >
            {loading && message.includes('Success') ? 'Creating Account...' : 'Create New Account'}
          </button>
        </div>
      </div>
    </div>
  );
}