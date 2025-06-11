import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react'; // Removed Truck, CreditCard as they are not used here
import type { CartItem } from '../types/index';
import { useAuthStore } from '../stores/authStore';

interface DropshipperCheckoutProps {
  items: CartItem[];
  total: number; // This is subtotal of products
  onBack: () => void;
  onSuccess: () => void;
}

const SHIPPING_COST = 10000; // COP $10,000
// const MERCADOPAGO_URL = 'https://mpago.li/2CwQxmz'; // Removed static URL

export function DropshipperCheckout({ items, total, onBack, onSuccess }: DropshipperCheckoutProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Colombia',
    shippingType: 'with_collection', // Default or could be dynamic
    paymentMethod: 'mercadopago' // Defaulting to mercadopago for shipping payment
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        toast.error('Usuario no autenticado. Por favor, inicia sesión.');
        setLoading(false);
        return;
      }

      // Create the order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          dropshipper_id: user.id,
          shipping_address: {
            full_name: formData.customerName,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postalCode,
            country: formData.country,
            phone: formData.customerPhone
          },
          guest_info: { // Storing customer info here as well for dropshipping context
            full_name: formData.customerName,
            email: formData.customerEmail,
            phone: formData.customerPhone
          },
          payment_method: formData.paymentMethod, // For the shipping payment
          // payment_url: MERCADOPAGO_URL, // Removed static URL
          total: total, // Product subtotal, actual collected amount might differ
          status: 'pending',
          payment_status: 'pending', // Initial status for the order, will be updated by webhook for shipping payment
          shipping_type: formData.shippingType,
          advance_payment: SHIPPING_COST // The amount to be paid now
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error(orderError.message || 'Error al crear el pedido');
      }

      if (!order) {
        throw new Error('No se pudo crear el pedido');
      }

      // Create order items
      const orderItemsData = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price,
        selected_color: item.selectedColor
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        // Rollback order creation if items fail
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(itemsError.message || 'Error al crear los items del pedido');
      }

      // onSuccess(); // Call after payment initiation or order confirmation navigation

      if (formData.paymentMethod === 'mercadopago') {
        toast.loading('Generando enlace de pago para el envío...');

        // For dropshipping, the payment is for the SHIPPING_COST
        const paymentPayload = {
          orderId: order.id, // Link the payment to this order
          items: [
            {
              product: {
                name: `Costo de Envío - Pedido ${order.id}`,
                price: Number(SHIPPING_COST),
              },
              quantity: 1,
            },
          ],
          total: Number(SHIPPING_COST),
        };

        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          'create-payment',
          { body: paymentPayload }
        );
        
        toast.dismiss(); // Dismiss loading toast

        if (paymentError || !paymentData || !paymentData.init_point) {
          console.error('Error creating MercadoPago preference for shipping:', paymentError, paymentData);
          // Update order status to reflect payment creation failure for shipping
          await supabase
            .from('orders')
            .update({ payment_status: 'shipping_payment_failed', status: 'pending_shipping_payment' })
            .eq('id', order.id);
          toast.error(paymentData?.error || paymentError?.message || 'Error al generar el enlace de pago para el envío. Contacta a soporte.');
          setLoading(false);
          return; // Stop execution here
        }
        
        onSuccess(); // Clear cart etc.
        toast.success('Redirigiendo a MercadoPago para el pago del envío...');
        window.location.href = paymentData.init_point; // Redirect to MercadoPago

      } else {
        // Handle other payment methods for shipping if any, or this path might not be used if mercadopago is default
        onSuccess();
        toast.info('Pedido creado. El pago del envío se gestionará por otro método.');
        navigate('/order-confirmation', { 
          state: { 
            orderId: order.id,
            isDropshipper: true
          }
        });
      }
    } catch (error: any) {
      console.error('Error al procesar el pedido de dropshipping:', error);
      toast.error(error.message || 'Error al procesar el pedido. Por favor intenta de nuevo.');
      setLoading(false); // Ensure loading is stopped on error
    } 
    // finally {
      // setLoading(false); // Handled specifically in error cases or before navigation
    // }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="relative">
          <button
            onClick={onBack}
            className="absolute -left-2 top-0 p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Crear Pedido Dropshipping
          </h2>
        </div>

        <div className="mt-8">
          <div className="bg-white p-6 shadow rounded-lg">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen del pedido (Productos)</h3>
              {items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-600">
                      Cantidad: {item.quantity}
                      {item.selectedColor && ` - Color: ${item.selectedColor}`}
                    </p>
                  </div>
                  <p className="font-medium">${(Number(item.product.price) * item.quantity).toFixed(2)}</p>
                </div>
              ))}
               <div className="flex justify-between text-base font-medium text-gray-900 mt-2">
                  <p>Subtotal Productos</p>
                  <p>${Number(total).toFixed(2)}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre del cliente
                </label>
                <input
                  type="text"
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email del cliente
                </label>
                <input
                  type="email"
                  name="customerEmail"
                  required
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Teléfono del cliente
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  required
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Dirección de envío (Cliente Final)
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ciudad (Cliente Final)
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Código postal (Cliente Final)
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    required
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tipo de envío (para el cliente final)
                </label>
                <select
                  name="shippingType"
                  value={formData.shippingType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="with_collection">Con recaudo (Paga al recibir)</option>
                  <option value="without_collection">Sin recaudo (Ya pagado o dropshipper cubre)</option>
                </select>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-base font-medium text-gray-900 mt-2">
                  <p className="font-semibold">Costo de Envío (A pagar por el Dropshipper ahora)</p>
                  <p className="font-semibold">${SHIPPING_COST.toFixed(2)}</p>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Como dropshipper, pagarás el costo de envío ahora. El valor de los productos ({formData.shippingType === 'with_collection' ? 'se recaudará' : 'no se recaudará'}) al cliente final.
                </p>
              </div>
              
              {/* Payment method selection could be added if there are options other than MercadoPago for shipping */}
              {/* For now, it's defaulted to MercadoPago */}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Pagar Envío y Crear Pedido'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

