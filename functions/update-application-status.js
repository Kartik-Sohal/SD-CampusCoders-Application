// functions/update-application-status.js
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

    // 2. Ensure it's a POST request (or PUT, but POST is fine)
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // 3. Parse the request body
    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body." }) };
    }

    const { applicationId, newStatus } = requestBody;

    if (!applicationId || !newStatus) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing applicationId or newStatus in request body." }) };
    }

    const validStatuses = ['approved', 'denied', 'pending']; // Define valid statuses
    if (!validStatuses.includes(newStatus.toLowerCase())) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid status provided." }) };
    }

    // 4. Connect to Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL or Service Key is missing.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error." }) };
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 5. Update the application status in the database
        const { data, error } = await supabase
            .from('applications')
            .update({ status: newStatus.toLowerCase() })
            .eq('id', applicationId) // Ensure 'id' is the primary key of your 'applications' table
            .select(); // Get the updated row back

        if (error) {
            console.error('Supabase error updating application status:', error);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to update application status.", details: error.message }) };
        }

        if (!data || data.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: "Application not found with the given ID." }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Application status updated successfully.", updatedApplication: data[0] }),
        };

    } catch (err) {
        console.error('Error in update-application-status function:', err);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error." }) };
    }
};