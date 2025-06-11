import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Preference } from "npm:mercadopago@2.0.8";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    console.log('Processing payment creation request');
    
    const { orderId, items, total } = await req.json();
    console.log('Request data:', { orderId, itemsCount: items?.length, total });

    if (!orderId || !items || !Array.isArray(items) || items.length === 0 || !total) {
      console.error('Invalid request data');
      return new Response(
        JSON.stringify({ error: 'Datos inválidos' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      throw new Error('Error al obtener detalles del pedido');
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('MercadoPago access token not configured');
      throw new Error('Token de MercadoPago no configurado');
    }

    const client = new MercadoPagoConfig({ 
      accessToken: accessToken,
    });

    const preference = new Preference(client);
    
    // Get origin for back_urls
    const origin = req.headers.get('origin') || 'https://bamkz.com';
    console.log('Using origin:', origin);

    // Get customer name parts
    const fullName = order.shipping_address?.full_name || order.guest_info?.full_name || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || 'Guest';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';
    const email = order.guest_info?.email || 'guest@example.com';

    // Construct preference data
    const preferenceData = {
      items: items.map(item => ({
        title: item.product.name,
        quantity: item.quantity,
        currency_id: "COP",
        unit_price: Number(item.product.price),
        description: `Orden #${orderId}`,
      })),
      payer: {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: {
          number: order.shipping_address?.phone || order.guest_info?.phone
        },
        address: {
          street_name: order.shipping_address?.address,
          zip_code: order.shipping_address?.postal_code
        }
      },
      back_urls: {
        success: `${origin}/pago?status=approved&order_id=${orderId}`,
        failure: `${origin}/pago?status=rejected&order_id=${orderId}`,
        pending: `${origin}/pago?status=pending&order_id=${orderId}`
      },
      auto_return: "approved",
      external_reference: orderId,
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
      statement_descriptor: "Calidad Premium",
      binary_mode: true // Only approved or rejected, no pending
    };

    console.log('Creating MercadoPago preference');
    const response = await preference.create({ body: preferenceData });
    console.log('Preference created:', { 
      id: response.id,
      init_point: response.init_point 
    });

    return new Response(
      JSON.stringify({
        success: true,
        init_point: response.init_point,
        preference_id: response.id,
        sandbox_init_point: response.sandbox_init_point
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});