import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../stores/cartStore';

export function PaymentStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const orderId = searchParams.get('order_id');
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    const handleSuccessfulPayment = async () => {
      if (status === 'approved' && orderId) {
        console.log('[PaymentStatus] Payment approved for orderId:', orderId);
        try {
          // 1. Fetch order details to get all necessary info for the email
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select(`
              id,
              guest_info,
              shipping_address,
              payment_method,
              total,
              order_items (
                quantity,
                price_at_time,
                selected_color,
                products (name, price)
              )
            `)
            .eq('id', orderId)
            .single();

          if (orderError || !orderData) {
            console.error('[PaymentStatus] Error fetching order details for notification:', orderError?.message);
            // Proceed without notification if order details can't be fetched, but log error
          } else {
            console.log('[PaymentStatus] Order details fetched:', orderData);
            const notificationPayload = {
              fullName: orderData.shipping_address?.full_name || orderData.guest_info?.full_name || 'N/A',
              email: orderData.guest_info?.email || 'N/A',
              phone: orderData.shipping_address?.phone || orderData.guest_info?.phone || 'N/A',
              address: orderData.shipping_address?.address || 'N/A',
              city: orderData.shipping_address?.city || 'N/A',
              postalCode: orderData.shipping_address?.postal_code || 'N/A',
              country: orderData.shipping_address?.country || 'N/A',
              orderId: orderData.id,
              paymentMethod: orderData.payment_method,
              totalAmount: Number(orderData.total).toFixed(2),
              items: orderData.order_items.map((item: any) => ({
                product: { name: item.products.name, price: Number(item.products.price) },
                quantity: item.quantity,
                selectedColor: item.selected_color || 'N/A',
              })),
            };
            
            console.log('[PaymentStatus] Attempting to send notification email for approved order:', notificationPayload);
            const { error: emailError } = await supabase.functions.invoke("send-order-notification", {
              body: { orderData: notificationPayload },
            });

            if (emailError) {
              console.error('[PaymentStatus] Error sending approved order notification email:', emailError.message);
              // Log error, but don't block user flow
            } else {
              console.log('[PaymentStatus] Approved order notification email function invoked.');
            }
          }
          
          // Clear cart and form data
          clearCart();
          sessionStorage.removeItem("checkout-form-bolt-v3");
          console.log('[PaymentStatus] Cart and form data cleared for successful payment.');

        } catch (e: any) {
          console.error('[PaymentStatus] Exception during successful payment handling:', e.message);
        }

        // Redirect to home after 5 seconds on successful payment
        const timer = setTimeout(() => {
          navigate('/');
        }, 5000);
        return () => clearTimeout(timer);
      }
    };

    handleSuccessfulPayment();
  }, [status, orderId, navigate, clearCart]);

  interface StatusContentType {
    icon: JSX.Element;
    title: string;
    message: string;
    actions: Array<{
      text: string;
      action: () => void;
      style: string;
      isPrimary: boolean;
    }>;
  }

  const getStatusContent = (): StatusContentType => {
    switch (status) {
      case 'approved':
        return {
          icon: <CheckCircle className="h-16 w-16 text-green-500" />,
          title: '¡Pago exitoso!',
          message: 'Tu pago ha sido procesado correctamente. Hemos enviado una notificación a tu correo y serás redirigido al inicio en 5 segundos.',
          actions: [
            {
              text: 'Volver al inicio ahora',
              action: () => navigate('/'),
              style: 'bg-green-600 hover:bg-green-700 text-white',
              isPrimary: true,
            },
          ],
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-16 w-16 text-red-500" />,
          title: 'Pago rechazado',
          message: 'Lo sentimos, tu pago no pudo ser procesado. Por favor intenta de nuevo.',
          actions: [
            {
              text: 'Elegir otro medio de pago',
              action: () => navigate('/checkout'),
              style: 'bg-red-600 hover:bg-red-700 text-white',
              isPrimary: true,
            },
            {
              text: 'Volver al inicio',
              action: () => navigate('/'),
              style: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
              isPrimary: false,
            },
          ],
        };
      case 'pending_cod':
      case 'pending':
        return {
          icon: <Clock className="h-16 w-16 text-yellow-500" />,
          title: 'Pago pendiente',
          message: status === 'pending_cod' 
            ? 'Tu pedido contra entrega ha sido recibido y está siendo procesado. Te hemos enviado una notificación por correo.' 
            : 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
          actions: [
            {
              text: 'Volver al inicio',
              action: () => navigate('/'),
              style: 'bg-yellow-600 hover:bg-yellow-700 text-white',
              isPrimary: true,
            },
          ],
        };
      default:
        return {
          icon: <XCircle className="h-16 w-16 text-gray-500" />,
          title: 'Estado desconocido',
          message: 'No pudimos determinar el estado de tu pago. Contacta a soporte si el problema persiste.',
          actions: [
            {
              text: 'Volver al inicio',
              action: () => navigate('/'),
              style: 'bg-gray-600 hover:bg-gray-700 text-white',
              isPrimary: true,
            },
          ],
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex items-center p-4 border-b bg-white shadow-sm">
        <button
          onClick={() => navigate('/')}
          className="text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            {statusContent.icon}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {statusContent.title}
          </h2>
          
          <p className="text-gray-600 mb-8">
            {statusContent.message}
          </p>

          <div className="space-y-4">
            {statusContent.actions.map((buttonInfo, index) => (
              <button
                key={index}
                onClick={buttonInfo.action}
                className={`w-full py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonInfo.style} ${buttonInfo.isPrimary ? '' : 'border border-gray-300'}`}
              >
                {buttonInfo.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}