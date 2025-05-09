// Set current year in footer
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
                 // Add initial welcome if chat is empty
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
            const div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }

        function addMessageToLog(message, sender = 'user', isLoading = false) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('p-2.5', 'rounded-lg', 'max-w-[85%]', 'text-sm', 'leading-relaxed');
            
            const sanitizedMessage = escapeHTML(message); // Sanitize before inserting as HTML

            if (sender === 'user') {
                messageDiv.classList.add('bg-indigo-500', 'text-white', 'self-end', 'ml-auto');
                messageDiv.innerHTML = sanitizedMessage;
            } else if (sender === 'ai') {
                messageDiv.classList.add('bg-slate-700', 'text-slate-200', 'self-start', 'mr-auto');
                // Basic Markdown-like formatting for bold and lists
                let formattedMessage = sanitizedMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
                formattedMessage = formattedMessage.replace(/\n\s*-\s*(.*)/g, '<br>- $1'); // List items
                messageDiv.innerHTML = formattedMessage;
            } else if (sender === 'ai-loading') {
                messageDiv.classList.add('bg-slate-700', 'text-slate-400', 'self-start', 'mr-auto', 'italic');
                messageDiv.innerHTML = `<i>${sanitizedMessage}</i>`;
                messageDiv.id = 'ai-loading-message';
            } else if (sender === 'ai-error') {
                messageDiv.classList.add('bg-red-700', 'text-red-100', 'self-start', 'mr-auto');
                messageDiv.innerHTML = sanitizedMessage;
            }


            chatLog.appendChild(messageDiv);
            chatLog.scrollTop = chatLog.scrollHeight; // Auto-scroll
        }

        async function handleSendMessage() {
            const userQuery = chatInput.value.trim();
            if (!userQuery) return;

            addMessageToLog(userQuery, 'user');
            chatInput.value = '';
            chatInput.disabled = true;
            chatSendButton.disabled = true;
            
            // Remove previous loading message if any
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

                const loadingMessage = document.getElementById('ai-loading-message');
                if (loadingMessage) {
                    loadingMessage.remove();
                }

                if (!response.ok) {
                    let errorMsg = "Sorry, there was an issue connecting to the AI service.";
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.error || (errorData.details && errorData.details.error && errorData.details.error.message) || errorMsg;
                         console.error("Error from AI service:", errorData);
                    } catch (e) {
                        console.error("Error parsing error response:", e);
                        errorMsg = `Error: ${response.status} ${response.statusText}`;
                    }
                    addMessageToLog(errorMsg, 'ai-error');
                    return;
                }

                const data = await response.json();
                addMessageToLog(data.answer, 'ai');

            } catch (error) {
                console.error('Error sending message to AI function:', error);
                const loadingMessage = document.getElementById('ai-loading-message');
                if (loadingMessage) {
                    loadingMessage.remove();
                }
                addMessageToLog('An unexpected error occurred. Please try again later.', 'ai-error');
            } finally {
                chatInput.disabled = false;
                chatSendButton.disabled = false;
                chatInput.focus();
            }
        }
    } else {
        console.warn("AI Chat widget elements not found. Chat functionality will be disabled.");
    }
    // --- End AI Chat Widget Logic ---

});