// functions/service-order-created.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { clientContext } = context;
    // MANDATORY LOGIN: If no user context from JWT, this is an unauthorized attempt
    if (!clientContext || !clientContext.user) {
        console.warn("Service Order: Unauthorized attempt - no user context.");
        return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized. Please log in to submit an order." }) };
    }
    const submittedByUserId = clientContext.user.id;
    console.log("Service Order: Request from user ID:", submittedByUserId);


    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase config missing in service-order-created.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error." }) };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let formData;
    try {
        formData = JSON.parse(event.body); // Expecting direct form data object now
    } catch (e) {
        console.error("Error parsing request body for service order:", e, "Body was:", event.body);
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body." }) };
    }
    
    console.log("Received Service Order Form Data:", formData);

    const orderData = {
        user_id: submittedByUserId, // Now guaranteed to be present
        customer_name: formData.name || clientContext.user.user_metadata.full_name || clientContext.user.email, // Prioritize form name
        customer_email: formData.email || clientContext.user.email, // Prioritize form email
        customer_phone: formData.phone || null,
        service_type: formData.service_type,
        project_details: formData.details,
        status: 'new', 
        raw_form_data: formData 
    };

    if (!orderData.customer_name || !orderData.customer_email || !orderData.service_type || !orderData.project_details) {
        console.error("Missing required fields in service order:", orderData);
        return { statusCode: 400, body: JSON.stringify({ error: "Missing required order fields. Please fill out all required parts of the form." }) };
    }

    try {
        const { data, error } = await supabase
            .from('service_orders')
            .insert([orderData])
            .select();

        if (error) {
            console.error('Supabase error inserting service order:', error);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to save your service inquiry.", details: error.message }) };
        }

        console.log('Service order saved to Supabase:', data ? data[0] : "No data returned");
        return { statusCode: 200, body: JSON.stringify({ message: "Your inquiry has been successfully submitted! We will contact you soon.", orderId: data ? data[0].id : null }) };

    } catch (err) {
        console.error('Error in service-order-created function:', err);
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred while processing your inquiry." }) };
    }
};