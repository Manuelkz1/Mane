import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Promotion {
  id?: string;
  name: string;
  description?: string;
  type: '2x1' | '3x2' | '3x1' | 'discount';
  active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  product_ids?: string[];
  created_at?: string;
  updated_at?: string;
  buy_quantity: number;
  get_quantity: number;
  total_price?: number;
}

interface PromotionStore {
  promotions: Promotion[];
  loading: boolean;
  error: string | null;
  
  getPromotions: () => Promotion[];
  getActivePromotions: () => Promotion[];
  getPromotionById: (id: string) => Promotion | undefined;
  
  fetchPromotions: () => Promise<void>;
  createPromotion: (promotion: Promotion) => Promise<{ success: boolean; data?: Promotion; error?: string }>;
  updatePromotion: (id: string, promotion: Partial<Promotion>) => Promise<{ success: boolean; data?: Promotion; error?: string }>;
  deletePromotion: (id: string) => Promise<{ success: boolean; error?: string }>;
  togglePromotionStatus: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export const usePromotionStore = create<PromotionStore>((set, get) => ({
  promotions: [],
  loading: false,
  error: null,
  
  getPromotions: () => get().promotions,
  
  getActivePromotions: () => {
    const now = new Date().toISOString();
    return get().promotions.filter(promo => 
      promo.active && 
      (!promo.start_date || promo.start_date <= now) && 
      (!promo.end_date || promo.end_date >= now)
    );
  },
  
  getPromotionById: (id) => {
    return get().promotions.find(promo => promo.id === id);
  },
  
  fetchPromotions: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select(`
          *,
          promotion_products (
            product_id
          )
        `)
        .order('created_at', { ascending: false });
      
      if (promotionsError) throw promotionsError;
      
      const formattedPromotions = promotionsData?.map(promotion => ({
        ...promotion,
        product_ids: promotion.promotion_products?.map(pp => pp.product_id) || []
      })) || [];

      set({ promotions: formattedPromotions, loading: false });
    } catch (error: any) {
      console.error('Error fetching promotions:', error);
      set({ error: error.message, loading: false });
    }
  },
  
  createPromotion: async (promotion) => {
    set({ loading: true, error: null });
    
    try {
      // Create the promotion record without product_ids
      const { name, description, type, active, start_date, end_date, buy_quantity, get_quantity, total_price } = promotion;
      const { data: newPromotion, error: promotionError } = await supabase
        .from('promotions')
        .insert([{
          name,
          description,
          type,
          active,
          start_date: start_date || null,
          end_date: end_date || null,
          buy_quantity,
          get_quantity,
          total_price,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (promotionError) throw promotionError;
      
      // If there are product IDs, create the promotion-product relationships
      if (promotion.product_ids?.length && newPromotion) {
        const promotionProducts = promotion.product_ids.map(productId => ({
          promotion_id: newPromotion.id,
          product_id: productId
        }));
        
        const { error: linkError } = await supabase
          .from('promotion_products')
          .insert(promotionProducts);
        
        if (linkError) throw linkError;
      }
      
      // Refresh the promotions list
      await get().fetchPromotions();
      
      set({ loading: false });
      return { success: true, data: newPromotion };
    } catch (error: any) {
      console.error('Error creating promotion:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  updatePromotion: async (id, promotion) => {
    set({ loading: true, error: null });
    
    try {
      // First, update the promotion details without product_ids
      const { product_ids, ...promotionData } = promotion;
      const { data: updatedPromotion, error: updateError } = await supabase
        .from('promotions')
        .update({
          ...promotionData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // If product_ids is provided, update the relationships
      if (product_ids !== undefined) {
        // Delete existing product links
        const { error: deleteError } = await supabase
          .from('promotion_products')
          .delete()
          .eq('promotion_id', id);
        
        if (deleteError) throw deleteError;
        
        // Create new product links if there are any product_ids
        if (product_ids.length > 0) {
          const promotionProducts = product_ids.map(productId => ({
            promotion_id: id,
            product_id: productId
          }));
          
          const { error: insertError } = await supabase
            .from('promotion_products')
            .insert(promotionProducts);
          
          if (insertError) throw insertError;
        }
      }
      
      // Refresh promotions to get updated data
      await get().fetchPromotions();
      
      set({ loading: false });
      return { success: true, data: updatedPromotion };
    } catch (error: any) {
      console.error('Error updating promotion:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  deletePromotion: async (id) => {
    set({ loading: true, error: null });
    
    try {
      // Delete promotion products first (foreign key constraint will handle this automatically)
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      set(state => ({
        promotions: state.promotions.filter(p => p.id !== id),
        loading: false
      }));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  togglePromotionStatus: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const promotion = get().promotions.find(p => p.id === id);
      if (!promotion) throw new Error('Promotion not found');
      
      const { data, error } = await supabase
        .from('promotions')
        .update({ 
          active: !promotion.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      set(state => ({
        promotions: state.promotions.map(p => p.id === id ? data : p),
        loading: false
      }));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error toggling promotion status:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  }
}));