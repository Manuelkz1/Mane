import React from 'react';
import { useParams } from 'react-router-dom';
import ProductDetail from '../components/ProductDetail';

export default function ProductPage() {
  const { id } = useParams();
  
  // Verificar que el ID existe
  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Producto no encontrado</h2>
          <p className="mt-2 text-gray-600">No se ha especificado un ID de producto válido.</p>
          <a href="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }
  
  return <ProductDetail />;
}
