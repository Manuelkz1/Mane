import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useAuthStore } from '../stores/authStore';
import { SocialAuth } from './SocialAuth';

interface AuthProps {
  onAuthSuccess?: () => void;
  onGuestCheckout?: () => void;
}

export function Auth({ onAuthSuccess, onGuestCheckout }: AuthProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, initialize } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [lastResendTime, setLastResendTime] = useState(0);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      console.log('Usuario autenticado, redirigiendo:', user);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('email_confirmed') === 'true') {
      toast.success('Email confirmado exitosamente. Ahora puedes iniciar sesión.');
      setIsSignUp(false);
    }
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?email_confirmed=true`,
            data: {
              full_name: email.split('@')[0],
            }
          }
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este correo ya está registrado. Por favor inicia sesión.');
            setIsSignUp(false);
          } else if (error.message.includes('password')) {
            toast.error('La contraseña debe tener al menos 6 caracteres.');
          } else {
            toast.error(`Error: ${error.message}`);
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          const { error: createError } = await supabase
            .from('users')
            .insert([{
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || email.split('@')[0],
              role: 'customer',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

          if (createError) {
            console.error('Error creating user record:', createError);
          }
        }

        setConfirmationSent(true);
        toast.success(
          'Registro exitoso! Por favor revisa tu correo para confirmar tu cuenta.',
          { duration: 6000 }
        );
        setShowResendConfirmation(true);
      } else {
        console.log('Intentando iniciar sesión con:', email);
        const result = await signIn(email, password);
        
        if (result?.error) {
          const error = result.error;
          console.error('Error de inicio de sesión:', error);
          
          if (error.message.includes('Email not confirmed')) {
            toast.error('Por favor confirma tu correo electrónico antes de iniciar sesión');
            setShowResendConfirmation(true);
          } else if (error.message.includes('Invalid login credentials')) {
            toast.error('Correo o contraseña incorrectos. Por favor verifica tus datos.');
          } else if (error.message.includes('rate limit')) {
            toast.error('Demasiados intentos. Por favor espera unos minutos antes de intentar de nuevo.');
          } else {
            toast.error(`Error: ${error.message}`);
          }
          setLoading(false);
          return;
        }
        
        console.log('Inicio de sesión exitoso');
        toast.success('¡Inicio de sesión exitoso!');
        onAuthSuccess?.();
        
        await initialize();
        
        const from = location.state?.from?.pathname || '/';
        console.log('Redirigiendo a:', from);
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      console.error('Error de autenticación no capturado:', error);
      toast.error('Ha ocurrido un error. Por favor intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error('Por favor ingresa tu correo electrónico');
      return;
    }

    const now = Date.now();
    const timeSinceLastResend = now - lastResendTime;
    
    if (timeSinceLastResend < 60000) {
      const remainingSeconds = Math.ceil((60000 - timeSinceLastResend) / 1000);
      toast.error(`Por favor espera ${remainingSeconds} segundos antes de solicitar otro correo.`);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?email_confirmed=true`
        }
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          toast.error('Por favor espera unos minutos antes de solicitar otro correo.');
        } else {
          throw error;
        }
        return;
      }
      
      setLastResendTime(now);
      toast.success('Correo de confirmación reenviado. Por favor revisa tu bandeja de entrada.', {
        duration: 6000
      });
    } catch (error: any) {
      console.error('Error al reenviar confirmación:', error);
      toast.error('No se pudo reenviar el correo. Por favor intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="relative">
          <button
            onClick={() => navigate('/')}
            className="absolute left-0 top-0 p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            aria-label="Volver"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Crear una cuenta' : 'Iniciar sesión'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSignUp ? 'Crea tu cuenta para empezar a comprar' : 'Accede a tu cuenta para continuar'}
          </p>
        </div>

        {confirmationSent ? (
          <div className="text-center">
            <div className="bg-green-50 p-4 rounded-md">
              <h3 className="text-lg font-medium text-green-800">Revisa tu correo</h3>
              <p className="mt-2 text-sm text-green-600">
                Te hemos enviado un correo de confirmación. Por favor revisa tu bandeja de entrada y sigue las instrucciones para activar tu cuenta.
              </p>
              <button
                onClick={handleResendConfirmation}
                disabled={loading}
                className="mt-4 text-sm text-green-700 hover:text-green-900 disabled:opacity-50"
              >
                ¿No recibiste el correo? Reenviar
              </button>
            </div>
            <button
              onClick={() => {
                setConfirmationSent(false);
                setIsSignUp(false);
              }}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-500"
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <>
            <form className="mt-8 space-y-6" onSubmit={handleEmailAuth}>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <svg className="animate-spin h-5 w-5 text-white\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                        <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  ) : null}
                  {isSignUp ? 'Registrarse' : 'Iniciar sesión'}
                </button>
              </div>

              <SocialAuth />

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={onGuestCheckout}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Continuar como invitado
                </button>
              </div>

              {showResendConfirmation && !isSignUp && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={loading}
                    className="text-sm text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                  >
                    ¿No recibiste el correo de confirmación? Reenviar
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setShowResendConfirmation(false);
                    setEmail('');
                    setPassword('');
                    setConfirmationSent(false);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  {isSignUp
                    ? '¿Ya tienes una cuenta? Inicia sesión'
                    : '¿No tienes una cuenta? Regístrate'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}