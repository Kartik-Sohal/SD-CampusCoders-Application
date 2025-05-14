// functions/service-order-created.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event, context) => {
    console.log('--- service-order-created INVOCATION (user expected in public.users via sync) ---');
    if (!supabaseUrl || !supabaseServiceKey) { /* ... error handling ... */ }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (event.httpMethod !== 'POST') { /* ... */ }

    const netlifyUser = context.clientContext && context.clientContext.user;

    if (!netlifyUser || !netlifyUser.sub) {
        console.warn('SERVICE-ORDER: Unauthorized - No user.sub in JWT context.');
        return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized: User identification failed.' }) };
    }
    const userIdFromJwt = netlifyUser.sub;
    console.log(`SERVICE-ORDER: Authenticated User ID: ${userIdFromJwt}, Email: ${netlifyUser.email}`);

    // We now assume sync-user-profile has ensured this user exists in public.users
    // A very defensive check could be added here, but it might be redundant.

    let payload;
    try { payload = JSON.parse(event.body); } catch (e) { /* ... */ }
    console.log('SERVICE-ORDER: Parsed payload:', payload);

    const requiredFields = ['customer_name', 'customer_email', 'service_type', 'project_details'];
    for (const field of requiredFields) { if (!payload[field] || String(payload[field]).trim() === '') { /* ... */ }}

    const orderRecord = {
        user_id: userIdFromJwt, // This ID should now reliably exist in public.users
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        customer_phone: payload.customer_phone || null,
        service_type: payload.service_type,
        project_details: payload.project_details,
        status: 'new',
        raw_form_data: payload
    };
    console.log('SERVICE-ORDER: Final order record for insert:', orderRecord);

    try {
        const { data, error: insertOrderError } = await supabase
            .from('service_orders')
            .insert([orderRecord])
            .select();

        if (insertOrderError) {
            console.error('SERVICE-ORDER: Supabase insert error:', JSON.stringify(insertOrderError, null, 2));
            // The foreign key violation on user_id should be much rarer now.
            if (insertOrderError.code === '23503' && insertOrderError.message.includes('service_orders_user_id_fkey')) {
                console.error(`SERVICE-ORDER: FK VIOLATION! User ${userIdFromJwt} not found in public.users. Sync function might have failed or user was deleted from public.users manually.`);
                return { statusCode: 500, body: JSON.stringify({ message: "Order creation failed due to user profile inconsistency. Please try logging out and in again, or contact support."})};
            }
            return { statusCode: 500, body: JSON.stringify({ message: 'Failed to record inquiry.', internal_code: insertOrderError.code }) };
        }
        return { statusCode: 200, body: JSON.stringify({ message: 'Inquiry received!', orderId: data?.[0]?.id }) };
    } catch (unexpectedError) { /* ... */ }
};