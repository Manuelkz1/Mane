// orderStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Order {
  id?: string;
  user_id?: string;
  total: number;
  products: any[];
  shipping_address: any;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface OrderStore {
  orders: Order[];
  selectedOrders: string[];
  loading: boolean;
  error: string | null;
  
  // Getters
  getOrders: () => Order[];
  getOrderById: (id: string) => Order | undefined;
  getSelectedOrders: () => string[];
  
  // Actions
  fetchOrders: () => Promise<void>;
  deleteOrder: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteMultipleOrders: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  selectOrder: (id: string, selected: boolean) => void;
  selectAllOrders: (selected: boolean) => void;
  updateOrderStatus: (id: string, status: string) => Promise<{ success: boolean; error?: string }>;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  selectedOrders: [],
  loading: false,
  error: null,
  
  // Getters
  getOrders: () => get().orders,
  
  getOrderById: (id) => {
    return get().orders.find(order => order.id === id);
  },
  
  getSelectedOrders: () => get().selectedOrders,
  
  // Actions
  fetchOrders: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ orders: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching orders:', error);
      set({ error: error.message, loading: false });
    }
  },
  
  deleteOrder: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Actualizar el estado eliminando el pedido
      set(state => ({
        orders: state.orders.filter(o => o.id !== id),
        selectedOrders: state.selectedOrders.filter(orderId => orderId !== id),
        loading: false
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting order:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  deleteMultipleOrders: async (ids) => {
    set({ loading: true, error: null });
    
    try {
      // Supabase no tiene una operación directa para eliminar múltiples registros por ID
      // Así que hacemos múltiples llamadas en paralelo
      const deletePromises = ids.map(id => 
        supabase
          .from('orders')
          .delete()
          .eq('id', id)
      );
      
      const results = await Promise.all(deletePromises);
      
      // Verificar si hubo algún error
      const errors = results.filter(result => result.error).map(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Error al eliminar algunos pedidos: ${errors.map(e => e.message).join(', ')}`);
      }
      
      // Actualizar el estado eliminando los pedidos
      set(state => ({
        orders: state.orders.filter(o => !ids.includes(o.id)),
        selectedOrders: state.selectedOrders.filter(orderId => !ids.includes(orderId)),
        loading: false
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting multiple orders:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  selectOrder: (id, selected) => {
    set(state => {
      if (selected) {
        // Añadir a la selección si no está ya
        if (!state.selectedOrders.includes(id)) {
          return { selectedOrders: [...state.selectedOrders, id] };
        }
      } else {
        // Quitar de la selección
        return { selectedOrders: state.selectedOrders.filter(orderId => orderId !== id) };
      }
      return state; // No cambiar el estado si ya está en el estado deseado
    });
  },
  
  selectAllOrders: (selected) => {
    set(state => {
      if (selected) {
        // Seleccionar todos los pedidos
        const allOrderIds = state.orders.map(order => order.id);
        return { selectedOrders: allOrderIds };
      } else {
        // Deseleccionar todos
        return { selectedOrders: [] };
      }
    });
  },
  
  updateOrderStatus: async (id, status) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Actualizar el estado con el pedido modificado
      set(state => ({
        orders: state.orders.map(o => o.id === id ? data : o),
        loading: false
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error updating order status:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  }
}));
