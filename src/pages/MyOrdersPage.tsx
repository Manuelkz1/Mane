import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Order, Product } from '../types/index';
import { format } from 'date-fns';
import { Package, ChevronRight, ArrowLeft, Truck, Calendar, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MyOrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

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

  // Función para obtener los días de envío de un producto
  const getShippingDays = (product: any): string => {
    // Intentar obtener los días de envío del campo shipping_days
    if (product.shipping_days) {
      return product.shipping_days;
    }
    
    // Si no existe, intentar extraerlo de la descripción (manteniendo compatibilidad)
    if (product.description) {
      const match = product.description.match(/\[shipping_days:(\d+)\]/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Si no se encuentra en ningún lado, devolver valor predeterminado
    return "3-5";
  };

  // Función para obtener los días de envío estimados de todos los productos en el pedido
  const getOrderEstimatedDays = (order: Order): string => {
    if (!order.order_items || order.order_items.length === 0) return "3-5";
    
    // Obtener el rango máximo de días de envío entre todos los productos del pedido
    const shippingDaysArray = order.order_items.map(item => getShippingDays(item.products));
    
    // Extraer el número más alto de cada rango para calcular el máximo tiempo estimado
    const maxDays = Math.max(...shippingDaysArray.map(days => {
      // Si es un rango como "10-15", tomar el número más alto
      if (days.includes('-')) {
        const parts = days.split('-');
        return parseInt(parts[1], 10) || parseInt(parts[0], 10);
      }
      // Si es un número simple como "10", convertirlo
      return parseInt(days, 10) || 5;
    }));
    
    // Si todos los productos tienen el mismo tiempo, devolver ese rango
    // Si no, devolver el máximo encontrado
    const uniqueDays = [...new Set(shippingDaysArray)];
    if (uniqueDays.length === 1) {
      return uniqueDays[0];
    }
    
    return `${Math.max(3, maxDays - 2)}-${maxDays}`;
  };

  // Función para manejar errores de imágenes de manera consistente
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackText: string = 'Sin imagen') => {
    const target = e.target as HTMLImageElement;
    target.src = `https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=${encodeURIComponent(fallbackText)}`;
  };

  // Función para obtener el total de productos en un pedido
  const getTotalProductsInOrder = (order: Order): number => {
    if (!order.order_items) return 0;
    return order.order_items.reduce((total, item) => total + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <Link to="/\" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </Link>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </Link>
          </div>
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-indigo-500 to-purple-600">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">Mis Pedidos</h2>
                <p className="text-indigo-100 text-sm">Historial completo de tus compras</p>
              </div>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay pedidos aún</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Descubre nuestros productos y realiza tu primera compra. ¡Tenemos ofertas increíbles esperándote!
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                <Package className="h-5 w-5 mr-2" />
                Explorar productos
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {orders.map((order, orderIndex) => (
                <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <Link to={`/orders/${order.id}`} className="block">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Header del pedido con numeración */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Pedido {orderIndex + 1}
                            </h3>
                            <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                              #{order.id?.substring(0, 8)}
                            </span>
                            {/* Contador de productos */}
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {getTotalProductsInOrder(order)} producto{getTotalProductsInOrder(order) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex-shrink-0">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(order.status)}`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </div>
                        </div>

                        {/* Información principal del pedido */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          {/* Fecha de pedido */}
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Fecha del pedido</p>
                              <p className="text-sm font-medium text-gray-900">
                                {format(new Date(order.created_at), 'dd/MM/yyyy')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(order.created_at), 'HH:mm')}
                              </p>
                            </div>
                          </div>

                          {/* Días estimados de entrega */}
                          <div className="flex items-center space-x-2">
                            <Truck className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Tiempo de entrega</p>
                              <p className="text-sm font-medium text-gray-900">
                                {getOrderEstimatedDays(order)} días hábiles estimados
                              </p>
                              <p className="text-xs text-gray-500">Desde la confirmación</p>
                            </div>
                          </div>

                          {/* Total del pedido */}
                          <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 bg-indigo-500 rounded-full flex items-center justify-center">
                              <span className="text-xs text-white font-bold">$</span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Total pagado</p>
                              <p className="text-lg font-bold text-gray-900">
                                ${order.total.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Lista de productos con imágenes */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Productos incluidos</p>
                            <span className="text-xs text-gray-400">
                              {order.order_items?.length} producto{order.order_items?.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          {/* Grid de productos para múltiples items */}
                          {order.order_items && order.order_items.length > 1 ? (
                            <div className={`grid gap-3 ${
                              order.order_items.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                              order.order_items.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
                              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                            }`}>
                              {/* Mostrar máximo 6 productos para evitar sobrecarga visual */}
                              {order.order_items.slice(0, 6).map((item, index) => (
                                <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                  <div className="flex items-start space-x-3">
                                    {/* Imagen del producto */}
                                    <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                                      <img
                                        src={item.products.images?.[0] || 'https://via.placeholder.com/64x64/f3f4f6/9ca3af?text=Sin+imagen'}
                                        alt={item.products.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => handleImageError(e, 'Sin imagen')}
                                      />
                                    </div>
                                    
                                    {/* Información del producto */}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium text-gray-900 truncate">
                                        {item.products.name}
                                      </h4>
                                      
                                      {/* Color seleccionado */}
                                      {item.selected_color && (
                                        <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                          {item.selected_color}
                                        </span>
                                      )}
                                      
                                      {/* Cantidad y precio */}
                                      <div className="mt-2 flex items-center justify-between">
                                        <span className="text-xs text-gray-500">
                                          Cant: {item.quantity}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900">
                                          ${(item.price_at_time * item.quantity).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Indicador de productos adicionales si hay más de 6 */}
                              {order.order_items.length > 6 && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                                      <Package className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">
                                      +{order.order_items.length - 6} productos más
                                    </p>
                                    <p className="text-xs text-gray-500">Ver detalles completos</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Diseño expandido para un solo producto */
                            order.order_items?.map((item, index) => (
                              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start space-x-4">
                                  {/* Imagen del producto más grande para pedido único */}
                                  <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                                    <img
                                      src={item.products.images?.[0] || 'https://via.placeholder.com/80x80/f3f4f6/9ca3af?text=Sin+imagen'}
                                      alt={item.products.name}
                                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                                      onError={(e) => handleImageError(e, 'Sin imagen')}
                                    />
                                  </div>
                                  
                                  {/* Información detallada del producto */}
                                  <div className="flex-1">
                                    <h4 className="text-base font-medium text-gray-900 mb-2">
                                      {item.products.name}
                                    </h4>
                                    
                                    <div className="flex items-center space-x-4 mb-3">
                                      {/* Color seleccionado */}
                                      {item.selected_color && (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-xs text-gray-500">Color:</span>
                                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                            {item.selected_color}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {/* Cantidad */}
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500">Cantidad:</span>
                                        <span className="text-sm font-medium text-gray-900">
                                          {item.quantity}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Precio */}
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-500">
                                        ${item.price_at_time.toFixed(2)} c/u
                                      </span>
                                      <span className="text-lg font-bold text-indigo-600">
                                        ${(item.price_at_time * item.quantity).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                          
                          {/* Resumen visual de productos para pedidos con múltiples items */}
                          {order.order_items && order.order_items.length > 1 && (
                            <div className="mt-4 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Vista previa del pedido</p>
                              <div className="flex items-center space-x-2">
                                {order.order_items.slice(0, 4).map((item, index) => (
                                  <div key={index} className="relative">
                                    <div className="w-10 h-10 bg-gray-100 rounded border-2 border-white shadow-sm overflow-hidden">
                                      <img
                                        src={item.products.images?.[0] || 'https://via.placeholder.com/40x40/f3f4f6/9ca3af?text=?'}
                                        alt={item.products.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => handleImageError(e, '?')}
                                      />
                                    </div>
                                    {/* Indicador de cantidad si es mayor a 1 */}
                                    {item.quantity > 1 && (
                                      <div className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                        {item.quantity}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {order.order_items.length > 4 && (
                                  <div className="w-10 h-10 bg-gray-200 rounded border-2 border-white shadow-sm flex items-center justify-center">
                                    <span className="text-xs text-gray-600 font-medium">
                                      +{order.order_items.length - 4}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Flecha de navegación */}
                      <div className="ml-6 flex-shrink-0 self-center">
                        <ChevronRight className="h-6 w-6 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}