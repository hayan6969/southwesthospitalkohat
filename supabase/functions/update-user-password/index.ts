import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the user making the request
    const supabaseClient = createClient(supabaseUrl, anonKey);

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Invalid authorization:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    const { userId, password, email } = requestBody;

    if (!userId || (!password && !email)) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and at least password or email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions: allow if user is admin/super_admin or updating their own account
    const isSelf = user.id === userId;
    let isAdmin = false;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileError && profile) {
      isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
    }

    if (!isAdmin && !isSelf) {
      console.error('Insufficient permissions - user role:', profile?.role);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions - admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update payload
    const updateAttrs: Record<string, any> = {};
    if (password) updateAttrs.password = password;
    if (email) {
      updateAttrs.email = email;
      updateAttrs.email_confirm = true;
    }

    console.log('Attempting to update credentials for user:', userId, { hasPassword: !!password, hasEmail: !!email });
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateAttrs);

    if (updateError) {
      console.error('Error updating credentials in auth:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (email) {
      await supabaseAdmin
        .from('profiles')
        .update({ email, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }

    console.log('Credentials updated successfully for user:', userId);
    return new Response(
      JSON.stringify({ success: true, message: 'Account credentials updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});