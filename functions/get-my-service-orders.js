// functions/get-my-service-orders.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const { clientContext } = context; // Get the clientContext
    const user = clientContext ? clientContext.user : null; // Extract user from clientContext

    // --- DETAILED LOGGING FOR DEBUGGING ---
    console.log("--- get-my-service-orders INVOCATION ---");
    console.log("Event Received:", JSON.stringify(event, null, 2));
    console.log("Full clientContext:", JSON.stringify(clientContext, null, 2));
    if (user) {
        console.log("User object from clientContext:", JSON.stringify(user, null, 2));
        console.log("User ID (user.id):", user.id);
        console.log("User Subject (user.sub):", user.sub);
        console.log("User App Metadata (user.app_metadata):", JSON.stringify(user.app_metadata, null, 2));
        console.log("User User Metadata (user.user_metadata):", JSON.stringify(user.user_metadata, null, 2));
        console.log("User Email:", user.email);
    } else {
        console.log("No user object found in clientContext.");
    }
    // --- END DETAILED LOGGING ---

    if (!user) {
        console.error("get-my-service-orders: Unauthorized - No user object in clientContext.");
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: 'Unauthorized: You must be logged in to view your orders. User context not found.' }) 
        };
    }

    // Try user.id first, then user.sub as a fallback, which is standard for JWT subject
    const userIdToQuery = user.id || user.sub; 

    if (!userIdToQuery) {
        console.error("get-my-service-orders: Unauthorized - User identifier (id or sub) is missing from user object.");
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: 'Unauthorized: User identifier could not be determined.' }) 
        };
    }
    console.log(`get-my-service-orders: Determined userIdToQuery: ${userIdToQuery}`);


    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("get-my-service-orders: Supabase URL or Service Key missing.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        console.log(`get-my-service-orders: Fetching orders for user ID: ${userIdToQuery}`);
        
        const { data, error } = await supabase
            .from('service_orders')
            .select('id, created_at, service_type, project_details, status') 
            .eq('user_id', userIdToQuery) 
            .order('created_at', { ascending: false }); 

        if (error) {
            console.error('get-my-service-orders: Supabase error fetching user orders:', JSON.stringify(error, null, 2));
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to retrieve your orders due to a database error.' }) };
        }

        console.log(`get-my-service-orders: Found ${data ? data.length : 0} orders for user ID: ${userIdToQuery}`);
        return { statusCode: 200, body: JSON.stringify(data || []) };

    } catch (error) {
        console.error('get-my-service-orders: Unexpected error in function execution:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch your orders due to an unexpected server error.' }) };
    }
};