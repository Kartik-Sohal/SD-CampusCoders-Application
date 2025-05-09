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

    console.log("Received form submission payload:", payload.data);

    // Map your Netlify form field names to your Supabase column names
    // Netlify form names are usually what you set in the 'name' attribute of your <input> tags.
    const applicationData = {
        name: payload.data.name,
        email: payload.data.email,
        phone: payload.data.phone || null, // Handle optional fields
        position: payload.data.position,
        linkedin: payload.data.linkedin || null,
        // For file uploads from Netlify forms, 'resume' might contain URL or just filename.
        // Netlify itself handles storing the file. You might store the URL if available.
        // For now, let's assume payload.data.resume exists.
        resume_data: payload.data.resume ? { url: payload.data.resume, name: payload.data.resume.filename || 'resume_file' } : null,
        cover_letter: payload.data['cover-letter'] || null, // Note: hyphenated names need bracket notation
        status: 'pending', // Default status
        submitted_data_raw: payload.data // Store the whole raw payload for reference
    };

    try {
        const { data, error } = await supabase
            .from('applications')
            .insert([applicationData])
            .select(); // .select() to get the inserted row back

        if (error) {
            console.error('Supabase insert error:', error);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to save application to database.", details: error.message }) };
        }

        console.log('Application saved to Supabase:', data);
        return { statusCode: 200, body: JSON.stringify({ message: "Application submitted and saved.", data: data }) };

    } catch (err) {
        console.error('Error in submission-created function:', err);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error during submission processing." }) };
    }
};