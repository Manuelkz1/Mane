import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
// import { twilioService } from '../services/twilioService'; // Ya no necesitamos esto
import { toast } from 'react-hot-toast';
import { ArrowLeft, Phone, MessageSquare, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface PhoneAuthProps {
  onAuthSuccess?: () => void;
  onBackToEmail?: () => void;
}

export function PhoneAuth({ onAuthSuccess, onBackToEmail }: PhoneAuthProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, initialize } = useAuthStore();
  
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      console.log('Usuario autenticado por SMS, redirigiendo:', user);
      const from = location.state?.from?.pathname || '/';
      if (onAuthSuccess) {
        onAuthSuccess();
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, navigate, location, onAuthSuccess]);

  // Countdown timer para reenvío
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneInput = (value: string) => {
    // Formatear visualmente el número mientras se escribe
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      if (cleaned.length >= 7) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{1,4})/, '$1 $2 $3');
      } else if (cleaned.length >= 4) {
        return cleaned.replace(/(\d{3})(\d{1,3})/, '$1 $2');
      }
      return cleaned;
    }
    return value;
  };

  // Funciones auxiliares para formateo de números
  const formatPhoneNumber = (phoneNumber: string): string => {
    // Remover espacios y caracteres especiales
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Si empieza con 0, removerlo (número local)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Si no tiene código de país, agregar +57 (Colombia)
    if (!cleaned.startsWith('57') && cleaned.length === 10) {
      cleaned = '57' + cleaned;
    }
    
    // Agregar el signo +
    return '+' + cleaned;
  };

  const isValidPhoneNumber = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Aceptar números de 10 dígitos (locales) o 12 dígitos (con código de país)
    return cleaned.length === 10 || cleaned.length === 12;
  };

  const maskPhoneNumber = (phoneNumber: string): string => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      const countryCode = cleaned.substring(0, cleaned.length - 10);
      const areaCode = cleaned.substring(cleaned.length - 10, cleaned.length - 7);
      const lastDigits = cleaned.substring(cleaned.length - 4);
      return `+${countryCode} ${areaCode}***${lastDigits}`;
    }
    return phoneNumber;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar número de teléfono
      if (!isValidPhoneNumber(phoneNumber)) {
        toast.error('Por favor ingresa un número de teléfono válido');
        setLoading(false);
        return;
      }

      // Formatear número de teléfono
      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Enviar código SMS usando Supabase Auth
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms'
        }
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Código de verificación enviado a ${maskPhoneNumber(formattedPhone)}`);
        setStep('verify');
        setCountdown(60); // 60 segundos para reenvío
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast.error('Error al enviar código SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (verificationCode.length !== 6) {
        toast.error('El código debe tener 6 dígitos');
        setLoading(false);
        return;
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Verificar código con Supabase Auth
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: verificationCode,
        type: 'sms'
      });
      
      if (error) {
        toast.error(error.message || 'Código incorrecto o expirado');
      } else if (data?.user) {
        toast.success('¡Autenticación exitosa!');
        // Supabase Auth maneja automáticamente la creación/inicio de sesión del usuario
        // El useAuthStore detectará el cambio automáticamente
      } else {
        toast.error('Error al verificar código');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error('Error al verificar código');
    } finally {
      setLoading(false);
    }
  };

  const createOrSignInUser = async () => {
    try {
      // Formatear número para usar como email único
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      const emailFromPhone = `${formattedPhone}@bamkz.phone`;
      
      // Primero intentar obtener o crear el usuario
      let { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phoneNumber)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingUser) {
        // Usuario no existe, crear uno nuevo
        const { data: authUser, error: signUpError } = await supabase.auth.signUp({
          email: emailFromPhone,
          password: `phone_${formattedPhone}_bamkz`, // Password temporal
          options: {
            data: {
              phone: phoneNumber,
              full_name: `Usuario ${formattedPhone.slice(-4)}`,
              auth_method: 'phone'
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authUser.user) {
          // Crear registro en tabla users
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.user.id,
              email: emailFromPhone,
              phone: phoneNumber,
              full_name: `Usuario ${formattedPhone.slice(-4)}`,
              role: 'customer',
              phone_verified: true,
              auth_method: 'phone'
            });

          if (insertError) {
            console.error('Error creating user record:', insertError);
          }
        }
      } else {
        // Usuario existe, hacer sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailFromPhone,
          password: `phone_${formattedPhone}_bamkz`
        });

        if (signInError) throw signInError;
      }

      toast.success('¡Autenticación exitosa!');
      
    } catch (error: any) {
      console.error('Error creating/signing in user:', error);
      toast.error('Error al autenticar usuario');
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms'
        }
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Código reenviado');
        setCountdown(60);
      }
    } catch (error) {
      toast.error('Error al reenviar código');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'verify') {
      setStep('phone');
      setVerificationCode('');
    } else {
      onBackToEmail?.();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full p-3">
              {step === 'phone' ? (
                <Phone className="h-8 w-8 text-white" />
              ) : (
                <MessageSquare className="h-8 w-8 text-white" />
              )}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'phone' ? 'Ingresa tu teléfono' : 'Verifica tu número'}
          </h2>
          <p className="text-gray-600">
            {step === 'phone' 
              ? 'Te enviaremos un código de verificación por SMS'
              : `Enviamos un código de 6 dígitos a tu teléfono`
            }
          </p>
        </div>

        {/* Formulario según el paso */}
        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Número de teléfono
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">+57</span>
                </div>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhoneInput(e.target.value))}
                  placeholder="300 123 4567"
                  className="block w-full pl-12 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Formato: 300 123 4567 (sin +57)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phoneNumber.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar código SMS'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Código de verificación
              </label>
              <input
                type="text"
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                required
              />
              <p className="mt-1 text-xs text-gray-500 text-center">
                Ingresa el código de 6 dígitos que recibiste
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>

            {/* Reenviar código */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                ¿No recibiste el código?
              </p>
              {countdown > 0 ? (
                <p className="text-sm text-gray-500">
                  Reenviar en {countdown} segundos
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  Reenviar código
                </button>
              )}
            </div>
          </form>
        )}

        {/* Botón de regreso */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={goBack}
            className="flex items-center justify-center w-full text-gray-600 hover:text-gray-700 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 'verify' ? 'Cambiar número' : 'Volver a email'}
          </button>
        </div>
      </div>
    </div>
  );
}
