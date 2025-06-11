import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import twilio from "npm:twilio@4.22.0";

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
];

for (const envVar of requiredEnvVars) {
  if (!Deno.env.get(envVar)) {
    console.error(`Missing required environment variable: ${envVar}`);
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ADMIN_WHATSAPP = '+573206249208';
const TWILIO_WHATSAPP_NUMBER = '+14155238886';

let twilioClient;
try {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  
  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio credentials');
  }
  
  twilioClient = twilio(accountSid, authToken);
  console.log('Twilio client initialized successfully');
} catch (error) {
  console.error('Error initializing Twilio client:', error);
  throw error;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Add detailed logging for debugging
  console.log('Request received:', new Date().toISOString());
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    console.log('Processing notification request...');
    
    if (!req.body) {
      throw new Error('Request body is empty');
    }

    const { record: order } = await req.json();
    console.log('Order data received:', JSON.stringify(order, null, 2));

    if (!order) {
      throw new Error('No order data provided');
    }

    let orderItems;
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          price_at_time,
          products (
            name
          )
        `)
        .eq('order_id', order.id);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No order items found');
      }

      orderItems = data;
      console.log('Order items fetched:', JSON.stringify(orderItems, null, 2));
    } catch (error) {
      console.error('Error fetching order items:', error);
      throw new Error(`Failed to fetch order items: ${error.message}`);
    }

    const formattedItems = orderItems?.map(item => ({
      product_name: item.products.name,
      quantity: item.quantity,
      price: item.price_at_time,
      subtotal: item.quantity * item.price_at_time
    })) || [];

    const message = `
🛍️ Nueva Orden #${order.id}

📋 Detalles del Cliente:
${order.is_guest ? '(Compra como invitado)' : ''}
- Nombre: ${order.guest_info?.full_name || order.shipping_address.full_name}
- Email: ${order.guest_info?.email || 'No proporcionado'}
- Teléfono: ${order.guest_info?.phone || order.shipping_address.phone}

📍 Dirección de Entrega:
${order.shipping_address.address}
${order.shipping_address.city}
${order.shipping_address.postal_code}
${order.shipping_address.country}

💰 Información de Pago:
- Método: ${order.payment_method === 'cash_on_delivery' ? 'Pago contra entrega' : order.payment_method}
- Estado: ${order.payment_status === 'pending' ? 'Pendiente' : order.payment_status}
- Total: $${order.total}

📦 Productos:
${formattedItems.map(item => 
  `- ${item.product_name}
   Cantidad: ${item.quantity}
   Precio: $${item.price}
   Subtotal: $${item.subtotal}`
).join('\n')}

Estado del Pedido: ${order.status === 'pending' ? 'Pendiente' : order.status}`;

    try {
      console.log('Preparing to send WhatsApp notification...');
      console.log('Message content:', message);
      console.log('Using Twilio credentials:', {
        accountSid: Deno.env.get('TWILIO_ACCOUNT_SID')?.substring(0, 5) + '...',
        from: TWILIO_WHATSAPP_NUMBER,
        to: ADMIN_WHATSAPP
      });

      if (!twilioClient) {
        throw new Error('Twilio client not initialized');
      }

      const twilioResponse = await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${ADMIN_WHATSAPP}`
      });
      
      console.log('WhatsApp notification sent successfully:', twilioResponse.sid);
      console.log('Full Twilio response:', JSON.stringify(twilioResponse, null, 2));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'WhatsApp notification sent successfully',
          messageId: twilioResponse.sid,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to send WhatsApp notification: ${error.message}`);
    }
  } catch (error) {
    console.error('Error processing notification:', error);
    
    const errorResponse = {
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      context: {
        twilioInitialized: !!twilioClient,
        envVarsPresent: {
          SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
          TWILIO_ACCOUNT_SID: !!Deno.env.get('TWILIO_ACCOUNT_SID'),
          TWILIO_AUTH_TOKEN: !!Deno.env.get('TWILIO_AUTH_TOKEN')
        }
      }
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});