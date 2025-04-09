import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    console.log('AuthProvider: Checking initial session');
    setLoading(true);

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Initial session check complete', session?.user?.id);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthProvider: Auth state changed', _event, session?.user?.id);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}