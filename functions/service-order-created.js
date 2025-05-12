// functions/service-order-created.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { clientContext } = context;
    const user = clientContext ? clientContext.user : null;

    // --- DETAILED LOGGING FOR DEBUGGING ---
    console.log("--- service-order-created INVOCATION ---");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Event Headers:", JSON.stringify(event.headers, null, 2)); // Check for Authorization header here
    // console.log("Full clientContext:", JSON.stringify(clientContext, null, 2)); // Can be very verbose
    if (user) {
        console.log("User object from clientContext is PRESENT.");
        console.log("User object details:", JSON.stringify(user, null, 2));
        console.log("User ID (user.id):", user.id);
        console.log("User Subject (user.sub):", user.sub); // Standard JWT subject claim
        console.log("User Email:", user.email);
    } else {
        console.log("No user object (null or undefined) found in clientContext for service order.");
    }
    // --- END DETAILED LOGGING ---

    if (!user) {
        console.error("Service Order Create: Unauthorized - No user object in clientContext.");
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: "Unauthorized. Please log in to submit an order. (User context not found in function)" }) 
        };
    }

    // Prioritize user.id, fallback to user.sub (standard JWT 'subject' claim)
    const submittedByUserId = user.id || user.sub; 

    if (!submittedByUserId) {
        console.error("Service Order Create: User context was present, but a usable User ID (user.id or user.sub) is missing/undefined.");
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: "Unauthorized. Could not determine your user identifier. Please try logging out and back in." }) 
        };
    }
    console.log(`Service Order Create: Determined submittedByUserId: ${submittedByUserId}`);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Service Order Create: Supabase URL or Service Key environment variables are missing.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error prevents saving your order." }) };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let formData;
    try {
        formData = JSON.parse(event.body);
        console.log("Service Order Create: Parsed formData from event.body:", JSON.stringify(formData, null, 2));
    } catch (e) {
        console.error("Service Order Create: Error parsing JSON request body:", e, "Raw Body:", event.body);
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid request format. Please ensure data is sent correctly." }) };
    }
    
    const orderData = {
        user_id: submittedByUserId, 
        customer_name: formData.name || (user.user_metadata && user.user_metadata.full_name) || user.email,
        customer_email: formData.email || user.email,
        customer_phone: formData.phone || null,
        service_type: formData.service_type,
        project_details: formData.details,
        status: 'new', 
        raw_form_data: formData 
    };

    if (!orderData.customer_name || !orderData.customer_email || !orderData.service_type || !orderData.project_details) {
        console.error("Service Order Create: Missing required fields in the processed orderData:", JSON.stringify(orderData, null, 2));
        return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields. Please ensure all parts of the order form are filled." }) };
    }

    try {
        console.log("Service Order Create: Attempting to insert into Supabase with orderData:", JSON.stringify(orderData, null, 2));
        const { data, error } = await supabase
            .from('service_orders')
            .insert([orderData])
            .select(); // Important to get the inserted row back, or at least an ID

        if (error) {
            console.error('Service Order Create: Supabase insert error:', JSON.stringify(error, null, 2));
            // Do not expose detailed Supabase error `message` directly to client in production
            return { statusCode: 500, body: JSON.stringify({ error: "We encountered an issue saving your service inquiry. Please try again later.", internal_code: error.code }) };
        }

        const insertedOrder = data && data.length > 0 ? data[0] : null;
        console.log('Service Order Create: Service order successfully saved to Supabase. Inserted data:', JSON.stringify(insertedOrder, null, 2));
        return { 
            statusCode: 200, 
            body: JSON.stringify({ 
                message: "Your service inquiry has been successfully submitted! We will be in touch with you soon.", 
                orderId: insertedOrder ? insertedOrder.id : null 
            }) 
        };

    } catch (err) {
        console.error('Service Order Create: Unexpected error during Supabase operation or response generation:', err);
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred while processing your inquiry. Please try again." }) };
    }
};