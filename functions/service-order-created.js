import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Must be service role key
);

export const handler = async (event, context) => {
  console.log('--- service-order-created INVOCATION ---');
  console.log('Timestamp:', new Date().toISOString());

  try {
    // Step 1: Log headers for debugging
    console.log('Event Headers:', event.headers);

    // Step 2: Verify user context from Netlify Identity
    const user = context.clientContext && context.clientContext.user;

    if (!user) {
      console.warn('❌ No user found in context. Aborting.');
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized: No user found in context' }),
      };
    }

    console.log('✅ User object from clientContext is PRESENT.');
    console.log('User Email:', user.email);
    console.log('User Roles:', user.app_metadata?.roles);
    console.log('User Sub (ID):', user.sub);

    const userId = user.sub; // This is the Supabase auth UID

    // Step 3: Parse JSON body
    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (parseErr) {
      console.error('❌ Failed to parse JSON payload:', parseErr);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid JSON payload' }),
      };
    }

    console.log('📦 Payload received:', payload);

    // Step 4: Validate required fields
    const requiredFields = ['service_type', 'title', 'email', 'description'];
    for (const field of requiredFields) {
      if (!payload[field]) {
        console.warn(`❗ Missing required field: ${field}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `Missing required field: ${field}` }),
        };
      }
    }

    // Step 5: Construct the order record
    const orderRecord = {
      user_id: userId,
      service_type: payload.service_type,
      title: payload.title,
      email: payload.email,
      description: payload.description,
      metadata: payload.metadata || null,
      status: 'new',
      created_at: new Date().toISOString(),
      name: payload.name || null,
      phone: payload.phone || null,
      extra_notes: payload.extra_notes || null
    };

    console.log('📝 Final order record:', orderRecord);

    // Step 6: Insert into Supabase
    const { data, error } = await supabase
      .from('service_orders')
      .insert([orderRecord]);

    if (error) {
      console.error('🔥 Supabase insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Supabase error inserting service order',
          error,
        }),
      };
    }

    console.log('✅ Service order inserted successfully!', data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Service order created successfully!',
        data,
      }),
    };

  } catch (err) {
    console.error('❌ Unexpected error occurred:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Unexpected error occurred', error: err.message }),
    };
  }
};
