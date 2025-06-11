import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,
  
  initialize: async () => {
    try {
      set({ loading: true, error: null });
      
      // Get Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        set({ error: sessionError.message, loading: false });
        return;
      }
      
      if (!session) {
        console.log('No active session found');
        set({ user: null, loading: false });
        return;
      }

      console.log('Session found:', session.user.id);
      
      // Get or create user record in the database
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create new record
        console.log('Creating new user record for:', session.user.id);
        
        const newUserData = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || 
                    session.user.user_metadata?.name ||
                    session.user.email?.split('@')[0] || '',
          role: 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([newUserData])
          .select()
          .single();

        if (createError) {
          console.error('Error creating user record:', createError);
          // Fall back to basic user data if record creation fails
          set({ 
            user: { 
              ...session.user,
              role: 'customer',
              full_name: newUserData.full_name
            }, 
            loading: false 
          });
          return;
        }

        console.log('New user record created:', newUser);
        set({ user: newUser, loading: false });
        return;
      } else if (userError) {
        console.error('Error fetching user data:', userError);
        set({ error: userError.message, loading: false });
        return;
      }
      
      // Combine auth and database data
      const userWithRole = {
        ...session.user,
        ...existingUser
      };
      
      console.log('User data loaded:', userWithRole);
      set({ user: userWithRole, loading: false });
      
    } catch (error) {
      console.error('Error in initialize:', error);
      set({ error: error.message, loading: false });
    }
  },
  
  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      // Initialize will be called by the auth state change listener
      return { data, error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      set({ error: error.message, loading: false });
      return { data: null, error };
    }
  },
  
  signOut: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      set({ user: null, error: null });
      
      // Clear any stored session data
      await localStorage.removeItem('supabase.auth.token');
    } catch (error: any) {
      console.error('Error during sign out:', error);
      set({ error: 'Error al cerrar sesión' });
    } finally {
      set({ loading: false });
    }
  }
}));