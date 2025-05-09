// functions/submission-created.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for backend operations

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL or Service Key is missing from environment variables.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error." }) };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { payload } = JSON.parse(event.body); // Netlify form submission payload

    // console.log("Received form submission payload:", payload.data); // Log for debugging

    // Map your Netlify form field names to your Supabase column names
    // Ensure these 'payload.data.<key>' match the 'name' attributes in your HTML form <input> tags
    const applicationData = {
        name: payload.data.name,
        email: payload.data.email,
        phone: payload.data.phone || null,
        position: payload.data.position,
        linkedin: payload.data.linkedin || null,
        // For file uploads, Netlify provides a URL to the uploaded file if "Asset optimization" is enabled for forms,
        // or it provides an object with filename, size, type, url.
        // Let's assume 'resume' is the name of your file input field.
        // If Netlify makes 'resume' an object with a URL property:
        // resume_data: payload.data.resume && payload.data.resume.url ? { url: payload.data.resume.url, filename: payload.data.resume.filename, size: payload.data.resume.size, type: payload.data.resume.type } : null,
        // If Netlify just gives a string URL for 'resume':
        resume_data: payload.data.resume ? { url: payload.data.resume, filename: 'resume_file' } : null, // Adjust this based on Netlify's payload for files
        cover_letter: payload.data['cover-letter'] || null, // Note: hyphenated names need bracket notation
        status: 'pending', // Default status
        submitted_data_raw: payload.data // Store the whole raw payload for reference
    };

    // A quick check to ensure essential data is present
    if (!applicationData.name || !applicationData.email || !applicationData.position) {
        console.error("Missing essential fields from payload:", payload.data);
        return { statusCode: 400, body: JSON.stringify({ error: "Missing required form fields in submission." }) };
    }


    try {
        const { data, error } = await supabase
            .from('applications') // Your table name in Supabase
            .insert([applicationData])
            .select(); // .select() to get the inserted row back for confirmation

        if (error) {
            console.error('Supabase insert error:', error);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to save application to database.", details: error.message }) };
        }

        console.log('Application saved to Supabase:', data);
        return { statusCode: 200, body: JSON.stringify({ message: "Application submitted and saved successfully.", data: data }) };

    } catch (err) {
        console.error('Error in submission-created function:', err);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error during submission processing." }) };
    }
};