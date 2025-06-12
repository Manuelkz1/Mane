import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Add detailed logging for debugging
  console.log('Request received:', new Date().toISOString());
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Initialize client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verify the user is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: authError.message }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No authenticated user found' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Check user role
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify user role', details: userError.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    if (userData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User is not an admin' }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Handle role update if it's a PUT request
    if (req.method === 'PUT') {
      try {
        const { userId, newRole } = await req.json();
        
        // Log incoming data for debugging
        console.log('Update request received:', { userId, newRole });
        
        if (!userId || !newRole) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: userId and newRole' }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            }
          );
        }

        // Validate role value against allowed roles
        const validRoles = ['admin', 'customer', 'fulfillment', 'dropshipping'];
        if (!validRoles.includes(newRole)) {
          return new Response(
            JSON.stringify({ error: `Invalid role value. Must be one of: ${validRoles.join(', ')}` }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            }
          );
        }

        // Verify user exists before updating
        const { data: existingUser, error: checkError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', userId)
          .single();

        if (checkError || !existingUser) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            {
              status: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            }
          );
        }

        // Prevent removing the last admin
        if (newRole !== 'admin' && userData.role === 'admin') {
          const { data: adminCount, error: countError } = await supabaseAdmin
            .from('users')
            .select('id', { count: 'exact' })
            .eq('role', 'admin');

          if (countError) {
            throw new Error('Failed to check admin count');
          }

          if (adminCount.length <= 1 && userId === user.id) {
            return new Response(
              JSON.stringify({ error: 'Cannot remove the last admin user' }),
              {
                status: 400,
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json'
                }
              }
            );
          }
        }

        // Perform the update using admin client
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ 
            role: newRole,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update user role', details: updateError.message }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Role updated successfully' }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        console.error('Error in PUT handler:', error);
        return new Response(
          JSON.stringify({ error: 'Invalid request body', details: error.message }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }

    // Get all auth users for GET request
    const { data: authData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (authUsersError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch auth users', details: authUsersError.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Create users records for any auth users that don't have one
    const authUsers = authData.users;
    for (const authUser of authUsers) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (!existingUser) {
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || '',
            role: 'customer',
            created_at: authUser.created_at,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Failed to create user record:', insertError);
        }
      }
    }

    // Get all users from the database
    const { data: dbUsers, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch database users', details: dbError.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Merge auth and database data
    const mergedUsers = dbUsers.map(dbUser => {
      const authUser = authUsers.find(au => au.id === dbUser.id);
      return {
        ...dbUser,
        email_confirmed: authUser?.email_confirmed_at ? true : false,
        last_sign_in: authUser?.last_sign_in_at
      };
    });

    return new Response(
      JSON.stringify({ users: mergedUsers }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        details: error.stack
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