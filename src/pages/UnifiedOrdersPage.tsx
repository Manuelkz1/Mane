import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Order } from '../types/index';
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
  CheckCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Timer
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UnifiedOrdersPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'completed';
  
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load all orders
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
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error loading orders:', fetchError);
        setError('Error al cargar los pedidos');
        return;
      }

      const orders = data || [];

      // Separate completed and pending orders
      const completed = orders.filter(order => 
        order.payment_status !== 'payment_pending' && 
        !(order.payment_method === 'mercadopago' && order.payment_status === 'pending')
      );

      const pending = orders.filter(order => 
        order.payment_status === 'payment_pending' || 
        (order.payment_method === 'mercadopago' && order.payment_status === 'pending')
      );

      setCompletedOrders(completed);
      setPendingOrders(pending);
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const retryPayment = async (order: Order) => {
    setProcessingOrder(order.id);

    try {
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

      await supabase
        .from('orders')
        .update({ 
          payment_url: payment.init_point,
          payment_status: 'pending'
        })
        .eq('id', order.id);

      window.open(payment.init_point, '_blank');
      toast.success('Redirigiendo a MercadoPago...');

      setTimeout(loadOrders, 2000);
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast.error('Error al procesar el pago');
    } finally {
      setProcessingOrder(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar este pedido?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) {
        toast.error('Error al cancelar el pedido');
        return;
      }

      toast.success('Pedido cancelado');
      loadOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Error al cancelar el pedido');
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

  const getTimeRemaining = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = (48 * 60 * 60 * 1000) - (now.getTime() - created.getTime());
    
    if (diffMs <= 0) return 'Expirado';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m restantes`;
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
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

        {/* Main Header */}
        <div className="bg-white rounded-xl shadow-lg mb-8 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
              <p className="text-gray-600">Gestiona todos tus pedidos desde aquí</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSearchParams({ tab: 'completed' })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all ${
                activeTab === 'completed'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              Completados ({completedOrders.length})
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'pending' })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all ${
                activeTab === 'pending'
                  ? 'bg-white text-orange-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              Pendientes ({pendingOrders.length})
            </button>
          </div>
        </div>

        {/* Content Sections */}
        {activeTab === 'completed' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">Pedidos Completados</h2>
              </div>

              {completedOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No tienes pedidos completados
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Cuando completes tu primer pedido, aparecerá aquí
                  </p>
                  <Link
                    to="/"
                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Comenzar a comprar
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <h3 className="font-semibold text-gray-900">
                                Pedido #{order.id.slice(-8).toUpperCase()}
                              </h3>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleOrderExpansion(order.id)}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                          >
                            {expandedOrders.has(order.id) ? 'Ocultar' : 'Ver detalles'}
                            {expandedOrders.has(order.id) ? 
                              <ChevronUp className="w-4 h-4" /> : 
                              <ChevronDown className="w-4 h-4" />
                            }
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            ${order.total.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            {order.order_items?.length || 0} productos
                          </div>
                        </div>

                        {expandedOrders.has(order.id) && (
                          <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-2">Dirección de envío</h4>
                              <p className="text-sm text-gray-600">
                                {order.shipping_address.full_name}<br />
                                {order.shipping_address.address}<br />
                                {order.shipping_address.city}, {order.shipping_address.postal_code}<br />
                                Tel: {order.shipping_address.phone}
                              </p>
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                              <div className="space-y-3">
                                {order.order_items?.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                    {item.products.images?.[0] && (
                                      <img 
                                        src={item.products.images[0]} 
                                        alt={item.products.name}
                                        className="w-16 h-16 object-cover rounded-lg"
                                      />
                                    )}
                                    <div className="flex-1">
                                      <h5 className="font-medium text-gray-900">{item.products.name}</h5>
                                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                        <span>Cantidad: {item.quantity}</span>
                                        <span>Precio: ${item.price_at_time.toLocaleString()}</span>
                                        {item.selected_color && <span>Color: {item.selected_color}</span>}
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
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">Pedidos Pendientes</h2>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No tienes pagos pendientes
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Todos tus pedidos han sido procesados correctamente
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setSearchParams({ tab: 'completed' })}
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Ver Pedidos Completados
                    </button>
                    <Link
                      to="/"
                      className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Seguir Comprando
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingOrders.map((order) => (
                    <div key={order.id} className="border-2 border-orange-200 rounded-lg overflow-hidden bg-orange-50">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-orange-600" />
                              <h3 className="font-semibold text-gray-900">
                                Pedido #{order.id.slice(-8).toUpperCase()}
                              </h3>
                            </div>
                            <div className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                              Pago Pendiente
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-orange-700">
                            <Timer className="w-4 h-4" />
                            {getTimeRemaining(order.created_at)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-6">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            ${order.total.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            {order.order_items?.length || 0} productos
                          </div>
                        </div>

                        {/* Products Preview */}
                        <div className="mb-6">
                          <div className="flex flex-wrap gap-2">
                            {order.order_items?.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2">
                                {item.products.images?.[0] && (
                                  <img 
                                    src={item.products.images[0]} 
                                    alt={item.products.name}
                                    className="w-8 h-8 object-cover rounded"
                                  />
                                )}
                                <span className="text-sm font-medium text-gray-900">
                                  {item.products.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  x{item.quantity}
                                </span>
                              </div>
                            ))}
                            {(order.order_items?.length || 0) > 3 && (
                              <div className="flex items-center justify-center bg-white rounded-lg p-2 text-sm text-gray-500">
                                +{(order.order_items?.length || 0) - 3} más
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => retryPayment(order)}
                            disabled={processingOrder === order.id}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {processingOrder === order.id ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <CreditCard className="w-5 h-5" />
                            )}
                            Completar Pago
                          </button>

                          <button
                            onClick={() => cancelOrder(order.id)}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <X className="w-5 h-5" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}