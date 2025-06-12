import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Order } from '../types/index';
import { format } from 'date-fns';
import { 
  Package, 
  ChevronRight, 
  ArrowLeft, 
  Clock, 
  RefreshCw,
  CreditCard,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PendingPaymentsPage() {
  const { user } = useAuthStore();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingPayment, setRetryingPayment] = useState<string | null>(null);

  useEffect(() => {
    loadPendingOrders();
  }, [user]);

  const loadPendingOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar pedidos con payment_status = 'pending' y payment_method = 'mercadopago'
      // Estos son pedidos donde el usuario fue redirigido a MercadoPago pero no completó el pago
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price_at_time,
            selected_color,
            products (
              name,
              images,
              shipping_days,
              description
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('payment_method', 'mercadopago')
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPendingOrders(data || []);
    } catch (error: any) {
      console.error('Error loading pending orders:', error);
      setError('Error al cargar los pedidos pendientes');
      toast.error('Error al cargar los pedidos pendientes');
    } finally {
      setLoading(false);
    }
  };

  const retryPayment = async (order: Order) => {
    if (!order.id) return;

    setRetryingPayment(order.id);

    try {
      // Crear nueva preferencia de pago para el pedido existente
      const { data: payment, error: paymentError } = await supabase.functions.invoke('create-payment', {
        body: {
          orderId: order.id,
          items: order.order_items?.map(item => ({
            product: {
              name: item.products.name,
              price: Number(item.price_at_time)
            },
            quantity: item.quantity
          })) || [],
          total: order.total
        }
      });

      if (paymentError || !payment?.init_point) {
        throw new Error(paymentError?.message || 'Error al crear preferencia de pago');
      }

      // Actualizar la URL de pago en el pedido
      await supabase
        .from('orders')
        .update({ payment_url: payment.init_point })
        .eq('id', order.id);

      // Redirigir a MercadoPago
      window.open(payment.init_point, '_blank');
      toast.success('Redirigiendo a MercadoPago...');

    } catch (error: any) {
      console.error('Error retrying payment:', error);
      toast.error('Error al reintentar el pago');
    } finally {
      setRetryingPayment(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      toast.success('Pedido cancelado');
      loadPendingOrders(); // Recargar la lista
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error('Error al cancelar el pedido');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/orders" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Mis Pedidos
          </Link>

          <div className="flex items-center mb-2">
            <Clock className="h-6 w-6 text-orange-500 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Pendientes de Pago</h1>
          </div>

          <p className="text-gray-600">
            Estos pedidos fueron iniciados pero el pago no se completó. 
            Puedes reintentar el pago o cancelar el pedido.
          </p>
        </div>

        {/* Alert */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">
                ¿Por qué aparecen estos pedidos aquí?
              </h3>
              <p className="mt-1 text-sm text-orange-700">
                Iniciaste el proceso de compra y fuiste redirigido a MercadoPago, 
                pero el pago no se completó. Los productos siguen reservados por un tiempo limitado.
              </p>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {pendingOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes pedidos pendientes de pago
            </h3>
            <p className="text-gray-500 mb-6">
              Todos tus pedidos han sido pagados o cancelados.
            </p>
            <Link
              to="/orders"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Ver Mis Pedidos
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pedido #{order.id.slice(0, 8)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Iniciado el {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${order.total.toLocaleString()}
                      </p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pago Pendiente
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Productos:</h4>
                    <div className="space-y-2">
                      {order.order_items?.map((item, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <span className="font-medium">{item.quantity}x</span>
                          <span className="ml-2">{item.products.name}</span>
                          {item.selected_color && (
                            <span className="ml-2 text-gray-500">({item.selected_color})</span>
                          )}
                          <span className="ml-auto font-medium">
                            ${(item.price_at_time * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => retryPayment(order)}
                      disabled={retryingPayment === order.id}
                      className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                    >
                      {retryingPayment === order.id ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      {retryingPayment === order.id ? 'Procesando...' : 'Completar Pago'}
                    </button>

                    {order.payment_url && (
                      <a
                        href={order.payment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ir a MercadoPago
                      </a>
                    )}

                    <button
                      onClick={() => {
                        if (confirm('¿Estás seguro de que quieres cancelar este pedido?')) {
                          cancelOrder(order.id);
                        }
                      }}
                      className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex-1"
                    >
                      Cancelar Pedido
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={loadPendingOrders}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar Lista
          </button>
        </div>
      </div>
    </div>
  );
}
