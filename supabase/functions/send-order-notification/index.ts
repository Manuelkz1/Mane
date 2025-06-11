import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Función 'send-order-notification' cargada. Versión final con correcciones.");

serve(async (req: Request) => {
  console.log("Función 'send-order-notification' ha sido invocada.");
  
  // Manejar solicitudes OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    console.log("Manejando solicitud OPTIONS (CORS preflight).");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Obtener los secrets de Supabase
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL_ADDRESS = Deno.env.get("FROM_EMAIL_ADDRESS");
    
    // Verificar que los secrets existan
    if (!RESEND_API_KEY) {
      console.error("Error: RESEND_API_KEY no está configurado en los secrets de Supabase.");
      throw new Error("RESEND_API_KEY no configurado");
    }
    
    if (!FROM_EMAIL_ADDRESS) {
      console.error("Error: FROM_EMAIL_ADDRESS no está configurado en los secrets de Supabase.");
      throw new Error("FROM_EMAIL_ADDRESS no configurado");
    }
    
    console.log(`Usando FROM_EMAIL_ADDRESS: ${FROM_EMAIL_ADDRESS}`);
    
    // Obtener los datos del pedido del cuerpo de la solicitud
    const body = await req.json();
    console.log("Datos del pedido recibidos:", JSON.stringify(body, null, 2));
    
    const orderData = body.orderData;
    if (!orderData) {
      console.error("Error: No se encontraron datos del pedido en la solicitud.");
      throw new Error("Datos del pedido no encontrados");
    }
    
    // Preparar el correo electrónico
    const emailTo = "Bamkz10ficial@gmail.com"; // Dirección de correo del destinatario
    const subject = "Nuevo pedido en Bamkz_sisa";
    
    // Construir el contenido del correo con los datos del pedido
    let emailContent = `
      <h1>Nuevo pedido recibido</h1>
      <p>Se ha recibido un nuevo pedido en la tienda Bamkz_sisa.</p>
      <h2>Detalles del pedido:</h2>
      <ul>
    `;
    
    // Agregar cada campo del pedido al contenido del correo
    for (const [key, value] of Object.entries(orderData)) {
      emailContent += `<li><strong>${key}:</strong> ${value}</li>`;
    }
    
    emailContent += `
      </ul>
      <p>Por favor, revisa el panel de administración para más detalles.</p>
    `;
    
    // Enviar el correo usando la API de Resend
    console.log("Enviando correo electrónico a través de Resend...");
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL_ADDRESS,
        to: emailTo,
        subject: subject,
        html: emailContent,
      }),
    });
    
    // Verificar la respuesta de Resend
    const resendData = await resendResponse.json();
    console.log("Respuesta de Resend:", JSON.stringify(resendData, null, 2));
    
    if (!resendResponse.ok) {
      console.error("Error al enviar el correo a través de Resend:", resendData);
      throw new Error(`Error de Resend: ${JSON.stringify(resendData)}`);
    }
    
    console.log("Correo electrónico enviado exitosamente.");
    
    // Responder al cliente
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notificación de pedido enviada exitosamente",
        emailId: resendData.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error en la función send-order-notification:", error.message);
    
    // Responder con el error
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

console.log("Función 'send-order-notification' lista para servir solicitudes.");
