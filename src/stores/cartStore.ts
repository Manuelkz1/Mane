import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types/index';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  total: number;
  
  addItem: (product: Product, quantity: number, selectedColor?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  calculateTotal: () => void;
  rehydrate: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      total: 0,

      addItem: (product, quantity = 1, selectedColor) => {
        const items = [...get().items];
        const existingItemIndex = items.findIndex(
          item => item.product.id === product.id && item.selectedColor === selectedColor
        );

        if (existingItemIndex >= 0) {
          items[existingItemIndex].quantity += quantity;
        } else {
          items.push({ product, quantity, selectedColor });
        }

        set({ items });
        get().calculateTotal();
      },

      removeItem: (productId) => {
        const items = get().items.filter(item => item.product.id !== productId);
        set({ items });
        get().calculateTotal();
      },

      updateQuantity: (productId, quantity) => {
        const items = get().items.map(item => 
          item.product.id === productId 
            ? { ...item, quantity: Math.max(0, quantity) }
            : item
        ).filter(item => item.quantity > 0);

        set({ items });
        get().calculateTotal();
      },

      clearCart: () => {
        set({ items: [], total: 0 });
      },

      toggleCart: () => {
        set(state => ({ isOpen: !state.isOpen }));
      },

      calculateTotal: () => {
        const items = get().items;
        let total = 0;

        items.forEach(item => {
          const { product, quantity } = item;
          
          if (product.promotion) {
            if (product.promotion.type === 'discount' && product.promotion.total_price) {
              // Use fixed promotional price
              total += product.promotion.total_price * quantity;
            } else if (product.promotion.type === '2x1' && quantity >= 2) {
              // For 2x1, pay for half of the items (rounded up)
              const paidItems = Math.ceil(quantity / 2);
              total += paidItems * product.price;
            } else if (product.promotion.type === '3x2' && quantity >= 3) {
              // For 3x2, calculate sets and remaining items
              const sets = Math.floor(quantity / 3);
              const remainder = quantity % 3;
              const paidItems = (sets * 2) + remainder;
              total += paidItems * product.price;
            } else if (product.promotion.type === '3x1' && quantity >= 3) {
              // For 3x1, pay for one item per set plus remaining items
              const sets = Math.floor(quantity / 3);
              const remainder = quantity % 3;
              const paidItems = sets + remainder;
              total += paidItems * product.price;
            } else {
              // If no promotion conditions are met, use regular price
              total += product.price * quantity;
            }
          } else {
            total += product.price * quantity;
          }
        });

        set({ total });
      },

      rehydrate: () => {
        get().calculateTotal();
      }
    }),
    {
      name: 'cart-storage',
      getStorage: () => localStorage,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.calculateTotal();
        }
      }
    }
  )
);