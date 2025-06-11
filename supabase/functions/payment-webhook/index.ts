import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { MercadoPagoConfig, Payment } from "npm:mercadopago@2.0.8";

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    // Configure MercadoPago
    const client = new MercadoPagoConfig({ 
      accessToken: accessToken
    });

    const payment = new Payment(client);
    const body = await req.text();
    console.log('Received webhook payload:', body);

    const params = new URLSearchParams(body);
    const type = params.get('type') || params.get('topic');
    const data_id = params.get('data.id') || params.get('id');

    console.log('Processing webhook:', { type, data_id });

    if (type === 'payment') {
      const paymentInfo = await payment.get({ id: Number(data_id) });
      console.log('Payment info:', JSON.stringify(paymentInfo, null, 2));

      const orderId = paymentInfo.external_reference;
      const status = paymentInfo.status;

      // Update order status in Supabase
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_status: status === 'approved' ? 'paid' : 
                         status === 'pending' ? 'pending' : 'failed',
          status: status === 'approved' ? 'processing' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order:', updateError);
        throw updateError;
      }

      // Send notification if payment was successful
      if (status === 'approved') {
        const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/order-notifications`;
        
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (order) {
          await fetch(notificationUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ record: order })
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
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