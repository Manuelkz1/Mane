import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Truck, Save, Lock } from 'lucide-react';
import { useShippingSettings } from '../hooks/useShippingSettings';
import { Switch } from '@headlessui/react';

export function ShippingSettings() {
  const { settings, loading, updateSettings } = useShippingSettings();
  const [saving, setSaving] = useState(false);
  const [threshold, setThreshold] = useState(settings?.free_shipping_threshold || 100000);
  const [enabled, setEnabled] = useState(settings?.free_shipping_enabled || true);

  // Sync local state with server state when settings change
  useEffect(() => {
    if (settings) {
      setThreshold(settings.free_shipping_threshold);
      setEnabled(settings.free_shipping_enabled);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      if (threshold < 0) {
        toast.error('El monto mínimo no puede ser negativo');
        return;
      }

      const result = await updateSettings({
        free_shipping_threshold: threshold,
        free_shipping_enabled: enabled
      });

      if (result.success) {
        toast.success('Configuración de envío actualizada');
      } else {
        throw new Error(result.error || 'Error al actualizar la configuración');
      }
    } catch (error: any) {
      console.error('Error saving shipping settings:', error);
      toast.error(error.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Truck className="h-6 w-6 mr-2" />
          Configuración de Envío
        </h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Activar envío gratis
            </label>
            <Switch
              checked={enabled}
              onChange={setEnabled}
              className={`${
                enabled ? 'bg-indigo-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Habilita o deshabilita la opción de envío gratis para pedidos que superen el monto mínimo
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Monto mínimo para envío gratis
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
              disabled={!enabled}
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="0.00"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {!enabled && <Lock className="h-4 w-4 text-gray-400" />}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Los pedidos que superen este monto tendrán envío gratis
          </p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Los cambios en la configuración de envío se aplicarán a todos los pedidos nuevos.
                Los pedidos existentes no se verán afectados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}