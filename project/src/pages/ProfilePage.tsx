import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Assuming supabase client is exported from here
import { User } from '@supabase/supabase-js';

// Define a type for the profile data for better type safety
type Profile = {
  display_name: string;
  date_of_birth: string; // Store as string in YYYY-MM-DD format
  country: string;
  // Removed prefers_dark_mode
};

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  // Remove prefers_dark_mode from initial state
  const [profile, setProfile] = useState<Profile>({ display_name: '', date_of_birth: '', country: '' });
  // Remove darkMode state
  // const [darkMode, setDarkMode] = useState<boolean>(false); 
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserAndProfile = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authUser) {
            console.log("User not logged in");
            if (isMounted) setLoading(false);
            return;
        }
        if (isMounted) setUser(authUser);

        // Fetch profile data without dark mode preference
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          // Remove prefers_dark_mode from select
          .select('display_name, date_of_birth, country') 
          .eq('id', authUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }

        // Remove dark mode initial setting logic
        if (profileData) {
          if (isMounted) {
            setProfile({
              display_name: profileData.display_name || '',
              date_of_birth: profileData.date_of_birth ? new Date(profileData.date_of_birth).toISOString().split('T')[0] : '',
              country: profileData.country || '',
              // Remove prefers_dark_mode assignment
            });
          }
        } 
        // Remove all logic related to setting initial dark mode state

      } catch (err: any) {
        console.error("Error fetching profile:", err);
        if (isMounted) setError(err.message || 'Failed to fetch profile data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserAndProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Remove handleToggleDarkMode function completely
  /*
  const handleToggleDarkMode = async () => { ... };
  */

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!user) {
        setError("User not found. Cannot save profile.");
        return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Update object no longer needs prefers_dark_mode
      const updates = {
        id: user.id, 
        display_name: profile.display_name,
        date_of_birth: profile.date_of_birth || null, 
        country: profile.country,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from('profiles')
        .upsert(updates);

      if (saveError) {
        throw saveError;
      }

      setSuccessMessage("Profile saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(err.message || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Remove dark mode classes from container
    <div className="container mx-auto p-4 max-w-md min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-center">User Profile</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{successMessage}</div>}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          {/* Remove dark mode classes */}
          <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">Display Name</label>
          <input
            type="text"
            id="display_name"
            name="display_name"
            value={profile.display_name}
            onChange={handleInputChange}
            disabled={loading}
            // Remove dark mode classes
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>

        <div>
          {/* Remove dark mode classes */}
          <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            id="date_of_birth"
            name="date_of_birth"
            value={profile.date_of_birth}
            onChange={handleInputChange}
            disabled={loading}
             // Remove dark mode classes
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>

        <div>
          {/* Remove dark mode classes */}
          <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
          <input 
            type="text"
            id="country"
            name="country"
            value={profile.country}
            onChange={handleInputChange}
            disabled={loading}
             // Remove dark mode classes
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
          />
        </div>

        {/* Remove the entire dark mode toggle div */}
        {/* 
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
          <button ... />
        </div>
        */}

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            // Remove dark mode classes (though none were here)
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
