import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ShoppingBag, User, LogOut, ShoppingCart, Package, Clock, Heart } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { useCompanySettings } from '../hooks/useCompanySettings';
import { AuthRequiredModal } from './AuthRequiredModal';
import { HomeReviews } from './HomeReviews';

export default function Home() {
  const { user, signOut } = useAuthStore();
  const cartStore = useCartStore();
  const favoritesStore = useFavoritesStore();
  const navigate = useNavigate();
  const { settings } = useCompanySettings();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (user && !favoritesStore.isInitialized) {
      favoritesStore.loadFavorites(user.id);
    }
  }, [user]);

  const handleOrdersClick = () => {
    if (user) {
      navigate('/my-orders');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleFavoritesClick = () => {
    if (user) {
      navigate('/my-favorites');
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center flex-shrink-0">
              <Link to="/" className="flex items-center">
                {settings?.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt={settings.name}
                    style={{
                      width: `${Math.min(settings.logo_width || 40, 40)}px`,
                      height: `${Math.min(settings.logo_height || 40, 40)}px`
                    }}
                    className="object-contain"
                  />
                ) : (
                  <ShoppingBag className="h-8 w-8 text-indigo-600" />
                )}
                <span className="ml-2 text-lg sm:text-xl font-bold text-gray-900 truncate max-w-[100px] sm:max-w-full">
                  {settings?.name || 'Calidad Premium'}
                </span>
              </Link>
            </div>
            
            {/* Menú móvil y carrito */}
            <div className="flex items-center space-x-4">
              {/* Botón Mis Pedidos */}
              <button
                onClick={handleOrdersClick}
                className="flex items-center text-gray-700 hover:text-indigo-600 transition-colors"
              >
                <Clock className="h-6 w-6 sm:mr-2" />
                <span className="hidden sm:inline">Mis Pedidos</span>
              </button>

              {/* Botón Favoritos */}
              <button
                onClick={handleFavoritesClick}
                className="flex items-center justify-center text-gray-700 hover:text-red-600 relative transition-colors p-2"
                aria-label="Mis favoritos"
              >
                <Heart className="h-6 w-6" />
                <span className="hidden sm:inline sm:ml-2">Favoritos</span>
                {user && favoritesStore.getFavoriteCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {favoritesStore.getFavoriteCount()}
                  </span>
                )}
              </button>

              {/* Carrito */}
              {(!user || user.role !== 'fulfillment') && (
                <button
                  onClick={() => cartStore.toggleCart()}
                  className="flex items-center justify-center text-gray-700 hover:text-indigo-600 relative transition-colors p-2"
                  aria-label="Carrito de compras"
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cartStore.items.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      {cartStore.items.length}
                    </span>
                  )}
                </button>
              )}
              
              {/* Usuario y opciones */}
              {user ? (
                <div className="relative group">
                  <button className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 p-2 rounded-md">
                    <User className="h-6 w-6" />
                    <span className="hidden sm:inline truncate max-w-[120px]">{user.full_name || user.email}</span>
                  </button>
                  
                  <div className="absolute right-0 w-48 mt-1 py-2 bg-white rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-gray-100">
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-indigo-600 w-full"
                      >
                        Panel Admin
                      </Link>
                    )}
                    {user.role === 'fulfillment' ? (
                      <button
                        onClick={handleOrdersClick}
                        className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-indigo-600 w-full"
                      >
                        <Package className="h-5 w-5 mr-2" />
                        Gestionar Pedidos
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleOrdersClick}
                          className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-indigo-600 w-full"
                        >
                          <Clock className="h-5 w-5 mr-2" />
                          Mis Pedidos
                        </button>
                        <button
                          onClick={handleFavoritesClick}
                          className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-red-600 w-full"
                        >
                          <Heart className="h-5 w-5 mr-2" />
                          Mis Favoritos
                          {favoritesStore.getFavoriteCount() > 0 && (
                            <span className="ml-auto bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-semibold">
                              {favoritesStore.getFavoriteCount()}
                            </span>
                          )}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => signOut()}
                      className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-indigo-600 w-full"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center text-gray-700 hover:text-indigo-600 transition-colors p-2 rounded-md"
                >
                  <User className="h-6 w-6" />
                  <span className="hidden sm:inline ml-1">Iniciar sesión</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-indigo-700 text-white py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold sm:text-4xl md:text-5xl lg:text-6xl leading-tight">
              {user?.role === 'fulfillment' 
                ? 'Gestión de Pedidos'
                : settings?.hero_title || 'Productos de Calidad Premium'}
            </h1>
            <p className="mt-3 sm:mt-4 md:mt-6 text-base sm:text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto">
              {user?.role === 'fulfillment'
                ? 'Administra y gestiona todos los pedidos de manera eficiente'
                : settings?.hero_subtitle || 'Descubre nuestra selección de productos exclusivos con la mejor calidad garantizada'}
            </p>
            {user?.role === 'fulfillment' && (
              <button
                onClick={handleOrdersClick}
                className="mt-6 sm:mt-8 inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-700 focus:ring-white"
              >
                <Package className="h-5 w-5 mr-2" />
                Ver Pedidos Pendientes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user?.role === 'fulfillment' ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Panel de Gestión de Pedidos
            </h2>
            <p className="text-gray-600 mb-8">
              Bienvenido al panel de gestión de pedidos. Aquí podrás ver y gestionar todos los pedidos.
            </p>
            <button
              onClick={handleOrdersClick}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Package className="h-5 w-5 mr-2" />
              Ir a Gestión de Pedidos
            </button>
          </div>
        ) : (
          <>
            <ProductGrid />
            {/* Sección de reseñas en la página inicial */}
            <HomeReviews />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2025 {settings?.name || 'Calidad Premium'}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {(!user || user.role !== 'fulfillment') && <Cart />}
      <AuthRequiredModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
