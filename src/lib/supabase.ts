import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.39.7'
    }
  },
  db: {
    schema: 'public'
  }
});

// Initialize auth state
export const initSupabase = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }

    if (!session) {
      console.log('No active session');
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    return null;
  }
};

// Setup auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event, session?.user?.id);
});

// Add connection health check
export const checkSupabaseConnection = async () => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds base delay
  const TIMEOUT = 5000; // 5 seconds timeout

  const attemptConnection = async (attempt: number): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const { data, error } = await supabase
        .from('products')
        .select('count')
        .abortSignal(controller.signal)
        .single();

      clearTimeout(timeoutId);

      if (error) {
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('fetch failed') ||
            error.message.includes('network timeout') ||
            error.message.includes('AbortError')) {
          throw new Error('Network connection failed');
        }
        throw error;
      }

      return true;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError' || error.message.includes('AbortError')) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptConnection(attempt + 1);
        }
        return false;
      }

      if (error.message === 'Network connection failed' && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptConnection(attempt + 1);
      }

      return false;
    }
  };

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return false;
    }

    return await attemptConnection(0);
  } catch (error) {
    return false;
  }
};