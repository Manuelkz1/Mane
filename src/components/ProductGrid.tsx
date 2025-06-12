import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Search, Filter, X, Tag, Star, Truck, Heart } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useAuthStore } from '../stores/authStore';
import type { Product } from '../types/index';
import { useDebounce } from 'use-debounce';

interface ProductWithRating extends Product {
  averageRating?: number;
  reviewCount?: number;
}

export function ProductGrid() {
  const cartStore = useCartStore();
  const favoritesStore = useFavoritesStore();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<ProductWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm] = useDebounce(searchInput, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'newest'>('newest');

  useEffect(() => {
    loadProducts();
  }, [searchTerm, selectedCategory, sortBy]);

  useEffect(() => {
    if (user && !favoritesStore.isInitialized) {
      favoritesStore.loadFavorites(user.id);
    }
  }, [user]);

  useEffect(() => {
    // Solo verificar descuentos cuando se inicializan los favoritos por primera vez
    if (user && favoritesStore.isInitialized && favoritesStore.favorites.length > 0) {
      favoritesStore.checkForDiscounts();
    }
  }, [favoritesStore.isInitialized]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('products')
        .select('*');

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!data) {
        throw new Error('No se recibieron datos del servidor');
      }

      // Filter products based on allowed payment methods
      const filteredProducts = data.filter(product => {
        const methods = product.allowed_payment_methods || {
          cash_on_delivery: true,
          card: true
        };
        return methods.cash_on_delivery || methods.card;
      });

      // Crear una copia de los productos filtrados para trabajar con ellos
      let productsWithData = [...filteredProducts];
      const productIds = filteredProducts.map(p => p.id);
      
      // Load promotions for products
      try {
        const { data: promotionProducts, error: promotionError } = await supabase
          .from('promotion_products')
          .select(`
            product_id,
            promotion:promotions(*)
          `)
          .in('product_id', productIds)
          .filter('promotion.active', 'eq', true)
          .filter('promotion.start_date', 'lte', new Date().toISOString())
          .filter('promotion.end_date', 'gte', new Date().toISOString());
          
        if (!promotionError && promotionProducts) {
          // Add promotion data to products
          productsWithData = productsWithData.map(product => {
            const productPromotion = promotionProducts.find(pp => pp.product_id === product.id);
            if (productPromotion && productPromotion.promotion) {
              return {
                ...product,
                promotion: productPromotion.promotion
              };
            }
            return product;
          });
        }
      } catch (error) {
        console.error('Error loading promotions:', error);
      }

      // Cargar las calificaciones para cada producto
      try {
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('product_id, rating')
          .eq('approved', true)
          .in('product_id', productIds);

        if (!reviewsError && reviewsData) {
          // Agrupar reseñas por producto y calcular promedio
          const reviewsByProduct: Record<string, { sum: number; count: number }> = {};
          
          reviewsData.forEach(review => {
            if (!reviewsByProduct[review.product_id]) {
              reviewsByProduct[review.product_id] = { sum: 0, count: 0 };
            }
            reviewsByProduct[review.product_id].sum += review.rating;
            reviewsByProduct[review.product_id].count += 1;
          });
          
          // Añadir calificaciones a los productos
          productsWithData = productsWithData.map(product => {
            const productReviews = reviewsByProduct[product.id];
            if (productReviews) {
              return {
                ...product,
                averageRating: productReviews.sum / productReviews.count,
                reviewCount: productReviews.count
              };
            }
            return {
              ...product,
              averageRating: 0,
              reviewCount: 0
            };
          });
        }
      } catch (error) {
        console.error('Error loading reviews:', error);
      }

      // Actualizar el estado con todos los datos cargados
      setProducts(productsWithData);
      
      const uniqueCategories = Array.from(new Set(data.map(p => p.category).filter(Boolean)));
      setCategories(uniqueCategories);
    } catch (error: any) {
      console.error('Error loading products:', error);
      setError('Error al cargar los productos');
      toast.error('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product, event: React.MouseEvent) => {
    event.preventDefault();
    cartStore.addItem(product, 1);
    toast.success('Producto agregado al carrito');
  };

  const handleBuyNow = (product: Product, event: React.MouseEvent) => {
    event.preventDefault();
    window.location.href = `/product/${product.id}`;
  };

  // Función para navegar a las reseñas del producto
  const handleViewReviews = (productId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    window.location.href = `/product/${productId}#reviews`;
  };

  // Función para manejar favoritos
  const handleToggleFavorite = async (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Debes iniciar sesión para agregar favoritos');
      return;
    }

    const isFavorite = favoritesStore.isFavorite(product.id);
    
    if (isFavorite) {
      await favoritesStore.removeFromFavorites(user.id, product.id);
    } else {
      await favoritesStore.addToFavorites(user.id, product);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSelectedCategory('');
    setSortBy('newest');
  };

  const getPromotionalPrice = (product: Product) => {
    if (!product.promotion) return null;

    if (product.promotion.type === 'discount' && product.promotion.total_price) {
      return product.promotion.total_price;
    }

    return null;
  };

  const getPromotionLabel = (product: Product) => {
    if (!product.promotion) return null;

    switch (product.promotion.type) {
      case '2x1':
        return 'Lleva 2, paga 1';
      case '3x1':
        return 'Lleva 3, paga 1';
      case '3x2':
        return 'Lleva 3, paga 2';
      case 'discount':
        if (product.promotion.total_price) {
          const discount = Math.round((1 - (product.promotion.total_price / product.price)) * 100);
          return `${discount}% OFF`;
        }
        return null;
      default:
        return null;
    }
  };

  // Función para obtener los días de envío de un producto
  const getShippingDays = (product: Product): string => {
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

  // Renderizar estrellas basadas en la calificación
  const renderStars = (rating: number, productId: string) => {
    return (
      <div 
        className="flex cursor-pointer" 
        onClick={(e) => handleViewReviews(productId, e)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 sm:h-4 sm:w-4 ${
              star <= Math.round(rating)
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}
            fill="currentColor"
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 p-3 sm:p-0">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-3 sm:p-4 rounded-lg shadow animate-pulse">
            <div className="h-32 sm:h-48 bg-gray-200 rounded-md mb-3 sm:mb-4"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 p-4 rounded-lg inline-block">
          <p className="text-red-800 mb-4">{error}</p>
          <button
            onClick={loadProducts}
            className="bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filtros - Responsivos */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6 px-3 sm:px-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar productos..."
            className="pl-9 sm:pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 sm:px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
        >
          <option value="">Todas las categorías</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 sm:px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
        >
          <option value="newest">Más recientes</option>
          <option value="price_asc">Precio: Menor a mayor</option>
          <option value="price_desc">Precio: Mayor a menor</option>
        </select>
        {(searchInput || selectedCategory || sortBy !== 'newest') && (
          <button
            onClick={clearFilters}
            className="px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center text-sm sm:text-base"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
            <span className="hidden sm:inline">Limpiar filtros</span>
            <span className="sm:hidden">Limpiar</span>
          </button>
        )}
      </div>

      {/* Grid de productos - Optimizado para móvil con CSS específico */}
      <div 
        className="grid gap-3 sm:gap-6 px-3 sm:px-0"
        style={{
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          '@media (min-width: 640px)': {
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
          },
          '@media (min-width: 1024px)': {
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
          }
        }}
      >
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg group"
            style={{
              width: '100%',
              maxWidth: '48%',
              '@media (min-width: 640px)': {
                maxWidth: '100%'
              }
            }}
          >
            <div className="relative">
              <img
                src={product.images?.[0]}
                alt={product.name}
                className="w-full object-cover"
                style={{
                  height: '128px',
                  '@media (min-width: 640px)': {
                    height: '192px'
                  }
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                }}
              />
              
              {/* Badge de colores disponibles */}
              {product.available_colors && product.available_colors.length > 0 && (
                <div 
                  className="absolute bg-white rounded-full text-xs font-medium px-2 py-1"
                  style={{
                    top: '4px',
                    right: '4px',
                    '@media (min-width: 640px)': {
                      top: '8px',
                      right: '8px'
                    }
                  }}
                >
                  {product.available_colors.length} colores
                </div>
              )}

              {/* Badge de promoción */}
              {product.promotion && getPromotionLabel(product) && (
                <div 
                  className="absolute bg-red-500 text-white rounded-md text-xs font-bold px-2 py-1"
                  style={{
                    top: '4px',
                    left: '4px',
                    '@media (min-width: 640px)': {
                      top: '8px',
                      left: '8px'
                    }
                  }}
                >
                  {getPromotionLabel(product)}
                </div>
              )}

              {/* Botón de favoritos - Posicionado mejor en móvil */}
              <button
                onClick={(e) => handleToggleFavorite(product, e)}
                className={`absolute rounded-full transition-colors ${
                  favoritesStore.isFavorite(product.id)
                    ? 'text-red-500 bg-red-50'
                    : 'text-gray-400 bg-white/80 hover:text-red-500 hover:bg-red-50'
                }`}
                style={{
                  bottom: '8px',
                  right: '8px',
                  padding: '6px',
                  '@media (min-width: 640px)': {
                    padding: '8px'
                  }
                }}
                title={favoritesStore.isFavorite(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                <Heart 
                  className={`transition-transform ${
                    favoritesStore.isFavorite(product.id) ? 'scale-110' : ''
                  }`}
                  style={{
                    width: '12px',
                    height: '12px',
                    '@media (min-width: 640px)': {
                      width: '16px',
                      height: '16px'
                    }
                  }}
                  fill={favoritesStore.isFavorite(product.id) ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <div 
              className="p-2 sm:p-4"
              style={{
                minHeight: '120px',
                '@media (min-width: 640px)': {
                  minHeight: 'auto'
                }
              }}
            >
              {/* Nombre del producto - Más compacto en móvil */}
              <h3 
                className="font-semibold text-gray-900 mb-1 sm:mb-2 leading-tight"
                style={{
                  fontSize: '14px',
                  lineHeight: '1.2',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  '@media (min-width: 640px)': {
                    fontSize: '18px',
                    lineHeight: '1.4'
                  }
                }}
              >
                {product.name}
              </h3>
              
              {/* Sistema de calificación con estrellas - Más pequeño en móvil */}
              <div className="flex items-center mb-1 sm:mb-2">
                {renderStars(product.averageRating || 0, product.id)}
                <span 
                  className="ml-1 text-gray-500 cursor-pointer"
                  style={{
                    fontSize: '10px',
                    '@media (min-width: 640px)': {
                      fontSize: '12px'
                    }
                  }}
                  onClick={(e) => handleViewReviews(product.id, e)}
                >
                  ({product.reviewCount || 0})
                </span>
              </div>
              
              {/* Descripción - Solo visible en pantallas más grandes */}
              <p 
                className="hidden sm:block text-gray-600 mb-4"
                style={{
                  fontSize: '14px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {product.description}
              </p>
              
              {/* Días de envío - Más compacto en móvil */}
              <div 
                className="flex items-center text-gray-600 mb-2"
                style={{
                  fontSize: '10px',
                  '@media (min-width: 640px)': {
                    fontSize: '14px'
                  }
                }}
              >
                <Truck 
                  className="mr-1 text-indigo-500"
                  style={{
                    width: '12px',
                    height: '12px',
                    '@media (min-width: 640px)': {
                      width: '16px',
                      height: '16px'
                    }
                  }}
                />
                <span className="truncate">Llega en {getShippingDays(product)} días</span>
              </div>
              
              {/* Precio y botones - Layout optimizado para móvil */}
              <div className="space-y-2">
                {/* Precio */}
                <div className="flex flex-col">
                  {product.promotion ? (
                    <>
                      <span 
                        className="text-gray-500 line-through"
                        style={{
                          fontSize: '10px',
                          '@media (min-width: 640px)': {
                            fontSize: '14px'
                          }
                        }}
                      >
                        ${product.price.toFixed(2)}
                      </span>
                      <span 
                        className="font-bold text-red-600"
                        style={{
                          fontSize: '14px',
                          '@media (min-width: 640px)': {
                            fontSize: '18px'
                          }
                        }}
                      >
                        ${getPromotionalPrice(product)?.toFixed(2) || product.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span 
                      className="font-bold text-gray-900"
                      style={{
                        fontSize: '14px',
                        '@media (min-width: 640px)': {
                          fontSize: '18px'
                        }
                      }}
                    >
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Botones - Stack vertical en móvil, horizontal en desktop */}
                <div 
                  className="flex gap-1 sm:gap-2"
                  style={{
                    flexDirection: 'column',
                    '@media (min-width: 640px)': {
                      flexDirection: 'row'
                    }
                  }}
                >
                  <button
                    onClick={(e) => handleAddToCart(product, e)}
                    className="flex-1 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors font-medium"
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      '@media (min-width: 640px)': {
                        padding: '8px 16px',
                        fontSize: '14px'
                      }
                    }}
                    title="Agregar al carrito"
                  >
                    <ShoppingCart 
                      className="mr-1"
                      style={{
                        width: '12px',
                        height: '12px',
                        '@media (min-width: 640px)': {
                          width: '16px',
                          height: '16px'
                        }
                      }}
                    />
                    <span className="hidden sm:inline">Agregar</span>
                    <span className="sm:hidden">+</span>
                  </button>
                  <button
                    onClick={(e) => handleBuyNow(product, e)}
                    className="flex-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      '@media (min-width: 640px)': {
                        padding: '8px 16px',
                        fontSize: '14px'
                      }
                    }}
                  >
                    Comprar
                  </button>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}