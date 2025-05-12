// functions/update-service-order-status.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const { user } = context.clientContext;
    const validUpdateRoles = ['order_manager', 'ceo']; // Only these roles can update

    if (!user || !user.app_metadata.roles || !user.app_metadata.roles.some(role => validUpdateRoles.includes(role))) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized to update status' }) };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) { /* ... */ }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" })};
    }
    
    const { orderId, newStatus } = requestBody;
    const validStatuses = ['new', 'in-progress', 'completed', 'rejected'];

    if (!orderId || !newStatus || !validStatuses.includes(newStatus)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid orderId or newStatus' }) };
    }

    try {
        const { data, error } = await supabase
            .from('service_orders')
            .update({ 
                status: newStatus, 
                last_updated_by: user.id, // Track who updated
                last_updated_at: new Date().toISOString() 
            })
            .eq('id', orderId)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' })};
        }
        return { statusCode: 200, body: JSON.stringify(data[0]) };
    } catch (error) {
        console.error('Error updating order status:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update order status', details: error.message }) };
    }
};