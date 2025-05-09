document.addEventListener('DOMContentLoaded', () => { // Ensure DOM is loaded

    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    // Simple fade-in on scroll
    const sections = document.querySelectorAll('.fade-in-section');
    if (sections.length > 0) {
        const observerOptions = {
            root: null, // relative to document viewport
            rootMargin: '0px',
            threshold: 0.1 // 10% of item is visible
        };

        const observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // observerInstance.unobserve(entry.target); // Optional: stop observing after it's visible
                } else {
                    // Optional: remove class if you want it to fade out when scrolling back up
                    // entry.target.classList.remove('is-visible');
                }
            });
        }, observerOptions);

        sections.forEach(section => {
            observer.observe(section);
        });
    }

    // Optional: Netlify form success message handling
    // const form = document.querySelector('form[name="application"]');
    // if (form && window.location.search.includes('status=success')) {
    //     const successMessage = document.createElement('p');
    //     successMessage.textContent = 'Thank you! Your application has been submitted successfully.';
    //     successMessage.className = 'text-green-500 p-4 bg-green-100 rounded-md my-4';
    //     form.parentNode.insertBefore(successMessage, form);
    //     form.reset(); // Clear the form
    // }

    // --- AI Chat Widget Logic ---
    const chatToggleButton = document.getElementById('ai-chat-toggle-button');
    const chatWidgetContainer = document.getElementById('ai-chat-widget-container');
    const chatCloseButton = document.getElementById('ai-chat-close-button');
    const chatLog = document.getElementById('ai-chat-log');
    const chatInput = document.getElementById('ai-chat-input');
    const chatSendButton = document.getElementById('ai-chat-send-button');

    if (chatToggleButton && chatWidgetContainer && chatCloseButton && chatLog && chatInput && chatSendButton) {
        
        chatToggleButton.addEventListener('click', () => {
            chatWidgetContainer.classList.toggle('hidden');
            chatWidgetContainer.classList.toggle('flex'); // Use flex for layout
            if (!chatWidgetContainer.classList.contains('hidden')) {
                chatInput.focus();
                 // Add initial welcome if chat is empty and widget is opened
                if (chatLog.children.length === 0) {
                    addMessageToLog("Hi! I'm the SD CampusCoders AI. How can I help you today?", 'ai');
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
                e.preventDefault(); // Prevent form submission if inside one
                handleSendMessage();
            }
        });

        function escapeHTML(str) {
            // A more robust HTML escaping function
            if (typeof str !== 'string') return ''; // Handle non-string inputs
            return str.replace(/[&<>"']/g, function (match) {
                switch (match) {
                    case '&': return '&amp;';
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '"': return '&quot;';
                    case "'": return '&#39;'; // or &apos;
                    default: return match;
                }
            });
        }


        function addMessageToLog(message, sender = 'user') {
            const messageDiv = document.createElement('div');
            // Common classes for all message bubbles
            messageDiv.classList.add('p-2.5', 'rounded-lg', 'max-w-[85%]', 'text-sm', 'leading-relaxed', 'break-words', 'shadow-md');
            
            // Sanitize message content before inserting as HTML
            const sanitizedMessage = escapeHTML(message);

            if (sender === 'user') {
                messageDiv.classList.add('bg-indigo-600', 'text-white', 'self-end', 'ml-auto');
                messageDiv.innerHTML = sanitizedMessage;
            } else if (sender === 'ai') {
                messageDiv.classList.add('bg-slate-700', 'text-slate-100', 'self-start', 'mr-auto');
                // Basic Markdown-like formatting for bold and newlines (after sanitization)
                let formattedMessage = sanitizedMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
                formattedMessage = formattedMessage.replace(/\n/g, '<br>'); // Newlines
                messageDiv.innerHTML = formattedMessage;
            } else if (sender === 'ai-loading') {
                messageDiv.classList.add('bg-slate-600', 'text-slate-300', 'self-start', 'mr-auto', 'italic');
                messageDiv.innerHTML = `<i>${sanitizedMessage}</i>`; // Already sanitized
                messageDiv.id = 'ai-loading-message'; // For easy removal
            } else if (sender === 'ai-error') {
                messageDiv.classList.add('bg-red-600', 'text-red-100', 'self-start', 'mr-auto');
                messageDiv.innerHTML = `<strong>Error:</strong> ${sanitizedMessage}`; // Already sanitized
            }

            chatLog.appendChild(messageDiv);
            chatLog.scrollTop = chatLog.scrollHeight; // Auto-scroll to the latest message
        }

        async function handleSendMessage() {
            const userQuery = chatInput.value.trim();
            if (!userQuery) return; // Don't send empty messages

            addMessageToLog(userQuery, 'user');
            chatInput.value = ''; // Clear input field
            chatInput.disabled = true;
            chatSendButton.disabled = true;
            
            // Remove previous loading message if any, then add new one
            const existingLoadingMessage = document.getElementById('ai-loading-message');
            if (existingLoadingMessage) {
                existingLoadingMessage.remove();
            }
            addMessageToLog('SD CampusCoders AI is thinking...', 'ai-loading');

            try {
                const response = await fetch('/.netlify/functions/ask-gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userQuery }),
                });

                // Remove the "Thinking..." message once response or error is received
                const loadingMessage = document.getElementById('ai-loading-message');
                if (loadingMessage) {
                    loadingMessage.remove();
                }

                if (!response.ok) {
                    let errorMsg = "Sorry, there was an issue connecting to the AI service.";
                    try {
                        // Try to parse the error response from the server
                        const errorData = await response.json();
                        errorMsg = errorData.error || (errorData.details && (errorData.details.error && errorData.details.error.message || JSON.stringify(errorData.details))) || `Server error: ${response.status}`;
                        console.error("Error from AI service function:", errorData);
                    } catch (e) {
                        // If parsing the error JSON fails, use the status text
                        console.error("Could not parse error JSON from AI service:", e);
                        errorMsg = `Server error: ${response.status} ${response.statusText}`;
                    }
                    addMessageToLog(errorMsg, 'ai-error');
                    return; // Exit after handling the error
                }

                // If response is OK, parse the successful JSON
                const data = await response.json();
                if (data.answer) {
                    addMessageToLog(data.answer, 'ai');
                } else {
                    addMessageToLog("Received an unexpected response from the AI.", 'ai-error');
                    console.warn("Unexpected data structure in AI response:", data);
                }

            } catch (error) {
                // Catch client-side errors (e.g., network failure)
                console.error('Client-side error sending message to AI function:', error);
                const loadingMessage = document.getElementById('ai-loading-message'); // Ensure it's removed on error too
                if (loadingMessage) {
                    loadingMessage.remove();
                }
                addMessageToLog('An unexpected error occurred. Please check your connection or try again later.', 'ai-error');
            } finally {
                // Re-enable input fields regardless of success or failure
                chatInput.disabled = false;
                chatSendButton.disabled = false;
                chatInput.focus(); // Set focus back to input field
            }
        }
    } else {
        console.warn("AI Chat widget elements not found in the DOM. Chat functionality will be disabled.");
    }
});
// --- End AI Chat Widget Logic ---