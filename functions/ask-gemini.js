// functions/ask-gemini.js

// Define your company's knowledge base here
const KNOWLEDGE_BASE = `
Company Name: SD CampusCoders
Location: SD College, Hoshiarpur
Mission: We are passionate about developing cutting-edge web solutions and supporting BCA students. We aim to shape the future with innovative minds. We empower BCA students through real-world projects.
Core Activities: Developing web solutions, supporting BCA students.
Why Join Us:
- Innovative Projects: Work on cutting-edge projects that make a real impact. We encourage creativity and out-of-the-box thinking.
- Supportive Team: Join a collaborative and inclusive environment where everyone's voice is heard and valued. We grow together.
- Growth & Learning: We invest in your development with opportunities for learning, skill enhancement, and career progression.
How to Apply: Interested candidates can apply through the form on our careers page. We look for full name, email, phone (optional), position applying for (or general application), LinkedIn (optional), resume/CV, and a cover letter (optional).
Values: Innovation, collaboration, student empowerment, growth.
Team Focus: Dynamic team of BCA students and mentors.
Technology Stack (example, add more if known): HTML, CSS, JavaScript, Tailwind CSS, Netlify.
Project Types: Real-world web development projects.
Target Audience for Support: BCA students at SD College, Hoshiarpur.
`;

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set in environment variables.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "AI service configuration error. API key missing." }),
        };
    }

    try {
        const { userQuery } = JSON.parse(event.body);
        if (!userQuery) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing userQuery' }) };
        }

        // Using gemini-1.5-flash-latest model
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

        const prompt = `
You are a friendly and helpful AI assistant for "SD CampusCoders".
Your primary goal is to answer questions based *only* on the information provided below about SD CampusCoders.
Do not use any external knowledge or make up information.
If the user asks a question where the answer is not in the provided information, politely state that you don't have that specific information and suggest they check the website or contact SD CampusCoders directly for more details.
Keep your answers concise and relevant.

Provided Information about SD CampusCoders:
---
${KNOWLEDGE_BASE}
---

User's question: "${userQuery}"

Answer:`;

        const requestBody = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            // Optional: Add generationConfig if needed for Flash models
            // generationConfig: {
            //   temperature: 0.7, // Adjust for creativity vs. factuality (0.0 to 1.0 for Flash)
            //   maxOutputTokens: 2048, // Flash supports up to 8192, but 2048 is often plenty for chat
            //   topP: 0.95,
            //   topK: 40
            // }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json(); // Attempt to parse error response
            console.error('Gemini API Error Status:', response.status);
            console.error('Gemini API Error Body:', errorData);
            let errorMessage = `Failed to get response from AI service (Status: ${response.status}).`;
            if (errorData.error && errorData.error.message) {
                errorMessage = errorData.error.message;
            }
            return { statusCode: response.status, body: JSON.stringify({ error: errorMessage, details: errorData }) };
        }

        const data = await response.json();

        let aiResponseText = "Sorry, I couldn't formulate a response at this moment.";
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
            aiResponseText = data.candidates[0].content.parts[0].text;
        } else if (data.promptFeedback && data.promptFeedback.blockReason) {
            aiResponseText = `I couldn't process that request. Reason: ${data.promptFeedback.blockReason}. Please try rephrasing.`;
            if (data.promptFeedback.safetyRatings) {
                 aiResponseText += ` Safety concerns: ${JSON.stringify(data.promptFeedback.safetyRatings)}`;
            }
            console.warn('AI response blocked:', data.promptFeedback);
        } else {
            // Log unexpected response structure for debugging
            console.warn("Unexpected AI response structure from Gemini API:", JSON.stringify(data, null, 2));
        }


        return {
            statusCode: 200,
            body: JSON.stringify({ answer: aiResponseText.trim() }),
        };

    } catch (error) {
        console.error('Critical error in Netlify function ask-gemini:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error in AI function.', details: error.message, stack: error.stack }),
        };
    }
};