import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useCartStore } from '../stores/cartStore';
import { format } from 'date-fns';
import { Heart, ArrowLeft, ShoppingCart, Truck, Star, Tag, Package, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MyFavoritesPage() {
  const { user } = useAuthStore();
  const favoritesStore = useFavoritesStore();
  const cartStore = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !favoritesStore.isInitialized) {
      favoritesStore.loadFavorites(user.id);
    }
  }, [user]);

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cartStore.addItem({ product, quantity: 1 });
    toast.success('Producto agregado al carrito');
  };

  const handleRemoveFromFavorites = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      await favoritesStore.removeFromFavorites(user.id, productId);
    }
  };

  const handleBuyNow = (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/product/${productId}`);
  };

  // Función para obtener los días de envío de un producto
  const getShippingDays = (product: any): string => {
    if (product.shipping_days) {
      return product.shipping_days;
    }
    
    if (product.description) {
      const match = product.description.match(/\[shipping_days:(\d+)\]/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return "3-5";
  };

  // Función para obtener precio promocional
  const getPromotionalPrice = (product: any) => {
    if (!product.promotion) return product.price;

    switch (product.promotion.type) {
      case 'discount':
        return product.promotion.total_price || product.price;
      default:
        return product.price;
    }
  };

  // Función para obtener etiqueta de promoción
  const getPromotionLabel = (product: any) => {
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

  // Renderizar estrellas (placeholder para futuras mejoras)
  const renderStars = (rating: number = 0) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
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

  if (favoritesStore.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </Link>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
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
          <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-red-500 to-pink-600">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-white" fill="currentColor" />
              <div>
                <h2 className="text-2xl font-bold text-white">Mis Favoritos</h2>
                <p className="text-red-100 text-sm">
                  {favoritesStore.favorites.length} producto{favoritesStore.favorites.length !== 1 ? 's' : ''} que te encanta{favoritesStore.favorites.length === 1 ? '' : 'n'}
                </p>
              </div>
            </div>
          </div>

          {favoritesStore.favorites.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Heart className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes favoritos aún</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Explora nuestros productos y marca como favoritos los que más te gusten. ¡Así podrás encontrarlos fácilmente!
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
              >
                <Heart className="h-5 w-5 mr-2" />
                Explorar productos
              </Link>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoritesStore.favorites.map((favorite) => {
                  const product = favorite.product;
                  if (!product) return null;

                  return (
                    <div key={favorite.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 border border-gray-100">
                      <div className="relative">
                        <Link to={`/product/${product.id}`}>
                          <img
                            src={product.images?.[0]}
                            alt={product.name}
                            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                            }}
                          />
                        </Link>
                        
                        {/* Botón de eliminar de favoritos */}
                        <button
                          onClick={(e) => handleRemoveFromFavorites(product.id, e)}
                          className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                          title="Quitar de favoritos"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>

                        {/* Badge de promoción */}
                        {product.promotion && getPromotionLabel(product) && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                            {getPromotionLabel(product)}
                          </div>
                        )}

                        {/* Fecha agregado a favoritos */}
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                          Agregado {format(new Date(favorite.created_at), 'dd/MM/yyyy')}
                        </div>
                      </div>

                      <div className="p-4">
                        <Link to={`/product/${product.id}`}>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-indigo-600 transition-colors">
                            {product.name}
                          </h3>
                        </Link>
                        
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                        
                        {/* Días de envío */}
                        <div className="flex items-center text-sm text-gray-600 mb-3">
                          <Truck className="h-4 w-4 mr-1 text-indigo-500" />
                          <span>Llega en {getShippingDays(product)} días hábiles</span>
                        </div>

                        {/* Precio */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex flex-col">
                            {product.promotion ? (
                              <>
                                <span className="text-sm text-gray-500 line-through">
                                  ${product.price.toFixed(2)}
                                </span>
                                <span className="text-lg font-bold text-red-600">
                                  ${getPromotionalPrice(product)?.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-lg font-bold text-gray-900">
                                ${product.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                          
                          {/* Rating placeholder */}
                          <div className="text-right">
                            {renderStars()}
                            <span className="text-xs text-gray-500 mt-1 block">
                              Sin reseñas
                            </span>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => handleAddToCart(product, e)}
                            className="flex-1 flex items-center justify-center px-3 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Agregar
                          </button>
                          <button
                            onClick={(e) => handleBuyNow(product.id, e)}
                            className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                          >
                            Comprar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
