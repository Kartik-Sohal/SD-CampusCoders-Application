// script.js
// ... (all your existing code above the AI Chat Widget Logic) ...

// --- AI Chat Widget Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // ... (your existing DOMContentLoaded code like currentYear, fade-in sections) ...

    const chatToggleButton = document.getElementById('ai-chat-toggle-button');
    const chatWidgetContainer = document.getElementById('ai-chat-widget-container');
    const chatCloseButton = document.getElementById('ai-chat-close-button');
    const chatLog = document.getElementById('ai-chat-log');
    const chatInput = document.getElementById('ai-chat-input');
    const chatSendButton = document.getElementById('ai-chat-send-button');

    if (chatToggleButton && chatWidgetContainer && chatCloseButton && chatLog && chatInput && chatSendButton) {
        
        chatToggleButton.addEventListener('click', () => {
            chatWidgetContainer.classList.toggle('hidden');
            chatWidgetContainer.classList.toggle('flex');
            if (!chatWidgetContainer.classList.contains('hidden')) {
                chatInput.focus();
                if (chatLog.children.length === 0) {
                    // For this test, we won't add the welcome message, or you can keep it.
                    // addMessageToLog("Hi! I'm the SD CampusCoders AI. How can I help you today?", 'ai');
                    addMessageToLog("Ready to list models. Send any message to trigger.", 'ai-status');
                }
            }
        });

        chatCloseButton.addEventListener('click', () => {
            chatWidgetContainer.classList.add('hidden');
            chatWidgetContainer.classList.remove('flex');
        });

        chatSendButton.addEventListener('click', handleSendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
            }
        });

        function escapeHTML(str) {
            // Simple escape, consider a library for more robust needs
            return String(str).replace(/[&<>"']/g, function (match) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[match];
            });
        }


        function addMessageToLog(message, sender = 'user', isLoading = false) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('p-2.5', 'rounded-lg', 'max-w-[85%]', 'text-sm', 'leading-relaxed', 'break-words'); // Added break-words
            
            let sanitizedMessage = typeof message === 'string' ? escapeHTML(message) : JSON.stringify(message, null, 2);

            if (sender === 'user') {
                messageDiv.classList.add('bg-indigo-500', 'text-white', 'self-end', 'ml-auto');
                messageDiv.innerHTML = sanitizedMessage;
            } else if (sender === 'ai') {
                messageDiv.classList.add('bg-slate-700', 'text-slate-200', 'self-start', 'mr-auto');
                // For displaying JSON from ListModels, wrap in <pre>
                messageDiv.innerHTML = `<pre>${sanitizedMessage}</pre>`;
            } else if (sender === 'ai-loading' || sender === 'ai-status') {
                messageDiv.classList.add('bg-slate-700', 'text-slate-400', 'self-start', 'mr-auto', 'italic');
                messageDiv.innerHTML = `<i>${sanitizedMessage}</i>`;
                if (sender === 'ai-loading') messageDiv.id = 'ai-loading-message';
            } else if (sender === 'ai-error') {
                messageDiv.classList.add('bg-red-700', 'text-red-100', 'self-start', 'mr-auto');
                messageDiv.innerHTML = `<strong>Error:</strong> <pre>${sanitizedMessage}</pre>`;
            }

            chatLog.appendChild(messageDiv);
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        async function handleSendMessage() {
            const userQuery = chatInput.value.trim();
            // We don't even need the userQuery for ListModels, but we'll send something generic
            // if (!userQuery) return; // Allow empty send for this test

            addMessageToLog(userQuery || "(Triggering ListModels...)", 'user');
            chatInput.value = '';
            chatInput.disabled = true;
            chatSendButton.disabled = true;
            
            const existingLoadingMessage = document.getElementById('ai-loading-message');
            if (existingLoadingMessage) existingLoadingMessage.remove();
            addMessageToLog('Fetching model list...', 'ai-loading');

            try {
                // The Netlify function is now modified to always call ListModels
                const response = await fetch('/.netlify/functions/ask-gemini', {
                    method: 'POST', // The temp function doesn't check method, but good to be consistent
                    headers: { 'Content-Type': 'application/json' },
                    // Body is not strictly needed by the temp function, but send an empty object or dummy
                    body: JSON.stringify({ query: "list_models_request" }),
                });

                const loadingMessage = document.getElementById('ai-loading-message');
                if (loadingMessage) loadingMessage.remove();

                const responseDataText = await response.text(); // Get text first to handle non-JSON errors
                let data;
                try {
                    data = JSON.parse(responseDataText);
                } catch (e) {
                    // If response is not JSON, it's likely an error HTML page or non-JSON error
                     addMessageToLog(`Non-JSON response (Status ${response.status}): ${escapeHTML(responseDataText.substring(0, 500))}`, 'ai-error'); // Show first 500 chars
                    console.error("Non-JSON response from function:", responseDataText);
                    return;
                }


                if (!response.ok || data.error) { // Check for HTTP error or error in JSON body
                    console.error("Error from AI service (ListModels):", data);
                    addMessageToLog(data.error || `HTTP Error ${response.status}: ${JSON.stringify(data.details || data)}`, 'ai-error');
                    return;
                }
                
                // Successfully got data, display it (data.availableModels should contain the list)
                addMessageToLog(data.availableModels || data, 'ai'); // data.availableModels is what the temp function returns

            } catch (error) {
                console.error('Error sending message to ListModels function:', error);
                const loadingMessage = document.getElementById('ai-loading-message');
                if (loadingMessage) loadingMessage.remove();
                addMessageToLog(`Client-side error: ${error.message}`, 'ai-error');
            } finally {
                chatInput.disabled = false;
                chatSendButton.disabled = false;
                chatInput.focus();
            }
        }
    } else {
        console.warn("AI Chat widget elements not found. Chat functionality will be disabled.");
    }
});
// --- End AI Chat Widget Logic ---