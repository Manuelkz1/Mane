import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ShippingSettings {
  id: string;
  free_shipping_threshold: number;
  free_shipping_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useShippingSettings() {
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('shipping_settings')
        .select('*')
        .single();

      if (fetchError) throw fetchError;
      setSettings(data);
    } catch (error: any) {
      console.error('Error loading shipping settings:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<ShippingSettings>) => {
    if (!settings?.id) {
      console.error('No settings ID available for update');
      return { success: false, error: 'Settings not initialized' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('shipping_settings')
        .update({
          ...newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state with the new settings
      setSettings(data);
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating shipping settings:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    updateSettings,
    reload: loadSettings
  };
}