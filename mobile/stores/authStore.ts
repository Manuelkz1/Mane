import { create } from 'zustand';
import { User } from '../types/index';
import { supabase, initSupabase } from '../lib/supabase';

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,

  signOut: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      set({ user: null, error: null });
      
      // Clear any stored session data
      await AsyncStorage.removeItem('supabase.auth.token');
    } catch (error: any) {
      console.error('Error during sign out:', error);
      set({ error: 'Error al cerrar sesión' });
    } finally {
      set({ loading: false });
    }
  },

  checkAuth: async () => {
    const retryWithDelay = async (fn: () => Promise<any>, retries: number): Promise<any> => {
      try {
        return await fn();
      } catch (error) {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return retryWithDelay(fn, retries - 1);
        }
        throw error;
      }
    };

    try {
      set({ loading: true, error: null });
      
      const session = await retryWithDelay(initSupabase, MAX_RETRIES);
      
      if (!session) {
        set({ user: null, loading: false });
        return;
      }

      const { data: { user: authUser }, error: authError } = await retryWithDelay(
        () => supabase.auth.getUser(),
        MAX_RETRIES
      );
      
      if (authError) throw authError;

      if (authUser) {
        try {
          const { data: userData, error: userError } = await retryWithDelay(
            () => supabase
              .from('users')
              .select('*')
              .eq('id', authUser.id)
              .single(),
            MAX_RETRIES
          );

          if (userError) throw userError;

          if (userData) {
            set({ user: userData });
          } else {
            const newUser = {
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || '',
              role: 'customer',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { data: createdUser, error: createError } = await retryWithDelay(
              () => supabase
                .from('users')
                .insert([newUser])
                .select()
                .single(),
              MAX_RETRIES
            );

            if (createError) throw createError;
            set({ user: createdUser });
          }
        } catch (error: any) {
          console.error('Error managing user data:', error);
          set({
            user: {
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || '',
              role: 'customer'
            }
          });
        }
      } else {
        set({ user: null });
      }
    } catch (error: any) {
      console.error('Auth check error:', error);
      set({ error: 'Error de conexión' });
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },
}));