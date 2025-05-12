// functions/get-my-service-orders.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const { user } = context.clientContext; // User object from Netlify Identity JWT

    // If no user context, they are not logged in or token is invalid
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: You must be logged in to view your orders.' }) };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Using service key for simplicity here
    // OR, if RLS is perfectly set for 'authenticated' role with `auth.uid() = user_id`:
    // const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; 
    // And then use anonKey, but serviceKey is fine if this function is only called by authenticated users.

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL or Service Key missing in get-my-service-orders.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Fetch orders where the user_id matches the currently logged-in user's ID
        // This relies on the RLS policy: `CREATE POLICY "Allow users to read their own service orders" ON service_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);`
        // If using service_role key, RLS is bypassed, so the WHERE clause is critical.
        // If using anon_key, RLS is enforced.
        
        const { data, error } = await supabase
            .from('service_orders')
            .select('id, created_at, service_type, project_details, status') // Select specific columns
            .eq('user_id', user.id) // Filter by the logged-in user's ID
            .order('created_at', { ascending: false }); // Show most recent orders first

        if (error) {
            console.error('Supabase error fetching user orders:', error);
            throw error;
        }

        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        console.error('Error in get-my-service-orders function:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch your orders.', details: error.message }) };
    }
};