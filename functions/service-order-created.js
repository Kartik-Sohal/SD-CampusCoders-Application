const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

    // ✅ Check if user exists in Supabase users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.sub)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('Error checking user:', userCheckError);
    }

    if (!existingUser) {
      console.log('User not found in Supabase. Inserting...');
      const { error: insertUserError } = await supabase.from('users').insert([
        {
          id: user.sub,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          created_at: new Date().toISOString()
        }
      ]);

      if (insertUserError) {
        console.error('Error inserting user:', insertUserError);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to insert user', error: insertUserError }),
        };
      }
    }

exports.handler = async (event, context) => {
  console.log('--- service-order-created INVOCATION ---');
  console.log('Timestamp:', new Date().toISOString());

  try {
    const user = context.clientContext && context.clientContext.user;

    if (!user) {
      console.warn('❌ No user found in context');
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized: No user found in context' }),
      };
    }

    console.log('✅ User object from clientContext is PRESENT.');
    console.log('User Email:', user.email);
    console.log('User Roles:', user.app_metadata?.roles);
    console.log('User Sub (ID):', user.sub);

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (err) {
      console.error('❌ Failed to parse payload:', err);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid JSON payload' }),
      };
    }

    console.log('📦 Payload received:', payload);

    // Validate required fields
    const requiredFields = ['customer_name', 'customer_email', 'service_type', 'project_details'];
    for (const field of requiredFields) {
      if (!payload[field]) {
        console.warn(`❗ Missing required field: ${field}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `Missing required field: ${field}` }),
        };
      }
    }

    const order = {
      user_id: user.sub,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      customer_phone: payload.customer_phone || null,
      service_type: payload.service_type,
      project_details: payload.project_details,
      status: 'new',
      created_at: new Date().toISOString()
    };

    console.log('📝 Final order to insert:', order);

    const { data, error } = await supabase.from('service_orders').insert([order]);

    if (error) {
      console.error('🔥 Supabase insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Supabase insert failed', error }),
      };
    }

    console.log('✅ Insert success:', data);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Order created!', data }),
    };

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Unexpected error', error: err.message }),
    };
  }
};
