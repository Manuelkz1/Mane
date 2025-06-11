import { useState, useEffect } from 'react';
import { supabase, checkSupabaseConnection } from '../lib/supabase';

interface CompanySettings {
  id: string;
  name: string;
  logo_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  updated_at: string;
  logo_width?: number;
  logo_height?: number;
  maintain_ratio?: boolean;
  dropshipping_shipping_cost?: number;
}

// Default settings to use when no row exists
const defaultSettings: Omit<CompanySettings, 'id' | 'updated_at'> = {
  name: 'Calidad Premium',
  logo_url: null,
  hero_title: 'Productos de Calidad Premium',
  hero_subtitle: 'Descubre nuestra selección de productos exclusivos con la mejor calidad garantizada',
  logo_width: 200,
  logo_height: 60,
  maintain_ratio: true,
  dropshipping_shipping_cost: 0,
};

const RETRY_ATTEMPTS = 3;
const BASE_DELAY = 1000; // 1 second

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (attempt = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Check connection health before attempting to fetch
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to database');
      }

      const { data, error: fetchError } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1);

      if (fetchError) throw fetchError;
      
      if (data && data.length > 0) {
        setSettings(data[0]);
      } else {
        console.log('No company settings found, using defaults');
        setSettings({
          id: 'default',
          updated_at: new Date().toISOString(),
          ...defaultSettings
        });
      }
      
    } catch (error: any) {
      console.error('Error loading company settings:', error);

      // Implement retry with exponential backoff
      if (attempt < RETRY_ATTEMPTS) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_ATTEMPTS})`);
        
        setTimeout(() => {
          loadSettings(attempt + 1);
        }, delay);
        
        return;
      }

      setError(error.message || 'Error loading company settings');
    } finally {
      setLoading(false);
    }
  };

  return { 
    settings, 
    loading, 
    error, 
    reload: () => loadSettings(0) 
  };
}