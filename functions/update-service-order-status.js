// functions/update-service-order-status.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event, context) => {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("UPDATE-ORDER-STATUS: Supabase config missing.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" })};
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user } = context.clientContext;
    const validUpdateRoles = ['order_manager', 'ceo'];

    if (!user || !user.sub || !user.app_metadata?.roles || !user.app_metadata.roles.some(role => validUpdateRoles.includes(role))) {
        console.warn("UPDATE-ORDER-STATUS: Unauthorized attempt to update status. User:", user ? user.email : 'No user', "Roles:", user?.app_metadata?.roles);
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized to update order status' }) };
    }
    const updaterUserId = user.sub; // ID of the manager/CEO making the update

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (e) {
        console.error("UPDATE-ORDER-STATUS: Invalid JSON body", event.body);
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" })};
    }
    
    const { orderId, newStatus } = requestBody;
    const validStatuses = ['new', 'in-progress', 'completed', 'rejected'];

    if (!orderId || !newStatus || !validStatuses.includes(newStatus.toLowerCase())) {
        console.warn("UPDATE-ORDER-STATUS: Invalid orderId or newStatus provided.", requestBody);
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid orderId or newStatus specified.' }) };
    }

    const normalizedNewStatus = newStatus.toLowerCase();

    // Data to update in the service_orders table
    const updatePayload = { 
        status: normalizedNewStatus, 
        last_updated_by: updaterUserId, 
        last_updated_at: new Date().toISOString() 
    };
    console.log(`UPDATE-ORDER-STATUS: Attempting to update order ${orderId} with payload:`, updatePayload);

    try {
        const { data, error } = await supabase
            .from('service_orders')
            .update(updatePayload) // Pass the object with all fields to update
            .eq('id', orderId)
            .select(); // Important: .select() to get the updated row(s) back

        if (error) {
            console.error(`UPDATE-ORDER-STATUS: Supabase error updating order ${orderId}:`, JSON.stringify(error, null, 2));
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update order status due to a database error.', details: error.message }) };
        }

        if (!data || data.length === 0) {
            console.warn(`UPDATE-ORDER-STATUS: Order with ID ${orderId} not found for update.`);
            return { statusCode: 404, body: JSON.stringify({ error: 'Order not found or no changes made.' })};
        }

        console.log(`UPDATE-ORDER-STATUS: Order ${orderId} status updated successfully by ${updaterUserId}. Updated data:`, data[0]);
        return { statusCode: 200, body: JSON.stringify(data[0]) }; // Return the updated order

    } catch (unexpectedError) {
        console.error(`UPDATE-ORDER-STATUS: Unexpected error updating order ${orderId}:`, unexpectedError);
        return { statusCode: 500, body: JSON.stringify({ error: 'An unexpected server error occurred while updating order status.' }) };
    }
};