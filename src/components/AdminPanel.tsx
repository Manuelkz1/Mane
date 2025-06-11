import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Settings, Package, Tag, Truck, Box, Users, MessageSquare } from 'lucide-react';
import OrderManager from './OrderManager';
import PromotionManager from './PromotionManager';
import ProductManager from './ProductManager';
import { CompanySettings } from './CompanySettings';
import { ShippingSettings } from './ShippingSettings';
import UserManager from './UserManager';
import ReviewManager from './ReviewManager';

export function AdminPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'orders');

  if (!user || (user.role !== 'admin' && user.role !== 'fulfillment')) {
    navigate('/');
    return null;
  }

  const tabs = [
    {
      id: 'orders',
      name: 'Pedidos',
      icon: Package,
      component: OrderManager,
      roles: ['admin', 'fulfillment']
    },
    {
      id: 'products',
      name: 'Productos',
      icon: Box,
      component: ProductManager,
      roles: ['admin']
    },
    {
      id: 'promotions',
      name: 'Promociones',
      icon: Tag,
      component: PromotionManager,
      roles: ['admin']
    },
    {
      id: 'users',
      name: 'Usuarios',
      icon: Users,
      component: UserManager,
      roles: ['admin']
    },
    {
      id: 'company',
      name: 'Empresa',
      icon: Settings,
      component: CompanySettings,
      roles: ['admin']
    },
    {
      id: 'shipping',
      name: 'Envíos',
      icon: Truck,
      component: ShippingSettings,
      roles: ['admin']
    },
    {
      id: 'reviews',
      name: 'Reseñas',
      icon: MessageSquare,
      component: ReviewManager,
      roles: ['admin']
    }
  ];

  const allowedTabs = tabs.filter(tab => tab.roles.includes(user.role));
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || OrderManager;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {allowedTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <tab.icon
                    className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}