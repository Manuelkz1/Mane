import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, FileText, Truck, Gift } from 'lucide-react';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthRequiredModal({ isOpen, onClose }: AuthRequiredModalProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate('/auth');
  };

  const handleRegister = () => {
    onClose();
    navigate('/auth', { state: { isSignUp: true } });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Lock className="h-12 w-12 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Acceso restringido
              </h3>
              <p className="text-gray-600 mb-6">
                Para ver tus pedidos, primero necesitas iniciar sesión o crear una cuenta gratuita.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center text-left">
                  <FileText className="h-5 w-5 text-indigo-600 mr-3" />
                  <span className="text-gray-700">Ver el historial de tus compras</span>
                </div>
                <div className="flex items-center text-left">
                  <Truck className="h-5 w-5 text-indigo-600 mr-3" />
                  <span className="text-gray-700">Hacer seguimiento a tus pedidos</span>
                </div>
                <div className="flex items-center text-left">
                  <Gift className="h-5 w-5 text-indigo-600 mr-3" />
                  <span className="text-gray-700">Acceder a promociones exclusivas</span>
                </div>
              </div>

              <p className="text-sm text-indigo-600 font-medium mb-6">
                👉 ¡Es rápido y sencillo!
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleLogin}
                  className="w-full bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700 transition-colors"
                >
                  Iniciar sesión
                </button>
                <button
                  onClick={handleRegister}
                  className="w-full bg-green-600 text-white rounded-md px-4 py-2 hover:bg-green-700 transition-colors"
                >
                  Registrarme
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}