import React, { useState } from 'react';
import { X, Minus, Plus, ShoppingBag, Tag, Trash2, ShoppingCart, Sparkles, ArrowRight } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { Link } from 'react-router-dom';

export default function Cart() {
  const cartStore = useCartStore();
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  if (!cartStore.isOpen) return null;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = 'https://via.placeholder.com/96x96/f3f4f6/9ca3af?text=Sin+imagen';
  };

  const handleRemoveItem = async (productId: string, selectedColor?: string) => {
    const itemKey = `${productId}-${selectedColor || ''}`;
    setRemovingItems(prev => new Set([...prev, itemKey]));
    
    // Pequeña animación antes de remover
    setTimeout(() => {
      cartStore.removeItem(productId);
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }, 300);
  };

  const totalItems = cartStore.items.reduce((sum, item) => sum + item.quantity, 0);
  const hasPromotions = cartStore.items.some(item => item.product.promotion);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop mejorado */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={() => cartStore.toggleCart()} 
      />
      
      {/* Panel del carrito mejorado */}
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl transform transition-transform duration-300">
        <div className="flex h-full flex-col">
          
          {/* Header mejorado */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 rounded-full p-2">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Mi Carrito</h2>
                  {cartStore.items.length > 0 && (
                    <p className="text-indigo-100 text-sm">
                      {totalItems} producto{totalItems !== 1 ? 's' : ''} • ${cartStore.total.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => cartStore.toggleCart()}
                className="text-white hover:text-indigo-200 transition-colors duration-200 bg-white bg-opacity-20 rounded-full p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Progress bar para mostrar proximidad a descuentos */}
            {hasPromotions && (
              <div className="mt-3 bg-white bg-opacity-20 rounded-full p-1">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                  <span className="text-sm text-yellow-100">¡Tienes promociones activas!</span>
                </div>
              </div>
            )}
          </div>

          {/* Contenido del carrito */}
          {cartStore.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="h-12 w-12 text-gray-300" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Tu carrito está vacío
                </h3>
                <p className="text-gray-500 mb-6">
                  Descubre nuestros increíbles productos y empieza a llenar tu carrito
                </p>
                <button
                  onClick={() => cartStore.toggleCart()}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center space-x-2 mx-auto"
                >
                  <span>Explorar Productos</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Lista de productos mejorada */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-4 space-y-4">
                  {cartStore.items.map((item) => {
                    const itemKey = `${item.product.id}-${item.selectedColor || ''}`;
                    const isRemoving = removingItems.has(itemKey);
                    
                    return (
                      <div 
                        key={itemKey} 
                        className={`bg-white border border-gray-200 rounded-2xl p-4 transition-all duration-300 ${
                          isRemoving ? 'opacity-50 scale-95' : 'hover:shadow-lg hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex space-x-4">
                          {/* Imagen del producto mejorada */}
                          <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden">
                              <img
                                src={item.product.images?.[0] || 'https://via.placeholder.com/80x80/f3f4f6/9ca3af?text=Sin+imagen'}
                                alt={item.product.name}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                                onError={handleImageError}
                              />
                            </div>
                            {/* Badge de cantidad */}
                            {item.quantity > 1 && (
                              <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                {item.quantity}
                              </div>
                            )}
                          </div>

                          {/* Información del producto */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">
                                  {item.product.name}
                                </h3>
                                
                                {/* Color seleccionado */}
                                {item.selectedColor && (
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-xs text-gray-500">Color:</span>
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                      {item.selectedColor}
                                    </span>
                                  </div>
                                )}

                                {/* Promoción activa */}
                                {item.product.promotion && (
                                  <div className="flex items-center space-x-1 mb-2">
                                    <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-full flex items-center space-x-1">
                                      <Sparkles className="h-3 w-3" />
                                      <span className="text-xs font-medium">
                                        {item.product.promotion.type === '2x1' && '2x1'}
                                        {item.product.promotion.type === '3x1' && '3x1'}
                                        {item.product.promotion.type === '3x2' && '3x2'}
                                        {item.product.promotion.type === 'discount' && 'Oferta'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Precio */}
                              <div className="text-right ml-2">
                                {item.product.promotion?.type === 'discount' ? (
                                  <div>
                                    <p className="text-xs text-gray-400 line-through">
                                      ${(item.product.price * item.quantity).toFixed(2)}
                                    </p>
                                    <p className="text-sm font-bold text-red-600">
                                      ${(item.product.promotion.total_price * item.quantity).toFixed(2)}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm font-bold text-gray-900">
                                    ${(item.product.price * item.quantity).toFixed(2)}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500">
                                  ${(item.product.promotion?.total_price || item.product.price).toFixed(2)} c/u
                                </p>
                              </div>
                            </div>

                            {/* Controles de cantidad mejorados */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center bg-gray-50 rounded-lg p-1">
                                <button
                                  onClick={() => cartStore.updateQuantity(item.product.id, item.quantity - 1)}
                                  className="w-8 h-8 rounded-lg bg-white shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors duration-200"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="mx-3 font-medium text-gray-900 min-w-[2rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => cartStore.updateQuantity(item.product.id, item.quantity + 1)}
                                  className="w-8 h-8 rounded-lg bg-white shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors duration-200"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                              
                              {/* Botón eliminar mejorado */}
                              <button
                                onClick={() => handleRemoveItem(item.product.id, item.selectedColor)}
                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all duration-200 group"
                                disabled={isRemoving}
                              >
                                <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer mejorado */}
              <div className="border-t border-gray-200 bg-gray-50">
                {/* Resumen de total */}
                <div className="px-6 py-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Subtotal ({totalItems} productos)</span>
                      <span className="text-sm font-medium text-gray-900">${cartStore.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-600">Envío</span>
                      <span className="text-sm text-green-600 font-medium">Calculado al finalizar</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Total</span>
                        <span className="text-xl font-bold text-indigo-600">${cartStore.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="px-6 pb-6 space-y-3">
                  <Link
                    to="/checkout"
                    onClick={() => cartStore.toggleCart()}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <span>Finalizar Compra</span>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  
                  <button
                    onClick={() => cartStore.toggleCart()}
                    className="w-full text-indigo-600 hover:text-indigo-700 font-medium py-2 flex items-center justify-center space-x-2 transition-colors duration-200"
                  >
                    <span>Seguir Comprando</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { Cart };