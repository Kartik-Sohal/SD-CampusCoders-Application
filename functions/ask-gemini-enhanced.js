// functions/ask-gemini-enhanced.js

const KNOWLEDGE_BASE_PUBLIC = `
Company Name: SD CampusCoders
Location: SD College, Hoshiarpur
Mission: We are passionate about developing cutting-edge web solutions and supporting BCA students. We aim to shape the future with innovative minds. We empower BCA students through real-world projects.
Core Activities: Developing web solutions, supporting BCA students.
Why Join Us:
- Innovative Projects: Work on cutting-edge projects that make a real impact. We encourage creativity and out-of-the-box thinking.
- Supportive Team: Join a collaborative and inclusive environment where everyone's voice is heard and valued. We grow together.
- Growth & Learning: We invest in your development with opportunities for learning, skill enhancement, and career progression.
How to Apply: Interested candidates can apply through the form on our careers page. Key information includes full name, email, position, and resume.
Values: Innovation, collaboration, student empowerment, growth.
Technology Stack (example): HTML, CSS, JavaScript, Tailwind CSS, Netlify, Supabase, Google Gemini AI.
`;

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set in environment variables.");
        return { statusCode: 500, body: JSON.stringify({ error: "AI service configuration error." }) };
    }

    let userQuery;
    try {
        const requestBody = JSON.parse(event.body);
        userQuery = requestBody.userQuery;
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body." }) };
    }

    if (!userQuery) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing userQuery' }) };
    }

    const { user } = context.clientContext; // User object from Netlify Identity (if token sent)
    let isCEO = false;
    let systemPrompt;
    let userName = "User"; 

    if (user && user.app_metadata && user.app_metadata.roles && user.app_metadata.roles.includes('ceo')) {
        isCEO = true;
        userName = user.user_metadata && user.user_metadata.full_name ? user.user_metadata.full_name : (user.email || "CEO");
        console.log(`Chatbot (Enhanced): CEO (${userName}) identified.`);
    } else if (user) {
        userName = user.user_metadata && user.user_metadata.full_name ? user.user_metadata.full_name : (user.email || "Authenticated User");
        console.log(`Chatbot (Enhanced): Authenticated user (${userName}) identified.`);
    } else {
        console.log("Chatbot (Enhanced): Unauthenticated guest user.");
    }

    if (isCEO) {
        systemPrompt = `
You are an advanced, highly capable AI assistant, currently assisting ${userName}, the CEO of SD CampusCoders.
Your primary directive is to answer ANY question the CEO asks, to the best of your ability, using your comprehensive general knowledge and reasoning skills.
You are NOT restricted to a specific knowledge base when interacting with the CEO.
Strive for accuracy, clarity, and provide detailed explanations or summaries as appropriate.
If you don't know something, clearly state that, but you can offer to speculate or suggest ways the CEO might find the information.
For context, SD CampusCoders is an initiative at SD College, Hoshiarpur, focused on web development projects and supporting BCA students.
        `;
    } else {
        systemPrompt = `
You are a friendly and helpful AI assistant for "SD CampusCoders".
Your primary goal is to answer questions based *ONLY* on the information provided in the "CONTEXT ABOUT SD CAMPUSCODERS" section below.
Do not use any external knowledge or make up information not present in this provided context.
If the user asks a question where the answer is not in the context, politely state that you don't have that specific information and suggest they check the official website or contact SD CampusCoders directly.
Keep your answers concise, professional, and relevant to SD CampusCoders.

CONTEXT ABOUT SD CAMPUSCODERS:
---
${KNOWLEDGE_BASE_PUBLIC}
---
        `;
    }

    const finalPrompt = `${systemPrompt}\n\n${userName}'s question is: "${userQuery}"\n\nAI Answer:`;
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const requestBodyToGemini = {
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: {
          temperature: isCEO ? 0.7 : 0.4, 
          maxOutputTokens: isCEO ? 1500 : 512,
          topP: isCEO ? 0.95 : 0.9,
          // topK: isCEO ? 0 : 40 // topK can be 0 for Gemini 1.5 to disable it
        }
    };
     if (isCEO) { // Only set topK if not CEO and you want it
        // requestBodyToGemini.generationConfig.topK = 0; // for CEO, potentially allow wider sampling
    } else {
        requestBodyToGemini.generationConfig.topK = 40;
    }


    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBodyToGemini),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMsg = `Gemini API Error (${response.status})`;
            try { errorMsg = JSON.parse(errorText).error?.message || errorMsg; } catch(e) {/*ignore*/}
            console.error('Gemini API Error Details:', errorText);
            return { statusCode: response.status, body: JSON.stringify({ error: errorMsg }) };
        }

        const data = await response.json();
        let aiResponseText = "I encountered an issue and couldn't formulate a response.";

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            aiResponseText = data.candidates[0].content.parts[0].text;
        } else if (data.promptFeedback?.blockReason) {
            aiResponseText = `My response was blocked. Reason: ${data.promptFeedback.blockReason}. This might be due to safety settings. Please try rephrasing your question.`;
            if(data.promptFeedback.safetyRatings) {
                console.warn('AI response safety ratings:', data.promptFeedback.safetyRatings);
            }
        } else {
            console.warn("Unexpected AI response structure from Gemini API:", data);
        }

        return { statusCode: 200, body: JSON.stringify({ answer: aiResponseText.trim() }) };

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal error while calling the AI service.' }) };
    }
};