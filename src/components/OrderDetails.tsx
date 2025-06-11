import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Order } from '../types/index';
import { format } from 'date-fns';
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'react-hot-toast';

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price_at_time,
            selected_color,
            products (
              id,
              name,
              images
            )
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Verify user has access to this order
      if (!data) {
        throw new Error('Pedido no encontrado');
      }

      if (data.user_id !== user?.id && user?.role !== 'admin' && user?.role !== 'fulfillment') {
        throw new Error('No tienes permiso para ver este pedido');
      }

      setOrder(data);
    } catch (error: any) {
      console.error('Error loading order:', error);
      setError(error.message || 'Error al cargar el pedido');
      toast.error(error.message || 'Error al cargar el pedido');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'processing':
        return <Package className="h-5 w-5" />;
      case 'shipped':
        return <Truck className="h-5 w-5" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Error</h3>
              <p className="mt-1 text-sm text-gray-500">{error || 'Pedido no encontrado'}</p>
              <div className="mt-6">
                <Link
                  to="/orders"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Volver a mis pedidos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Pedido #{order.id?.substring(0, 8)}
              </h2>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="ml-2">{getStatusLabel(order.status)}</span>
              </span>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Información del pedido</h3>
                <dl className="mt-2 text-sm text-gray-900">
                  <div className="mt-1">
                    <dt className="inline text-gray-500">Fecha:</dt>
                    <dd className="inline ml-1">
                      {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                    </dd>
                  </div>
                  <div className="mt-1">
                    <dt className="inline text-gray-500">Estado del pago:</dt>
                    <dd className="inline ml-1">
                      {order.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </dd>
                  </div>
                  <div className="mt-1">
                    <dt className="inline text-gray-500">Método de pago:</dt>
                    <dd className="inline ml-1">
                      {order.payment_method === 'cash_on_delivery' ? 'Pago contra entrega' : 'Mercado Pago'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Dirección de envío</h3>
                <address className="mt-2 text-sm text-gray-900 not-italic">
                  <p>{order.shipping_address.full_name}</p>
                  <p>{order.shipping_address.address}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.postal_code}</p>
                  <p>{order.shipping_address.country}</p>
                  <p>Tel: {order.shipping_address.phone}</p>
                </address>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Productos</h3>
            <div className="divide-y divide-gray-200">
              {order.order_items?.map((item, index) => (
                <div key={index} className="py-4 flex">
                  <div className="flex-shrink-0 w-24 h-24">
                    {item.products.images?.[0] && (
                      <img
                        src={item.products.images[0]}
                        alt={item.products.name}
                        className="w-full h-full object-center object-cover rounded-md"
                      />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.products.name}
                        </h4>
                        {item.selected_color && (
                          <p className="mt-1 text-sm text-gray-500">
                            Color: {item.selected_color}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        ${(item.price_at_time * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="flex justify-between text-base font-medium text-gray-900">
                <p>Total</p>
                <p>${order.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}