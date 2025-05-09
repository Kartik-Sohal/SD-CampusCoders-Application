// functions/get-pending-applications.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
    // 1. Check if the user is authenticated and has the 'ceo' role
    const { user } = context.clientContext;
    if (!user || !user.app_metadata.roles || !user.app_metadata.roles.includes('ceo')) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: "Unauthorized: CEO access required." }),
        };
    }

    // 2. Ensure it's a GET request
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // 3. Connect to Supabase (using service key for now, for simplicity in RLS setup)
    //    Ideally, for reads by authenticated users, you'd use anon key and RLS policies.
    //    But since this is a CEO-only function, service key is acceptable here.
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL or Service Key is missing.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error." }) };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 4. Fetch pending applications
        const { data, error } = await supabase
            .from('applications')
            .select('*') // Select all columns
            .eq('status', 'pending') // Filter by status
            .order('created_at', { ascending: true }); // Show oldest pending first

        if (error) {
            console.error('Supabase error fetching pending applications:', error);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch applications.", details: error.message }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data), // Send the array of applications
        };

    } catch (err) {
        console.error('Error in get-pending-applications function:', err);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error." }) };
    }
};