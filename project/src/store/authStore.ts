import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Define a simple profile type for the store
interface UserProfile {
  id: string;
  display_name: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => {
    set({ user });
    if (user) {
      get().fetchProfile(user.id);
    } else {
      set({ profile: null, loading: false });
    }
  },
  setLoading: (loading) => set({ loading }),
  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      set({ profile: data, loading: false });
    } catch (error) {
      console.error('Error fetching profile:', error);
      set({ loading: false, profile: null });
    }
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, profile: null, loading: false });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },
}));

// Initialize auth state and listen for changes
supabase.auth.onAuthStateChange((event, session) => {
  const user = session?.user ?? null;
  useAuthStore.getState().setUser(user);
});