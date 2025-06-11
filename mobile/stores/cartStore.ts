import { create } from 'zustand';
import { CartItem, Product } from '../types/index';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity?: number, selectedColor?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  total: number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  total: 0,

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  addItem: (product: Product, quantity = 1, selectedColor?: string) => {
    const items = [...get().items];
    const existingItem = items.find(item => 
      item.product.id === product.id && 
      item.selectedColor === selectedColor
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      items.push({ product, quantity, selectedColor });
    }

    const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    set({ items, total });
  },

  removeItem: (productId: string) => {
    const items = get().items.filter(item => item.product.id !== productId);
    const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    set({ items, total });
  },

  updateQuantity: (productId: string, quantity: number) => {
    const items = get().items.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: Math.max(0, quantity) }
        : item
    ).filter(item => item.quantity > 0);

    const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    set({ items, total });
  },

  clearCart: () => {
    set({ items: [], total: 0 });
  },
}));