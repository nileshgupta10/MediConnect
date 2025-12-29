// src/pages/complete-profile.js

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function CompleteProfilePage() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const router = useRouter();

    // Store Owner State
    const [storeName, setStoreName] = useState('');
    const [numVacancies, setNumVacancies] = useState(0);
    const [experienceRequired, setExperienceRequired] = useState('');

    // Pharmacist State
    const [pName, setPName] = useState('');
    const [age, setAge] = useState('');
    const [sex, setSex] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [currentAddress, setCurrentAddress] = useState('');
    const [readyToMove, setReadyToMove] = useState(false);
    const [yearsExperience, setYearsExperience] = useState('');
    const [softwareExperience, setSoftwareExperience] = useState('');

    // 1. Get User Session and Role from Supabase
    useEffect(() => {
        async function loadUser() {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/role-select'); // Not logged in
                return;
            }

            const userRole = router.query.role || user.user_metadata.role;

            if (!userRole) {
                setError("Role not found. Please log in again.");
                setLoading(false);
                return;
            }

            setUser(user);
            setRole(userRole);
            setLoading(false);

            // Pre-fill name from Google data if available
            if (user.user_metadata.full_name) {
                if (userRole === 'store_owner') {
                    setStoreName(user.user_metadata.full_name);
                } else if (userRole === 'pharmacist') {
                    setPName(user.user_metadata.full_name);
                }
            }
        }
        loadUser();
    }, [router]);

    // 2. Handle Profile Submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const table = role === 'store_owner' ? 'store_profiles' : 'pharmacist_profiles';
        let profileData = {};

        if (role === 'store_owner') {
            profileData = {
                user_id: user.id,
                name: storeName,
                num_vacancies: parseInt(numVacancies),
                experience_required: experienceRequired,
            };
        } else if (role === 'pharmacist') {
            profileData = {
                user_id: user.id,
                name: pName,
                age: parseInt(age),
                sex: sex,
                marital_status: maritalStatus,
                current_address: currentAddress,
                ready_to_move: readyToMove,
                years_experience: parseInt(yearsExperience),
                software_experience: softwareExperience,
            };
        }
        
        // Insert data into the correct profile table
        const { error: dbError } = await supabase
            .from(table)
            .insert([profileData]);

        if (dbError) {
            console.error('Profile DB Error:', dbError);
            setError(`Error saving profile: ${dbError.message}`);
            setLoading(false);
            return;
        }

        // Optional: Update user metadata to set the role permanently
        const { error: authError } = await supabase.auth.updateUser({
            data: { role: role }
        });

        if (authError) {
            console.error('Auth Update Error:', authError);
            setError(`Error updating user role: ${authError.message}`);
            setLoading(false);
            return;
        }

        setMessage('Profile saved successfully! Redirecting...');
        
        // Redirect to the appropriate main page
        if (role === 'store_owner') {
            router.push('/post-job');
        } else {
            router.push('/jobs');
        }
    };

    if (loading) return <div className="text-center p-20">Loading...</div>;
    if (error) return <div className="text-center p-20 text-red-600">Error: {error}</div>;
    if (!user || !role) return <div className="text-center p-20">Access Denied. Please select a role.</div>;

    return (
        <div className="container mx-auto p-6 min-h-screen bg-gray-50">
            <h1 className="text-3xl font-bold text-center text-indigo-700 mb-2">
                Complete Your {role === 'store_owner' ? 'Store Owner' : 'Pharmacist'} Profile
            </h1>
            <p className="text-center text-gray-600 mb-8">
                Please provide the details required to get started.
            </p>
            
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-2xl max-w-3xl mx-auto space-y-6">
                {message && (
                    <div className={`p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}

                {/* --- Store Owner Form Fields --- */}
                {role === 'store_owner' && (
                    <>
                        <InputField label="Store Owner Name" value={storeName} onChange={setStoreName} placeholder="As per Google Account" required />
                        <InputField label="Number of Vacancies (Current)" type="number" value={numVacancies} onChange={setNumVacancies} required />
                        <TextAreaField label="Experience Requirements" value={experienceRequired} onChange={setExperienceRequired} placeholder="e.g., Min 2 years experience with inventory software, B.Pharm/M.Pharm degree." required />
                    </>
                )}

                {/* --- Pharmacist Form Fields --- */}
                {role === 'pharmacist' && (
                    <>
                        <InputField label="Full Name" value={pName} onChange={setPName} placeholder="As per Google Account" required />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField label="Age" type="number" value={age} onChange={setAge} required />
                            <SelectField label="Sex" value={sex} onChange={setSex} options={['Male', 'Female', 'Other']} required />
                            <SelectField label="Marital Status" value={maritalStatus} onChange={setMaritalStatus} options={['Single', 'Married', 'Divorced', 'Widowed']} required />
                        </div>
                        <TextAreaField label="Current Address" value={currentAddress} onChange={setCurrentAddress} placeholder="Full current residential address" required />
                        
                        <div className="flex items-center space-x-4">
                            <label className="text-gray-700 font-semibold">Ready to Move for Job?</label>
                            <input type="checkbox" checked={readyToMove} onChange={(e) => setReadyToMove(e.target.checked)} className="h-5 w-5 text-indigo-600 border-gray-300 rounded" />
                            <span className="text-sm text-gray-500">{readyToMove ? 'Yes' : 'No'}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Years of Experience" type="number" value={yearsExperience} onChange={setYearsExperience} required />
                            <InputField label="Software Experience" value={softwareExperience} onChange={setSoftwareExperience} placeholder="e.g., PharmERP, Marg, GoFrugal (Comma Separated)" required />
                        </div>
                    </>
                )}
                
                <button
                    type="submit"
                    disabled={loading}
                    className="mt-8 w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition duration-150 disabled:opacity-50 shadow-lg"
                >
                    {loading ? 'Saving Profile...' : 'Save Profile and Continue'}
                </button>
            </form>
        </div>
    );
}

// --- Reusable Form Components ---

const InputField = ({ label, type = 'text', value, onChange, placeholder, required = false }) => (
    <div>
        <label className="block text-gray-700 font-semibold mb-2">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        />
    </div>
);

const TextAreaField = ({ label, value, onChange, placeholder, required = false }) => (
    <div>
        <label className="block text-gray-700 font-semibold mb-2">{label}</label>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            rows="3"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        />
    </div>
);

const SelectField = ({ label, value, onChange, options, required = false }) => (
    <div>
        <label className="block text-gray-700 font-semibold mb-2">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        >
            <option value="" disabled>Select {label}</option>
            {options.map(option => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
    </div>
);