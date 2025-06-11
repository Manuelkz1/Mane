import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Order } from '../types/index';
import { 
  Trash2, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  TruckIcon, 
  CheckCircle, 
  XCircle, 
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

const ORDER_STATUS_MAP = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Procesando', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Enviado', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Entregado', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
};

const PAYMENT_STATUS_MAP = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Fallido', color: 'bg-red-100 text-red-800' }
};

const OrderManager: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all orders with their items and product details
      const { data: ordersData, error: ordersError } = await supabase
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
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        setError('Error loading orders: ' + ordersError.message);
        toast.error('Error al cargar los pedidos');
        setLoading(false);
        return;
      }
      
      if (!ordersData || ordersData.length === 0) {
        console.log('No orders found');
        setOrders([]);
        setLoading(false);
        return;
      }
      
      // Process orders to add customer info
      const processedOrders = ordersData.map(order => {
        // Extract customer info from shipping_address or guest_info
        const customerName = order.shipping_address?.full_name || order.guest_info?.full_name || 'N/A';
        const customerEmail = order.guest_info?.email || 'N/A';
        const customerPhone = order.shipping_address?.phone || order.guest_info?.phone || 'N/A';
        
        return {
          ...order,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          total_amount: order.total
        };
      });
      
      setOrders(processedOrders);
      setSelectedOrders([]);
      setSelectAll(false);
      
    } catch (error: any) {
      console.error('General error loading orders:', error);
      setError('General error: ' + error.message);
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // First delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success('Pedido eliminado exitosamente');
      loadOrders();
      
      // If the deleted order was selected, close the modal
      if (selectedOrder?.id === orderId) {
        setShowOrderDetailModal(false);
        setSelectedOrder(null);
      }
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast.error('Error al eliminar el pedido');
    }
  };

  const handleDeleteSelectedOrders = async () => {
    setShowDeleteConfirmation(false);
    
    if (selectedOrders.length === 0) {
      toast.error('No hay pedidos seleccionados para eliminar');
      return;
    }

    try {
      setLoading(true);
      
      // First delete order items for all selected orders
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', selectedOrders);

      if (itemsError) throw itemsError;

      // Then delete the orders
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', selectedOrders);

      if (error) throw error;
      
      toast.success(`${selectedOrders.length} pedidos eliminados exitosamente`);
      
      // Reload orders and clear selections
      await loadOrders();
      
    } catch (error: any) {
      console.error('Error deleting orders:', error);
      toast.error('Error al eliminar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Estado del pedido actualizado');
      loadOrders();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado del pedido');
    }
  };
  
  const handleViewOrderDetails = async (order: Order) => {
    console.log('Viewing order details:', order.id);
    setSelectedOrder(order);
    setShowOrderDetailModal(true);
  };

  const toggleOrderExpand = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };

  const handleSelectOrder = (orderId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
      setSelectAll(false);
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    setSelectAll(isChecked);
    if (isChecked) {
      setSelectedOrders(orders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Pedidos
        </h2>
        
        <div className="flex space-x-4">
          <button
            onClick={loadOrders}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Actualizar
          </button>
          
          {selectedOrders.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Eliminar seleccionados ({selectedOrders.length})
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay pedidos disponibles.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-2 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr className={expandedOrderId === order.id ? 'bg-gray-50' : ''}>
                    <td className="px-2 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{order.id.substring(0, 8)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${order.total ? order.total.toFixed(2) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.customer_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.customer_email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ORDER_STATUS_MAP[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {ORDER_STATUS_MAP[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${PAYMENT_STATUS_MAP[order.payment_status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {PAYMENT_STATUS_MAP[order.payment_status]?.label || order.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewOrderDetails(order)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => toggleOrderExpand(order.id)}
                        className="text-gray-600 hover:text-gray-900 mr-3"
                      >
                        {expandedOrderId === order.id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                  {expandedOrderId === order.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="text-sm text-gray-900 mb-2">
                          <strong>Dirección de envío:</strong> {order.shipping_address?.address || 'No disponible'}, {order.shipping_address?.city || ''}, {order.shipping_address?.country || ''}
                        </div>
                        <div className="text-sm text-gray-900 mb-2">
                          <strong>Método de pago:</strong> {order.payment_method === 'cash_on_delivery' ? 'Pago contra entrega' : order.payment_method || 'No disponible'}
                        </div>
                        <div className="text-sm text-gray-900 mb-4">
                          <strong>Notas:</strong> {order.notes || 'Sin notas'}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'pending')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Pendiente
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Procesando
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                          >
                            <TruckIcon className="h-4 w-4 mr-1" />
                            Enviado
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Entregado
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancelado
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for delete confirmation */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmar eliminación
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              ¿Estás seguro de que quieres eliminar {selectedOrders.length} pedidos? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSelectedOrders}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order details modal */}
      {showOrderDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles del Pedido #{selectedOrder.id.substring(0, 8)}
              </h3>
              <button
                onClick={() => setShowOrderDetailModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="border-t border-gray-200 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Información del Cliente</h4>
                  <p className="text-sm text-gray-900">Nombre: {selectedOrder.customer_name || 'N/A'}</p>
                  <p className="text-sm text-gray-900">Email: {selectedOrder.customer_email || 'N/A'}</p>
                  <p className="text-sm text-gray-900">Teléfono: {selectedOrder.customer_phone || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Información del Pedido</h4>
                  <p className="text-sm text-gray-900">Fecha: {selectedOrder.created_at ? format(new Date(selectedOrder.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</p>
                  <p className="text-sm text-gray-900">Estado: <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ORDER_STATUS_MAP[selectedOrder.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {ORDER_STATUS_MAP[selectedOrder.status]?.label || selectedOrder.status}
                  </span></p>
                  <p className="text-sm text-gray-900">Pago: <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${PAYMENT_STATUS_MAP[selectedOrder.payment_status]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {PAYMENT_STATUS_MAP[selectedOrder.payment_status]?.label || selectedOrder.payment_status}
                  </span></p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 py-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Dirección de Envío</h4>
              <p className="text-sm text-gray-900">
                {selectedOrder.shipping_address?.address || 'No disponible'}, 
                {selectedOrder.shipping_address?.city || ''}, 
                {selectedOrder.shipping_address?.postal_code || ''}, 
                {selectedOrder.shipping_address?.country || ''}
              </p>
            </div>

            <div className="border-t border-gray-200 py-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Productos</h4>
              {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.order_items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {item.products?.images && item.products.images[0] && (
                                <div className="flex-shrink-0 h-10 w-10 mr-4">
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={item.products.images[0]}
                                    alt={item.products?.name || 'Producto'}
                                  />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.products?.name || 'Producto desconocido'}
                                </div>
                                {item.selected_color && (
                                  <div className="text-xs text-gray-500">
                                    Color: {item.selected_color}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantity || 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.price_at_time?.toFixed(2) || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          Total:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${selectedOrder.total?.toFixed(2) || 'N/A'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay productos disponibles para este pedido.</p>
              )}
            </div>

            <div className="border-t border-gray-200 py-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Notas</h4>
              <p className="text-sm text-gray-900">{selectedOrder.notes || 'Sin notas'}</p>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowOrderDetailModal(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManager;