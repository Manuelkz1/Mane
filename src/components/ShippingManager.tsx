import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Truck, Save, X, Edit, Info } from 'lucide-react';
import { Product } from '../types/index';

export function ShippingManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingShippingDays, setEditingShippingDays] = useState<string | null>(null);
  const [shippingDaysValue, setShippingDaysValue] = useState<string>('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(40000);
  const [enableFreeShipping, setEnableFreeShipping] = useState<boolean>(true);

  useEffect(() => {
    loadProducts();
    loadShippingSettings();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, images, shipping_days, price')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const loadShippingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'shipping')
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.value) {
        const settings = JSON.parse(data.value);
        setFreeShippingThreshold(settings.freeShippingThreshold || 40000);
        setEnableFreeShipping(settings.enableFreeShipping !== false);
      }
    } catch (error) {
      console.error('Error loading shipping settings:', error);
    }
  };

  const saveShippingSettings = async () => {
    try {
      const settings = {
        freeShippingThreshold,
        enableFreeShipping
      };

      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'shipping',
          value: JSON.stringify(settings)
        });

      if (error) throw error;
      
      toast.success('Configuración de envío guardada');
    } catch (error) {
      console.error('Error saving shipping settings:', error);
      toast.error('Error al guardar la configuración de envío');
    }
  };

  const startEditingShippingDays = (product: Product) => {
    setEditingShippingDays(product.id);
    setShippingDaysValue(product.shipping_days || '');
  };

  const saveShippingDays = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ shipping_days: shippingDaysValue })
        .eq('id', productId);

      if (error) throw error;
      
      // Actualizar el estado local
      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, shipping_days: shippingDaysValue } 
          : p
      ));
      
      toast.success('Días hábiles de envío actualizados');
      setEditingShippingDays(null);
    } catch (error) {
      console.error('Error updating shipping days:', error);
      toast.error('Error al actualizar los días hábiles de envío');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Configuración de Envío</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold mb-4">Configuración General</h3>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <label htmlFor="enableFreeShipping" className="text-sm font-medium text-gray-700 mr-2">
                Activar envío gratis
              </label>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  type="checkbox" 
                  id="enableFreeShipping" 
                  checked={enableFreeShipping}
                  onChange={(e) => setEnableFreeShipping(e.target.checked)}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label 
                  htmlFor="enableFreeShipping" 
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${enableFreeShipping ? 'bg-indigo-600' : 'bg-gray-300'}`}
                ></label>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">Habilita o deshabilita la opción de envío gratis para pedidos que superen el monto mínimo</p>
        </div>
        
        <div className="mb-6">
          <label htmlFor="freeShippingThreshold" className="block text-sm font-medium text-gray-700 mb-1">
            Monto mínimo para envío gratis
          </label>
          <div className="flex items-center">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
              $
            </span>
            <input
              type="number"
              id="freeShippingThreshold"
              value={freeShippingThreshold}
              onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
              className="block w-full rounded-none rounded-r-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">Los pedidos que superen este monto tendrán envío gratis</p>
        </div>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Los cambios en la configuración de envío se aplicarán a todos los pedidos nuevos. Los pedidos existentes no se verán afectados.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={saveShippingSettings}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
          >
            <Save className="h-5 w-5 mr-2" />
            Guardar Cambios
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Días de Envío por Producto</h3>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Truck className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 font-medium">
                Configuración de días hábiles de envío
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Aquí puedes configurar los días hábiles de envío para cada producto. Puedes usar rangos como "10-15" o números específicos como "7". Esta información se mostrará a los clientes.
              </p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días de Envío
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {product.images && product.images.length > 0 && (
                        <div className="flex-shrink-0 h-10 w-10">
                          <img className="h-10 w-10 rounded-full object-cover" src={product.images[0]} alt="" />
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${product.price}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingShippingDays === product.id ? (
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={shippingDaysValue}
                          onChange={(e) => setShippingDaysValue(e.target.value)}
                          className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Ej: 3-5"
                        />
                        <button
                          onClick={() => saveShippingDays(product.id)}
                          className="ml-2 text-indigo-600 hover:text-indigo-900"
                        >
                          <Save className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setEditingShippingDays(null)}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">
                          {product.shipping_days ? `${product.shipping_days} días hábiles` : 'No especificado'}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => startEditingShippingDays(product)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
