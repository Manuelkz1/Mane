import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, FileText, Share2, Tag, Clock } from 'lucide-react';
import type { Product } from '../types/index';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { ProductReviews } from './ProductReviews';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cartStore = useCartStore();
  const { user } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      if (!id) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setProduct(data);
      if (data?.images?.length > 0) {
        setSelectedImage(data.images[0]);
      }
      if (data?.available_colors?.length > 0) {
        const firstColor = data.available_colors[0];
        setSelectedColor(firstColor);
        
        if (data.color_images && data.color_images.length > 0) {
          const colorImage = data.color_images.find(ci => ci.color === firstColor);
          if (colorImage && colorImage.image) {
            setSelectedImage(colorImage.image);
          }
        }
      }

      const { data: promotionData, error: promotionError } = await supabase
        .from('promotion_products')
        .select(`
          promotion:promotions(
            id, name, type, buy_quantity, get_quantity, total_price, active, 
            start_date, end_date, created_at, updated_at
          )
        `)
        .eq('product_id', id)
        .filter('promotion.active', 'eq', true)
        .filter('promotion.start_date', 'lte', new Date().toISOString())
        .filter('promotion.end_date', 'gte', new Date().toISOString())
        .maybeSingle();

      if (!promotionError && promotionData?.promotion) {
        setProduct(prev => prev ? { ...prev, promotion: promotionData.promotion } : null);
      }

      const { data: related, error: relatedError } = await supabase
        .from('products')
        .select('*')
        .neq('id', id)
        .eq('category', data.category)
        .limit(4);

      if (!relatedError && related) {
        setRelatedProducts(related);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Error al cargar el producto');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado al portapapeles');
    } catch (err) {
      toast.error('Error al copiar el enlace');
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product) return;
    
    if (product.available_colors?.length && !selectedColor) {
      toast.error('Por favor selecciona un color');
      return;
    }

    // Add promotion data to product if available
    const productWithPromotion = product.promotion 
      ? { ...product, promotion: product.promotion } 
      : product;

    cartStore.addItem(productWithPromotion, quantity, selectedColor);

    toast.success(
      <div className="flex items-center">
        <div>
          <p className="font-medium">¡Producto agregado al carrito!</p>
          <p className="text-sm">
            {quantity} {quantity > 1 ? 'unidades' : 'unidad'} de {product.name}
            {selectedColor && ` (${selectedColor})`}
          </p>
        </div>
      </div>,
      {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#4F46E5',
          color: '#ffffff',
          padding: '1rem',
          borderRadius: '0.5rem',
        },
      }
    );

    cartStore.toggleCart();
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product) return;

    if (product.available_colors?.length && !selectedColor) {
      toast.error('Por favor selecciona un color');
      return;
    }

    // Add promotion data to product if available
    const productWithPromotion = product.promotion 
      ? { ...product, promotion: product.promotion } 
      : product;

    cartStore.clearCart();
    cartStore.addItem(productWithPromotion, quantity, selectedColor);
    navigate('/checkout');
  };

  const getDiscountedPrice = () => {
    if (!product || !product.promotion) return null;
    
    if (product.promotion.total_price) {
      return product.promotion.total_price;
    }
    
    if (product.promotion.type === 'discount') {
      const discountPercent = product.promotion.discount_percent || 20;
      const discountMultiplier = (100 - discountPercent) / 100;
      return (product.price * discountMultiplier).toFixed(2);
    }
    
    if (['2x1', '3x1', '3x2'].includes(product.promotion.type)) {
      if (quantity >= product.promotion.buy_quantity) {
        const fullPriceSets = Math.floor(quantity / product.promotion.buy_quantity);
        const remainder = quantity % product.promotion.buy_quantity;
        
        const paidItems = (fullPriceSets * product.promotion.get_quantity) + remainder;
        
        return (paidItems * product.price).toFixed(2);
      }
    }
    
    return (quantity * product.price).toFixed(2);
  };
  
  const getRegularPrice = () => {
    if (!product) return null;
    return (quantity * product.price).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Producto no encontrado</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/')}
          className="mb-8 inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </button>

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          {/* Product images */}
          <div className="space-y-4">
            <div className="aspect-w-3 aspect-h-4 rounded-lg overflow-hidden">
              <img
                src={selectedImage || product.images?.[0]}
                alt={product.name}
                className="w-full h-full object-center object-cover"
              />
            </div>
            
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(image)}
                    className={`aspect-w-1 aspect-h-1 rounded-lg overflow-hidden ${
                      selectedImage === image ? 'ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} - Vista ${index + 1}`}
                      className="w-full h-full object-center object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                {product.name}
              </h1>
              {user?.role === 'admin' && (
                <button
                  onClick={handleShare}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartir
                </button>
              )}
            </div>

            <div className="mt-3">
              <h2 className="sr-only">Información del producto</h2>
              <div className="flex items-center">
                {product.promotion ? (
                  <>
                    {product.promotion.type === 'discount' ? (
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <p className="text-2xl text-gray-500 line-through mr-2">${getRegularPrice()}</p>
                          <p className="text-3xl font-bold text-red-600">
                            ${getDiscountedPrice()}
                          </p>
                        </div>
                        <div className="mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <Tag className="h-4 w-4 mr-1" />
                          {product.promotion.discount_percent || 20}% de descuento
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {quantity >= product.promotion.buy_quantity ? (
                          <>
                            <div className="flex items-center">
                              <p className="text-2xl text-gray-500 line-through mr-2">${getRegularPrice()}</p>
                              <p className="text-3xl font-bold text-red-600">
                                ${getDiscountedPrice()}
                              </p>
                            </div>
                            <div className="mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              <Tag className="h-4 w-4 mr-1" />
                              {product.promotion.type === '2x1' && 'Compra 2, paga 1'}
                              {product.promotion.type === '3x1' && 'Compra 3, paga 1'}
                              {product.promotion.type === '3x2' && 'Compra 3, paga 2'}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-3xl text-gray-900">${getRegularPrice()}</p>
                            <div className="mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                              <Tag className="h-4 w-4 mr-1" />
                              {product.promotion.type === '2x1' && `¡Compra ${product.promotion.buy_quantity} y paga ${product.promotion.get_quantity}!`}
                              {product.promotion.type === '3x1' && `¡Compra ${product.promotion.buy_quantity} y paga ${product.promotion.get_quantity}!`}
                              {product.promotion.type === '3x2' && `¡Compra ${product.promotion.buy_quantity} y paga ${product.promotion.get_quantity}!`}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-3xl text-gray-900">${getRegularPrice()}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="sr-only">Descripción</h3>
              <div className="text-base text-gray-700 space-y-6">
                {product.description}
              </div>
            </div>

            {product.available_colors && product.available_colors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900">Colores disponibles</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.available_colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        
                        if (product.color_images && product.color_images.length > 0) {
                          const colorImage = product.color_images.find(ci => ci.color === color);
                          if (colorImage && colorImage.image) {
                            setSelectedImage(colorImage.image);
                          }
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedColor === color
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.instructions_file && (
              <div className="mt-6">
                <a
                  href={product.instructions_file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Ver instrucciones de uso
                </a>
              </div>
            )}

            {product.show_delivery_time && product.delivery_time && (
              <div className="mt-6">
                <div className="flex items-center text-sm text-gray-700">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <span>Tiempo estimado de entrega: {product.delivery_time}</span>
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-center">
                <div className="text-sm text-gray-700">
                  Stock disponible: {product.stock}
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col space-y-4">
              <div className="flex items-center">
                <label htmlFor="quantity" className="mr-3 text-sm font-medium text-gray-700">
                  Cantidad:
                </label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <button
                    type="button"
                    className="px-3 py-1 text-gray-600 hover:text-gray-900 focus:outline-none"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-12 text-center border-0 focus:ring-0"
                  />
                  <button
                    type="button"
                    className="px-3 py-1 text-gray-600 hover:text-gray-900 focus:outline-none"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="flex sm:flex-row gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 bg-indigo-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar al carrito
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="flex-1 bg-indigo-100 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Comprar ahora
                </button>
              </div>
            </div>

            {product.category && (
              <div className="mt-6">
                <div className="text-sm text-gray-700">
                  Categoría: {product.category}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16 border-t border-gray-200 pt-8">
          <ProductReviews productId={product.id} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Productos relacionados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <div
                  key={relatedProduct.id}
                  onClick={() => navigate(`/products/${relatedProduct.id}`)}
                  className="group relative cursor-pointer"
                >
                  <div className="aspect-w-1 aspect-h-1 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={relatedProduct.images?.[0]}
                      alt={relatedProduct.name}
                      className="object-center object-cover group-hover:opacity-75 transition-opacity"
                    />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      {relatedProduct.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      ${relatedProduct.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}