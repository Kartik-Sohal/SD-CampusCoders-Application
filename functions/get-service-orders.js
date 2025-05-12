// functions/get-service-orders.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const { user } = context.clientContext;
    const validRoles = ['employee', 'order_manager', 'ceo'];

    if (!user || !user.app_metadata.roles || !user.app_metadata.roles.some(role => validRoles.includes(role))) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const statusFilter = event.queryStringParameters.status;

    try {
        let query = supabase.from('service_orders').select('*').order('created_at', { ascending: false });
        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }
        
        const { data, error } = await query;

        if (error) throw error;
        return { statusCode: 200, body: JSON.stringify(data) };
    } catch (error) {
        console.error('Error fetching service orders:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch orders', details: error.message }) };
    }
};