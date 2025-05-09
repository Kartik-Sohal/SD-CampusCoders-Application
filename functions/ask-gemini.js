// functions/ask-gemini.js

exports.handler = async function(event, context) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set in environment variables.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "AI service configuration error. API key missing." }),
        };
    }

    // --- TEMPORARY CODE TO LIST MODELS ---
    try {
        // Note: For ListModels, you generally don't specify a model in the URL path itself.
        const LIST_MODELS_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;

        console.log(`Attempting to fetch available models from: ${LIST_MODELS_URL}`); // For Netlify logs

        const response = await fetch(LIST_MODELS_URL, {
            method: 'GET', // ListModels is a GET request
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const responseText = await response.text(); // Get raw text first for debugging
        console.log("Raw ListModels Response Status:", response.status);
        // Avoid logging the full responseText here if it contains sensitive info or is too long for logs
        // console.log("Raw ListModels Response Text:", responseText);


        if (!response.ok) {
            let errorDetails;
            try {
                errorDetails = JSON.parse(responseText); // Attempt to parse error
            } catch (e) {
                // If parsing fails, use the raw text
                errorDetails = { message: "Failed to parse JSON error response from ListModels", rawResponse: responseText };
            }
            console.error('ListModels API Error Status:', response.status);
            console.error('ListModels API Error Details:', errorDetails);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: `Failed to list models. HTTP Status: ${response.status}`,
                    details: errorDetails
                }),
            };
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Error parsing successful JSON from ListModels:", e);
            console.error("Raw successful response text was:", responseText); // Log raw text if JSON parsing fails
             return {
                statusCode: 500,
                body: JSON.stringify({
                    error: `Failed to parse successful JSON response from ListModels.`,
                    details: e.message,
                    rawResponse: responseText // Include raw response for debugging
                }),
            };
        }

        // This log is crucial for you to see in Netlify Function logs
        console.log("Successfully fetched models. Full data:", JSON.stringify(data, null, 2));

        // Return the list of models to the frontend so you can see it (optional, logs are primary)
        return {
            statusCode: 200,
            // The actual models are usually in a 'models' array within the response object
            body: JSON.stringify({ availableModels: data.models || data }),
        };

    } catch (error) {
        console.error('Critical error in Netlify function (ListModels):', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error while attempting to list models.', details: error.message, stack: error.stack }),
        };
    }
    // --- END TEMPORARY CODE ---
};