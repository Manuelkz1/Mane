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
  Timer,
  MapPin,
  Phone,
  Mail,
  Star,
  Award,
  ShoppingBag,
  Eye
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
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'processing':
        return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'shipped':
        return 'text-purple-700 bg-purple-100 border-purple-200';
      case 'delivered':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'cancelled':
        return 'text-red-700 bg-red-100 border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <Award className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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

  const getTotalItems = (order: Order) => {
    return order.order_items?.reduce((total, item) => total + item.quantity, 0) || 0;
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
            {/* Enhanced Header for Completed Orders */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Pedidos Completados</h2>
                    <p className="text-green-100">
                      {completedOrders.length} pedido{completedOrders.length !== 1 ? 's' : ''} procesado{completedOrders.length !== 1 ? 's' : ''} exitosamente
                    </p>
                  </div>
                </div>
                {completedOrders.length > 0 && (
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      ${completedOrders.reduce((total, order) => total + order.total, 0).toLocaleString()}
                    </div>
                    <div className="text-green-100 text-sm">Total invertido</div>
                  </div>
                )}
              </div>
            </div>

            {completedOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  ¡Tu historial de compras te espera!
                </h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Cuando completes tu primer pedido, aparecerá aquí con todos los detalles y podrás hacer seguimiento de tus compras.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
                  >
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Explorar productos
                  </Link>
                  {pendingOrders.length > 0 && (
                    <button
                      onClick={() => setSearchParams({ tab: 'pending' })}
                      className="inline-flex items-center px-8 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-semibold"
                    >
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Ver Pagos Pendientes ({pendingOrders.length})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {completedOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
                    {/* Order Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-green-100 rounded-full p-2">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              Pedido #{order.id.slice(-8).toUpperCase()}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(order.created_at), 'dd/MM/yyyy')}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {format(new Date(order.created_at), 'HH:mm')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            <span className="font-medium">{getStatusText(order.status)}</span>
                          </div>
                          <button
                            onClick={() => toggleOrderExpansion(order.id)}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            {expandedOrders.has(order.id) ? 'Ocultar' : 'Ver detalles'}
                            {expandedOrders.has(order.id) ? 
                              <ChevronUp className="w-4 h-4" /> : 
                              <ChevronDown className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{getTotalItems(order)}</div>
                          <div className="text-sm text-blue-700">Productos</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">${order.total.toLocaleString()}</div>
                          <div className="text-sm text-green-700">Total pagado</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                          <div className="text-lg font-bold text-purple-600">
                            {order.payment_method === 'cash_on_delivery' ? 'Contra entrega' : 'MercadoPago'}
                          </div>
                          <div className="text-sm text-purple-700">Método de pago</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                          <div className="text-lg font-bold text-orange-600">
                            {order.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </div>
                          <div className="text-sm text-orange-700">Estado del pago</div>
                        </div>
                      </div>

                      {/* Products Preview */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Package className="w-5 h-5 text-gray-600" />
                          Productos en este pedido
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {order.order_items?.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                              {item.products.images?.[0] && (
                                <img 
                                  src={item.products.images[0]} 
                                  alt={item.products.name}
                                  className="w-12 h-12 object-cover rounded-lg shadow-sm"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-gray-900 truncate">{item.products.name}</h5>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span>Cant: {item.quantity}</span>
                                  <span>•</span>
                                  <span>${item.price_at_time.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {(order.order_items?.length || 0) > 3 && (
                            <div className="flex items-center justify-center bg-gray-50 rounded-lg p-3 text-gray-600">
                              <div className="text-center">
                                <div className="font-medium">+{(order.order_items?.length || 0) - 3}</div>
                                <div className="text-sm">productos más</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedOrders.has(order.id) && (
                        <div className="border-t border-gray-200 pt-6 space-y-6">
                          {/* Shipping Address */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <MapPin className="w-5 h-5 text-blue-600" />
                              Dirección de envío
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="font-medium text-gray-900">{order.shipping_address.full_name}</div>
                                <div className="text-gray-600 mt-1">
                                  {order.shipping_address.address}<br />
                                  {order.shipping_address.city}, {order.shipping_address.postal_code}<br />
                                  {order.shipping_address.country}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{order.shipping_address.phone}</span>
                              </div>
                            </div>
                          </div>

                          {/* All Products */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <ShoppingBag className="w-5 h-5 text-gray-600" />
                              Todos los productos
                            </h4>
                            <div className="space-y-3">
                              {order.order_items?.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                  {item.products.images?.[0] && (
                                    <img 
                                      src={item.products.images[0]} 
                                      alt={item.products.name}
                                      className="w-16 h-16 object-cover rounded-lg shadow-sm"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-gray-900">{item.products.name}</h5>
                                    {item.products.description && (
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {item.products.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        Cantidad: {item.quantity}
                                      </span>
                                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        ${item.price_at_time.toLocaleString()} c/u
                                      </span>
                                      {item.selected_color && (
                                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                          Color: {item.selected_color}
                                        </span>
                                      )}
                                      {item.products.shipping_days && (
                                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full flex items-center gap-1">
                                          <Truck className="w-3 h-3" />
                                          {item.products.shipping_days} días
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-gray-900">
                                      ${(item.price_at_time * item.quantity).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-500">Subtotal</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Total */}
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Award className="w-6 h-6 text-green-600" />
                                <span className="text-lg font-semibold text-gray-900">Total del pedido</span>
                              </div>
                              <div className="text-3xl font-bold text-green-600">
                                ${order.total.toLocaleString()}
                              </div>
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