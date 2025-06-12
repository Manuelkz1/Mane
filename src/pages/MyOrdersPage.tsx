import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Order, Product } from '../types/index';
import { format } from 'date-fns';
import { 
  Package, 
  ChevronRight, 
  ArrowLeft, 
  Truck, 
  Calendar, 
  Clock,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MyOrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
    loadPendingPaymentCount();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar solo pedidos que NO están pendientes de pago
      // Excluir pedidos con payment_method = 'mercadopago' y payment_status = 'pending'
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
        .not('and', '(payment_method.eq.mercadopago,payment_status.eq.pending)')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      setError('Error al cargar los pedidos');
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingPaymentCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('payment_method', 'mercadopago')
        .eq('payment_status', 'pending');

      if (error) throw error;
      setPendingPaymentCount(count || 0);
    } catch (error: any) {
      console.error('Error loading pending payment count:', error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Pendiente',
      processing: 'Procesando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPaymentStatusBadge = (paymentStatus: string, paymentMethod: string) => {
    if (paymentMethod === 'cash_on_delivery') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Contra Entrega
        </span>
      );
    }

    switch (paymentStatus) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Pagado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pago Pendiente
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Pago Fallido
          </span>
        );
      default:
        return null;
    }
  };

  // Función para obtener los días de envío de un producto
  const getShippingDays = (product: any): string => {
    if (product.shipping_days) {
      return product.shipping_days;
    }

    if (product.description) {
      const match = product.description.match(/\[shipping_days:(\d+)\]/);
      if (match && match[1]) {
        return match[1];
      }
    }

    return "3-5";
  };

  const getOrderEstimatedDays = (order: Order): string => {
    if (!order.order_items || order.order_items.length === 0) return "3-5";

    const shippingDaysArray = order.order_items.map(item => getShippingDays(item.products));

    const maxDays = Math.max(...shippingDaysArray.map(days => {
      if (days.includes('-')) {
        const parts = days.split('-');
        return parseInt(parts[1], 10) || parseInt(parts[0], 10);
      }
      return parseInt(days, 10) || 5;
    }));

    const uniqueDays = [...new Set(shippingDaysArray)];

    if (uniqueDays.length === 1) {
      return uniqueDays[0];
    } else {
      return `3-${maxDays}`;
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
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos</h1>
            </div>
          </div>
        </div>

        {/* Pending Payments Alert */}
        {pendingPaymentCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-orange-800">
                  Tienes {pendingPaymentCount} pedido{pendingPaymentCount > 1 ? 's' : ''} pendiente{pendingPaymentCount > 1 ? 's' : ''} de pago
                </h3>
                <p className="mt-1 text-sm text-orange-700">
                  Completar el pago para procesar tu{pendingPaymentCount > 1 ? 's' : ''} pedido{pendingPaymentCount > 1 ? 's' : ''}.
                </p>
              </div>
              <Link
                to="/pending-payments"
                className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700"
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Ver Pendientes
              </Link>
            </div>
          </div>
        )}

        {/* Orders List */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes pedidos aún
            </h3>
            <p className="text-gray-500 mb-6">
              Cuando realices tu primera compra, aparecerá aquí.
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Explorar productos
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pedido #{order.id.slice(0, 8)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${order.total.toLocaleString()}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                        {getPaymentStatusBadge(order.payment_status, order.payment_method)}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-4">
                    <div className="space-y-2">
                      {order.order_items?.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-center text-sm">
                          {item.products.images && item.products.images[0] && (
                            <img
                              src={item.products.images[0]}
                              alt={item.products.name}
                              className="w-10 h-10 rounded object-cover mr-3"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.products.name}</p>
                            <p className="text-gray-500">
                              Cantidad: {item.quantity}
                              {item.selected_color && ` • Color: ${item.selected_color}`}
                            </p>
                          </div>
                          <p className="font-medium text-gray-900">
                            ${(item.price_at_time * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}

                      {order.order_items && order.order_items.length > 3 && (
                        <p className="text-sm text-gray-500 mt-2">
                          y {order.order_items.length - 3} producto{order.order_items.length - 3 > 1 ? 's' : ''} más
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shipping Info */}
                  {(order.status === 'processing' || order.status === 'shipped') && (
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <Truck className="h-4 w-4 mr-2" />
                      <span>
                        Tiempo estimado de entrega: {getOrderEstimatedDays(order)} días hábiles
                      </span>
                    </div>
                  )}

                  {/* Shipping Address */}
                  <div className="text-sm text-gray-600 mb-4">
                    <p className="font-medium">Dirección de envío:</p>
                    <p>{order.shipping_address.full_name}</p>
                    <p>{order.shipping_address.address}</p>
                    <p>{order.shipping_address.city}, {order.shipping_address.postal_code}</p>
                    <p>{order.shipping_address.country}</p>
                  </div>

                  {/* View Details Button */}
                  <Link
                    to={`/order/${order.id}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Ver detalles
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
