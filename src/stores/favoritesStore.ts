import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { Product } from '../types/index';
import { toast } from 'react-hot-toast';

interface FavoriteItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

interface FavoritesStore {
  favorites: FavoriteItem[];
  loading: boolean;
  isInitialized: boolean;
  
  // Actions
  loadFavorites: (userId: string) => Promise<void>;
  addToFavorites: (userId: string, product: Product) => Promise<void>;
  removeFromFavorites: (userId: string, productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  getFavoriteCount: () => number;
  clearFavorites: () => void;
  checkForDiscounts: () => void;
  syncWithDatabase: (userId: string) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      loading: false,
      isInitialized: false,

      loadFavorites: async (userId: string) => {
        if (!userId) return;
        
        // Evitar múltiples llamadas simultáneas
        const state = get();
        if (state.loading || state.isInitialized) return;
        
        try {
          set({ loading: true });
          
          const { data, error } = await supabase
            .from('favorites')
            .select(`
              *,
              products (
                id,
                name,
                images,
                price,
                description,
                promotion,
                shipping_days,
                stock,
                category
              )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          // Si la tabla no existe, inicializar vacío y programar reintento
          if (error && (error.code === '42P01' || error.message?.includes('relation "favorites" does not exist'))) {
            set({ 
              favorites: [],
              loading: false,
              isInitialized: true 
            });
            
            // Intentar sincronizar más tarde cuando la tabla esté disponible
            setTimeout(() => {
              get().syncWithDatabase(userId);
            }, 30000); // Reintento en 30 segundos
            
            return;
          }

          if (error) throw error;

          const favoritesWithProducts = data?.map(fav => ({
            ...fav,
            product: fav.products
          })) || [];

          set({ 
            favorites: favoritesWithProducts,
            loading: false,
            isInitialized: true 
          });
        } catch (error) {
          console.log('Favoritos system starting in local mode');
          set({ 
            favorites: [],
            loading: false, 
            isInitialized: true 
          });
          
          // Programar reintento de sincronización
          setTimeout(() => {
            get().syncWithDatabase(userId);
          }, 60000); // Reintento en 1 minuto
        }
      },

      addToFavorites: async (userId: string, product: Product) => {
        if (!userId) {
          toast.error('Debes iniciar sesión para agregar favoritos');
          return;
        }

        // Verificar si ya existe localmente
        const state = get();
        const alreadyExists = state.favorites.some(fav => fav.product_id === product.id);
        
        if (alreadyExists) {
          toast.info('Este producto ya está en tus favoritos');
          return;
        }

        // Crear favorito local inmediatamente
        const localFavorite = {
          id: `local-${Date.now()}`,
          user_id: userId,
          product_id: product.id,
          created_at: new Date().toISOString(),
          product: product
        };

        // Agregar a la lista local
        set(state => ({
          favorites: [localFavorite, ...state.favorites]
        }));

        toast.success('Producto agregado a favoritos ❤️');

        // Intentar sincronizar con Supabase en segundo plano (silenciosamente)
        try {
          const { data, error } = await supabase
            .from('favorites')
            .insert({
              user_id: userId,
              product_id: product.id
            })
            .select()
            .single();

          if (!error && data) {
            // Reemplazar favorito local con el de la base de datos
            set(state => ({
              favorites: state.favorites.map(fav => 
                fav.id === localFavorite.id 
                  ? { ...data, product: product }
                  : fav
              )
            }));
          }
        } catch (error) {
          // Silencioso - el favorito ya está guardado localmente
          console.log('Favoritos will sync when database is ready');
        }
      },

      removeFromFavorites: async (userId: string, productId: string) => {
        // Remover localmente inmediatamente
        set(state => ({
          favorites: state.favorites.filter(fav => fav.product_id !== productId)
        }));

        toast.success('Producto eliminado de favoritos');

        // Intentar sincronizar con Supabase en segundo plano (silenciosamente)
        try {
          await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);
        } catch (error) {
          // Silencioso - el favorito ya está removido localmente
          console.log('Favoritos will sync when database is ready');
        }
      },

      isFavorite: (productId: string) => {
        const { favorites } = get();
        return favorites.some(fav => fav.product_id === productId);
      },

      getFavoriteCount: () => {
        const { favorites } = get();
        return favorites.length;
      },

      clearFavorites: () => {
        set({ favorites: [], isInitialized: false });
      },

      checkForDiscounts: () => {
        const { favorites, isInitialized } = get();
        
        // Solo verificar si hay favoritos inicializados
        if (!isInitialized || favorites.length === 0) return;
        
        const discountedFavorites = favorites.filter(fav => 
          fav.product?.promotion && fav.product.promotion.active
        );

        if (discountedFavorites.length > 0) {
          toast.success(
            `¡${discountedFavorites.length} de tus favoritos tiene${discountedFavorites.length > 1 ? 'n' : ''} descuento! 🎉`,
            { duration: 5000 }
          );
        }
      },

      syncWithDatabase: async (userId: string) => {
        if (!userId) return;
        
        try {
          // Intentar cargar favoritos de la base de datos
          const { data, error } = await supabase
            .from('favorites')
            .select(`
              *,
              products (
                id,
                name,
                images,
                price,
                description,
                promotion,
                shipping_days,
                stock,
                category
              )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            const favoritesWithProducts = data.map(fav => ({
              ...fav,
              product: fav.products
            }));

            // Actualizar con datos de la base de datos
            set({ 
              favorites: favoritesWithProducts,
              isInitialized: true 
            });
            
            console.log('Favoritos sincronizados con la base de datos');
          }
        } catch (error) {
          // Si falla la sincronización, mantener favoritos locales
          console.log('Manteniendo favoritos locales:', error);
        }
      }
    }),
    {
      name: 'bamkz-favorites-store',
      partialize: (state) => ({
        favorites: state.favorites,
        isInitialized: state.isInitialized
      }),
    }
  )
);
