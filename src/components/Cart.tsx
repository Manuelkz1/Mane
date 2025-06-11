import React from 'react';
import { X, Minus, Plus, ShoppingBag, Tag } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { Link } from 'react-router-dom';

export default function Cart() {
  const cartStore = useCartStore();

  if (!cartStore.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => cartStore.toggleCart()} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-medium">Carrito de Compras</h2>
            <button
              onClick={() => cartStore.toggleCart()}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {cartStore.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  Tu carrito está vacío
                </h3>
                <p className="mt-1 text-gray-500">
                  Empieza a agregar productos a tu carrito
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-6">
                {cartStore.items.map((item) => (
                  <div key={`${item.product.id}-${item.selectedColor || ''}`} className="flex py-6">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="ml-4 flex flex-1 flex-col">
                      <div>
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <h3>{item.product.name}</h3>
                          {item.product.promotion?.type === 'discount' ? (
                            <div className="text-right">
                              <p className="text-sm text-gray-500 line-through">
                                ${(item.product.price * item.quantity).toFixed(2)}
                              </p>
                              <p className="text-red-600">
                                ${(item.product.promotion.total_price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <p className="ml-4">${(item.product.price * item.quantity).toFixed(2)}</p>
                          )}
                        </div>
                        {item.selectedColor && (
                          <p className="mt-1 text-sm text-gray-500">
                            Color: {item.selectedColor}
                          </p>
                        )}
                        {item.product.promotion && (
                          <div className="mt-1 flex items-center">
                            <Tag className="h-3 w-3 text-red-600 mr-1" />
                            <span className="text-xs text-red-600 font-medium">
                              {item.product.promotion.type === '2x1' && 'Compra 2, paga 1'}
                              {item.product.promotion.type === '3x1' && 'Compra 3, paga 1'}
                              {item.product.promotion.type === '3x2' && 'Compra 3, paga 2'}
                              {item.product.promotion.type === 'discount' && 'Precio promocional'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center mt-2">
                        <button
                          onClick={() => cartStore.updateQuantity(item.product.id, item.quantity - 1)}
                          className="rounded-full p-1 text-gray-600 hover:bg-gray-100"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="mx-2 text-gray-600">{item.quantity}</span>
                        <button
                          onClick={() => cartStore.updateQuantity(item.product.id, item.quantity + 1)}
                          className="rounded-full p-1 text-gray-600 hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => cartStore.removeItem(item.product.id)}
                          className="ml-4 text-indigo-600 hover:text-indigo-500"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 px-4 py-6">
                <div className="flex justify-between text-base font-medium text-gray-900">
                  <p>Total</p>
                  <p>${cartStore.total.toFixed(2)}</p>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  Envío calculado al finalizar la compra.
                </p>
                <div className="mt-6">
                  <Link
                    to="/checkout"
                    onClick={() => cartStore.toggleCart()}
                    className="flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
                  >
                    Finalizar Compra
                  </Link>
                </div>
                <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                  <button
                    type="button"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                    onClick={() => cartStore.toggleCart()}
                  >
                    Seguir Comprando
                    <span aria-hidden="true"> &rarr;</span>
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