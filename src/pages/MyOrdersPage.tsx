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
  CreditCard,
  ExternalLink,
  CheckCircle
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
      // Excluir pedidos con payment_status = 'payment_pending' o mercadopago pending
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
        .neq('payment_status', 'payment_pending')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error loading orders:', fetchError);
        setError('Error al cargar los pedidos');
        return;
      }

      // Filter out mercadopago orders with pending payment status on the client side
      const filteredOrders = (data || []).filter(order => 
        !(order.payment_method === 'mercadopago' && order.payment_status === 'pending')
      );

      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Error al cargar los pedidos');
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
        .or('payment_status.eq.payment_pending,and(payment_method.eq.mercadopago,payment_status.eq.pending)');

      if (error) {
        console.error('Error loading pending payment count:', error);
        return;
      }

      setPendingPaymentCount(count || 0);
    } catch (error) {
      console.error('Error loading pending payment count:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'shipped':
        return 'text-purple-600 bg-purple-100';
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'payment_pending':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'processing':
        return 'En Proceso';
      case 'shipped':
        return 'Enviado';
      case 'delivered':
        return 'Entregado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getPaymentStatusText = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'pending':
        return 'Pago Pendiente';
      case 'paid':
        return 'Pagado';
      case 'failed':
        return 'Pago Fallido';
      case 'payment_pending':
        return 'Esperando Pago';
      default:
        return paymentStatus;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={loadOrders}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/" 
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a la tienda
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos Completados</h1>
                <p className="text-gray-600">
                  Pedidos procesados y pagados exitosamente
                </p>
              </div>
            </div>
            
            {/* Navigation to Pending Payments */}
            {pendingPaymentCount > 0 && (
              <Link
                to="/pending-payments"
                className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div className="text-left">
                    <div className="font-medium text-orange-800">
                      {pendingPaymentCount} Pago{pendingPaymentCount !== 1 ? 's' : ''} Pendiente{pendingPaymentCount !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-orange-700">
                      Completar pagos
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-orange-600" />
              </Link>
            )}
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes pedidos completados aún
            </h3>
            <p className="text-gray-500 mb-6">
              Cuando completes tu primer pedido, aparecerá aquí
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Comenzar a comprar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
              {pendingPaymentCount > 0 && (
                <Link
                  to="/pending-payments"
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Ver Pagos Pendientes ({pendingPaymentCount})
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          Pedido #{order.id.slice(-8).toUpperCase()}
                        </h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                          {getPaymentStatusText(order.payment_status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                        <div className="font-medium">
                          Total: ${order.total.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.payment_method === 'mercadopago' && order.payment_url && (
                        <a
                          href={order.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          Ver Pago
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <Link
                        to={`/orders/${order.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Ver Detalles
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Dirección de envío</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {order.shipping_address.full_name}<br />
                      {order.shipping_address.address}<br />
                      {order.shipping_address.city}, {order.shipping_address.postal_code}<br />
                      {order.shipping_address.country}<br />
                      Tel: {order.shipping_address.phone}
                    </p>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Productos</h4>
                    {order.order_items?.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                        {item.products.images?.[0] && (
                          <img 
                            src={item.products.images[0]} 
                            alt={item.products.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{item.products.name}</h5>
                          {item.products.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {item.products.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>Cantidad: {item.quantity}</span>
                            <span>Precio: ${item.price_at_time.toLocaleString()}</span>
                            {item.selected_color && (
                              <span>Color: {item.selected_color}</span>
                            )}
                            {item.products.shipping_days && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Envío: {item.products.shipping_days} días</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            ${(item.price_at_time * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}