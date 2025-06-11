import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useCartStore } from '../stores/cartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useShippingSettings } from '../hooks/useShippingSettings';
import { useAuthStore } from '../stores/authStore';
import { 
  ArrowLeft, 
  CreditCard, 
  Truck, 
  Package2, 
  MapPin, 
  User, 
  Mail, 
  Phone,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  paymentMethod: string;
}

export function GuestCheckout() {
  const navigate = useNavigate();
  const cartStore = useCartStore();
  const { settings } = useShippingSettings();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState<FormData>(() => {
    const saved = sessionStorage.getItem("checkout-form");
    return saved ? JSON.parse(saved) : {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Colombia",
      paymentMethod: ""
    };
  });

  useEffect(() => {
    sessionStorage.setItem("checkout-form", JSON.stringify(formData));
  }, [formData]);

  // Pre-rellenar formulario con datos del usuario si está logueado
  useEffect(() => {
    if (user && user.full_name && user.email) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || user.full_name || '',
        email: prev.email || user.email || '',
        // Solo llenar teléfono si está disponible y el campo está vacío
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  const redirectToMercadoPago = (url: string) => {
    console.log('Iniciando redirección a Mercado Pago:', url);
    
    // Limpiar datos
    cartStore.clearCart();
    sessionStorage.removeItem("checkout-form");
    
    // Redirigir directamente a Mercado Pago
    window.location.href = url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) {
      console.log('Formulario ya en proceso, ignorando envío adicional');
      return;
    }
    
    if (!cartStore.items.length) {
      toast.error("El carrito está vacío");
      return;
    }

    if (!formData.paymentMethod) {
      toast.error("Por favor selecciona un método de pago");
      return;
    }

    setLoading(true);
    
    try {
      console.log('Iniciando proceso de checkout');
      
      // Crear orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null, // Asociar al usuario si está logueado
          shipping_address: {
            full_name: formData.fullName,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postalCode,
            country: formData.country,
            phone: formData.phone
          },
          guest_info: {
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone
          },
          payment_method: formData.paymentMethod,
          total: cartStore.total,
          status: 'pending',
          payment_status: 'pending',
          is_guest: !user // Solo es guest si NO hay usuario logueado
        })
        .select()
        .single();

      if (orderError) throw orderError;
      
      console.log('Orden creada con ID:', order.id);

      // Crear items del pedido
      const orderItems = cartStore.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price,
        selected_color: item.selectedColor
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
      
      console.log('Items del pedido creados correctamente');

      if (formData.paymentMethod === 'mercadopago') {
        try {
          console.log('Iniciando proceso de pago con Mercado Pago');
          
          const { data: payment, error: paymentError } = await supabase.functions.invoke('create-payment', {
            body: {
              orderId: order.id,
              items: cartStore.items.map(item => ({
                product: {
                  name: item.product.name,
                  price: Number(item.product.price)
                },
                quantity: item.quantity
              })),
              total: cartStore.total
            }
          });

          if (paymentError || !payment?.init_point) {
            throw new Error(paymentError?.message || 'Error al crear preferencia de pago');
          }
          
          console.log('Preferencia de pago creada:', payment);
          redirectToMercadoPago(payment.init_point);
          return;
          
        } catch (mpError) {
          console.error('Error en proceso de Mercado Pago:', mpError);
          toast.error('Error al conectar con MercadoPago. Intenta nuevamente.');
          
          try {
            await supabase
              .from('orders')
              .delete()
              .eq('id', order.id);
          } catch (deleteError) {
            console.error('Error al eliminar orden huérfana:', deleteError);
          }
          
          setLoading(false);
          return;
        }
      } else { // Pago contra entrega
        console.log('Procesando pago contra entrega');
        
        await supabase
          .from('orders')
          .update({ 
            status: 'processing',
            payment_status: 'pending_cod'
          })
          .eq('id', order.id);

        cartStore.clearCart();
        sessionStorage.removeItem("checkout-form");
        
        toast.success('Pedido realizado con éxito');
        navigate(`/pago?status=pending_cod&order_id=${order.id}`);
        return;
      }

    } catch (error) {
      console.error('Error general en proceso de checkout:', error);
      toast.error('Error al procesar el pedido');
      setLoading(false);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.phone) {
        toast.error('Por favor completa todos los campos de contacto');
        return false;
      }
      if (!formData.email.includes('@')) {
        toast.error('Por favor ingresa un email válido');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!formData.address || !formData.city || !formData.postalCode) {
        toast.error('Por favor completa todos los campos de envío');
        return false;
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver a la tienda
            </button>
            <div className="text-sm text-gray-500">
              Carrito ({cartStore.items.length} {cartStore.items.length === 1 ? 'producto' : 'productos'})
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
          {/* Main content */}
          <div className="lg:col-span-7">
            {/* Progress steps */}
            <div className="mb-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-between">
                  <div className="flex items-center">
                    <span className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                      step >= 1 ? 'bg-indigo-600' : 'bg-gray-100'
                    }`}>
                      <User className={`h-5 w-5 ${step >= 1 ? 'text-white' : 'text-gray-500'}`} />
                      <span className="sr-only">Información de contacto</span>
                    </span>
                    <span className={`ml-2 text-sm font-medium ${
                      step >= 1 ? 'text-indigo-600' : 'text-gray-500'
                    }`}>
                      Contacto
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                      step >= 2 ? 'bg-indigo-600' : 'bg-gray-100'
                    }`}>
                      <MapPin className={`h-5 w-5 ${step >= 2 ? 'text-white' : 'text-gray-500'}`} />
                      <span className="sr-only">Información de envío</span>
                    </span>
                    <span className={`ml-2 text-sm font-medium ${
                      step >= 2 ? 'text-indigo-600' : 'text-gray-500'
                    }`}>
                      Envío
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                      step >= 3 ? 'bg-indigo-600' : 'bg-gray-100'
                    }`}>
                      <CreditCard className={`h-5 w-5 ${step >= 3 ? 'text-white' : 'text-gray-500'}`} />
                      <span className="sr-only">Método de pago</span>
                    </span>
                    <span className={`ml-2 text-sm font-medium ${
                      step >= 3 ? 'text-indigo-600' : 'text-gray-500'
                    }`}>
                      Pago
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form steps */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="contact"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Información de contacto
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                          Nombre completo
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={formData.fullName}
                            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Correo electrónico
                        </label>
                        <div className="mt-1">
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Teléfono
                        </label>
                        <div className="mt-1">
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="shipping"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Información de envío
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                          Dirección
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                            Ciudad
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              id="city"
                              name="city"
                              value={formData.city}
                              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                            Código postal
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              id="postalCode"
                              name="postalCode"
                              value={formData.postalCode}
                              onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Método de pago
                    </h2>
                    <div className="space-y-4">
                      <div className="relative">
                        <div
                          className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                            formData.paymentMethod === 'cash_on_delivery'
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-300 hover:border-indigo-500'
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cash_on_delivery' }))}
                        >
                          <div className="flex-shrink-0">
                            <Package2 className={`h-6 w-6 ${
                              formData.paymentMethod === 'cash_on_delivery' ? 'text-indigo-600' : 'text-gray-400'
                            }`} />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-gray-900">
                              Pago contra entrega
                            </h3>
                            <p className="text-sm text-gray-500">
                              Paga cuando recibas tu pedido
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <div
                          className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                            formData.paymentMethod === 'mercadopago'
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-300 hover:border-indigo-500'
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'mercadopago' }))}
                        >
                          <div className="flex-shrink-0">
                            <CreditCard className={`h-6 w-6 ${
                              formData.paymentMethod === 'mercadopago' ? 'text-indigo-600' : 'text-gray-400'
                            }`} />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-gray-900">
                              Pagar con Mercado Pago
                            </h3>
                            <p className="text-sm text-gray-500">
                              Tarjeta de crédito, débito o transferencia
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation buttons */}
              <div className="mt-8 flex justify-between">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Anterior
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Procesando...
                      </>
                    ) : (
                      'Finalizar compra'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Resumen del pedido
              </h2>

              <div className="flow-root">
                <ul role="list" className="-my-6 divide-y divide-gray-200">
                  {cartStore.items.map((item) => (
                    <li key={`${item.product.id}-${item.selectedColor || ''}`} className="py-6 flex">
                      <div className="flex-shrink-0 w-24 h-24 border border-gray-200 rounded-md overflow-hidden">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-center object-cover"
                        />
                      </div>

                      <div className="ml-4 flex-1 flex flex-col">
                        <div>
                          <div className="flex justify-between text-base font-medium text-gray-900">
                            <h3>{item.product.name}</h3>
                            <p className="ml-4">${(item.product.price * item.quantity).toFixed(2)}</p>
                          </div>
                          {item.selectedColor && (
                            <p className="mt-1 text-sm text-gray-500">Color: {item.selectedColor}</p>
                          )}
                        </div>
                        <div className="flex-1 flex items-end justify-between text-sm">
                          <p className="text-gray-500">Cantidad: {item.quantity}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-gray-200 mt-6 pt-6">
                <div className="flex justify-between text-base font-medium text-gray-900">
                  <p>Subtotal</p>
                  <p>${cartStore.total.toFixed(2)}</p>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  Envío calculado al finalizar la compra.
                </p>

                <div className="mt-6">
                  <div className="flex items-center">
                    <Truck className="h-5 w-5 text-green-500" />
                    <span className="ml-2 text-sm text-gray-500">
                      {settings?.free_shipping_enabled ? (
                        `Envío gratis en compras mayores a $${settings.free_shipping_threshold.toLocaleString()}`
                      ) : (
                        'Envío calculado al finalizar la compra'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuestCheckout;