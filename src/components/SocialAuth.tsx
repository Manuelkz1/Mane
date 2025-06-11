import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { FcGoogle } from 'react-icons/fc';

export function SocialAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initialize } = useAuthStore();

  // Manejar el inicio de sesión con Google
  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://xawsitihehpebojtunk.supabase.co/auth/v1/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Error al iniciar sesión con Google:', error);
        toast.error('Error al iniciar sesión con Google. Por favor intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error inesperado al iniciar sesión con Google:', error);
      toast.error('Ha ocurrido un error. Por favor intenta nuevamente.');
    }
  };

  // Verificar si estamos en la página de callback
  useEffect(() => {
    const isCallback = location.pathname === '/auth/callback';
    
    if (isCallback) {
      const handleCallback = async () => {
        try {
          // Obtener la sesión actual
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }
          
          if (session) {
            // Verificar si el usuario ya existe en la tabla users
            const { data: existingUser } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            // Si el usuario no existe, crearlo en la tabla users
            if (!existingUser) {
              const { error: createError } = await supabase
                .from('users')
                .insert([{
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
                  role: 'customer',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }]);
              
              if (createError) {
                console.error('Error al crear registro de usuario:', createError);
              }
            }
            
            // Forzar la inicialización del estado de autenticación
            await initialize();
            
            toast.success('¡Inicio de sesión exitoso!');
            
            // Redirigir a la página principal o a la página anterior
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
          } else {
            // Si no hay sesión, redirigir a la página de inicio de sesión
            navigate('/auth', { replace: true });
          }
        } catch (error) {
          console.error('Error en el callback de autenticación:', error);
          toast.error('Error al procesar la autenticación. Por favor intenta nuevamente.');
          navigate('/auth', { replace: true });
        }
      };
      
      handleCallback();
    }
  }, [location, navigate, initialize]);

  return (
    <div className="mt-4">
      <button
        onClick={handleGoogleSignIn}
        className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <FcGoogle className="h-5 w-5 mr-2" />
        Continuar con Google
      </button>
    </div>
  );
}
