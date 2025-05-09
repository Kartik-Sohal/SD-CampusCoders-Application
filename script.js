// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Existing General Site Logic ---
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    const sections = document.querySelectorAll('.fade-in-section');
    if (sections.length > 0) {
        const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('is-visible');
            });
        }, observerOptions);
        sections.forEach(section => observer.observe(section));
    }
    // --- End Existing General Site Logic ---

    // --- Helper function for HTML escaping ---
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, match => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[match]));
    };

    // --- Netlify Identity & CEO Dashboard Logic ---
    const ceoDashboardSection = document.getElementById('ceo-dashboard');
    const applicationsListDiv = document.getElementById('applications-list');
    const ceoLoadingMessage = document.getElementById('ceo-loading-message');
    const ceoNoApplicationsMessage = document.getElementById('ceo-no-applications-message');

    function displayCEOControls(user) {
        const isCEO = user && user.app_metadata && user.app_metadata.roles && user.app_metadata.roles.includes('ceo');
        if (ceoDashboardSection) {
            ceoDashboardSection.classList.toggle('hidden', !isCEO);
        }
        if (isCEO && applicationsListDiv) { // Check if applicationsListDiv exists before calling
            fetchAndDisplayPendingApplications(user);
        } else if (isCEO && !applicationsListDiv) {
            console.warn("applicationsListDiv not found, cannot fetch CEO applications.");
        }
    }

    async function fetchAndDisplayPendingApplications(user) {
        if (!applicationsListDiv || !ceoLoadingMessage || !ceoNoApplicationsMessage) {
            console.warn("CEO dashboard elements not fully found for fetching applications.");
            return;
        }

        applicationsListDiv.innerHTML = ''; 
        ceoLoadingMessage.classList.remove('hidden');
        ceoNoApplicationsMessage.classList.add('hidden');

        try {
            const token = await user.jwt(true); 
            const response = await fetch('/.netlify/functions/get-pending-applications', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            ceoLoadingMessage.classList.add('hidden');

            if (!response.ok) {
                const errorText = await response.text();
                let errorMsg = `Error ${response.status}: ${response.statusText}`;
                try { errorMsg = JSON.parse(errorText).error || errorMsg; } catch (e) { /* Ignore */ }
                console.error("Error loading applications:", errorMsg, "Raw response:", errorText);
                applicationsListDiv.innerHTML = `<p class="text-red-400 text-center">Error loading applications: ${escapeHTML(errorMsg)}</p>`;
                return;
            }

            const applications = await response.json();

            if (applications.length === 0) {
                ceoNoApplicationsMessage.classList.remove('hidden');
            } else {
                applications.forEach(app => {
                    const appCard = document.createElement('div');
                    appCard.className = 'bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700/50';
                    
                    let resumeLinkHTML = '<span class="text-slate-500">N/A</span>';
                    if (app.resume_data && typeof app.resume_data.url === 'string' && app.resume_data.url) {
                        resumeLinkHTML = `<a href="${escapeHTML(app.resume_data.url)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline">View Resume</a>`;
                    } else if (app.resume_data && typeof app.resume_data.filename === 'string') {
                         resumeLinkHTML = `<span class="text-slate-400">${escapeHTML(app.resume_data.filename)} (URL not available/processed)</span>`;
                    }

                    appCard.innerHTML = `
                        <div class="flex justify-between items-start mb-3">
                            <h3 class="text-xl font-semibold text-pink-400">${escapeHTML(app.name)}</h3>
                            <span class="text-xs text-slate-500">${new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                        <p class="text-slate-300 mb-1"><strong class="font-medium text-slate-100 w-20 inline-block">Email:</strong> ${escapeHTML(app.email)}</p>
                        <p class="text-slate-300 mb-1"><strong class="font-medium text-slate-100 w-20 inline-block">Position:</strong> ${escapeHTML(app.position)}</p>
                        ${app.phone ? `<p class="text-slate-300 mb-1"><strong class="font-medium text-slate-100 w-20 inline-block">Phone:</strong> ${escapeHTML(app.phone)}</p>` : ''}
                        ${app.linkedin ? `<p class="text-slate-300 mb-1"><strong class="font-medium text-slate-100 w-20 inline-block">LinkedIn:</strong> <a href="${app.linkedin.startsWith('http') ? '' : 'https://'}${escapeHTML(app.linkedin)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300">${escapeHTML(app.linkedin)}</a></p>` : ''}
                        <p class="text-slate-300 mb-3"><strong class="font-medium text-slate-100 w-20 inline-block">Resume:</strong> ${resumeLinkHTML}</p>
                        ${app.cover_letter ? `<div class="mt-2"><strong class="font-medium text-slate-100">Cover Letter:</strong><div class="text-slate-400 whitespace-pre-wrap bg-slate-700/50 p-3 rounded-md mt-1 text-sm">${escapeHTML(app.cover_letter)}</div></div>` : ''}
                        <div class="mt-6 flex space-x-3">
                            <button data-id="${app.id}" data-action="approved" class="ceo-action-btn bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 flex-1">Approve</button>
                            <button data-id="${app.id}" data-action="denied" class="ceo-action-btn bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 flex-1">Deny</button>
                        </div>
                    `;
                    applicationsListDiv.appendChild(appCard);
                });

                document.querySelectorAll('.ceo-action-btn').forEach(button => {
                    button.removeEventListener('click', handleApplicationAction);
                    button.addEventListener('click', handleApplicationAction);
                });
            }
        } catch (error) {
            console.error("Failed to fetch or display applications:", error);
            if (ceoLoadingMessage) ceoLoadingMessage.classList.add('hidden');
            if (applicationsListDiv) applicationsListDiv.innerHTML = `<p class="text-red-400 text-center">Error loading applications. See console for details.</p>`;
        }
    }

    async function handleApplicationAction(event) {
        const button = event.currentTarget;
        const applicationId = button.dataset.id;
        const newStatus = button.dataset.action;
        const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;

        if (!user || !applicationId || !newStatus) {
            console.error("Missing user, application ID, or new status for action.");
            return;
        }

        const card = button.closest('.bg-slate-800'); // Find the parent card
        const actionButtons = card ? card.querySelectorAll('.ceo-action-btn') : [button]; // Target buttons within the card or just the clicked one
        actionButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        });
        button.textContent = 'Processing...';

        try {
            const token = await user.jwt(true);
            const response = await fetch('/.netlify/functions/update-application-status', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ applicationId, newStatus })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
                alert(`Error updating status: ${errorData.error}`);
                actionButtons.forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                });
                 // Reset only the clicked button's text
                button.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                return;
            }
            
            if (card) {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95) translateY(-20px)';
                setTimeout(() => {
                    card.remove();
                    if (applicationsListDiv && applicationsListDiv.children.length === 0 && ceoNoApplicationsMessage) {
                        ceoNoApplicationsMessage.classList.remove('hidden');
                    }
                }, 500);
            } else {
                fetchAndDisplayPendingApplications(user); // Fallback if card isn't found
            }
        } catch (error) {
            console.error("Failed to update application status:", error);
            alert("An error occurred while updating. Please try again.");
            actionButtons.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            });
            button.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
        }
    }

    if (window.netlifyIdentity) {
        console.log("Netlify Identity widget script loaded.");
        window.netlifyIdentity.on('init', user => {
            console.log("Netlify Identity 'init' event. User:", user ? user.email : 'No user');
            displayCEOControls(user);
        });
        window.netlifyIdentity.on('login', user => {
            console.log("Netlify Identity 'login' event. User:", user.email);
            displayCEOControls(user);
            window.netlifyIdentity.close();
        });
        window.netlifyIdentity.on('logout', () => {
            console.log("Netlify Identity 'logout' event.");
            displayCEOControls(null);
        });
    } else {
        console.warn("Netlify Identity widget (window.netlifyIdentity) not available on DOMContentLoaded.");
    }
    // --- End Netlify Identity & CEO Dashboard Logic ---

    // --- AI Chat Widget Logic (Enhanced) ---
    const aiChatToggleButton = document.getElementById('ai-chat-toggle-button');
    const aiChatWidgetContainer = document.getElementById('ai-chat-widget-container');
    const aiChatCloseButton = document.getElementById('ai-chat-close-button');
    const aiChatLog = document.getElementById('ai-chat-log');
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiChatSendButton = document.getElementById('ai-chat-send-button');

    if (aiChatToggleButton && aiChatWidgetContainer && aiChatCloseButton && aiChatLog && aiChatInput && aiChatSendButton) {
        aiChatToggleButton.addEventListener('click', () => {
            aiChatWidgetContainer.classList.toggle('hidden');
            aiChatWidgetContainer.classList.toggle('flex');
            if (!aiChatWidgetContainer.classList.contains('hidden')) {
                aiChatInput.focus();
                if (aiChatLog.children.length === 0) {
                    addChatMessageToLog("Hi! I'm the SD CampusCoders AI. How can I help?", 'ai');
                }
            }
        });
        aiChatCloseButton.addEventListener('click', () => {
            aiChatWidgetContainer.classList.add('hidden');
            aiChatWidgetContainer.classList.remove('flex');
        });
        aiChatSendButton.addEventListener('click', handleChatMessageSend);
        aiChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleChatMessageSend(); }
        });
    } else {
        console.warn("AI Chat widget elements not fully found.");
    }

    function addChatMessageToLog(message, sender = 'user') {
        if (!aiChatLog) { console.warn("aiChatLog element not found for adding message."); return; }
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('p-2.5', 'rounded-lg', 'max-w-[85%]', 'text-sm', 'leading-relaxed', 'break-words', 'shadow-md');
        const sanitizedMessage = escapeHTML(message);
        if (sender === 'user') {
            messageDiv.classList.add('bg-indigo-600', 'text-white', 'self-end', 'ml-auto');
            messageDiv.innerHTML = sanitizedMessage;
        } else if (sender === 'ai') {
            messageDiv.classList.add('bg-slate-700', 'text-slate-100', 'self-start', 'mr-auto');
            let formattedMessage = sanitizedMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            messageDiv.innerHTML = formattedMessage;
        } else if (sender === 'ai-loading') {
            messageDiv.classList.add('bg-slate-600', 'text-slate-300', 'self-start', 'mr-auto', 'italic');
            messageDiv.innerHTML = `<i>${sanitizedMessage}</i>`;
            messageDiv.id = 'ai-loading-message';
        } else if (sender === 'ai-error') {
            messageDiv.classList.add('bg-red-600', 'text-red-100', 'self-start', 'mr-auto');
            messageDiv.innerHTML = `<strong>Error:</strong> ${sanitizedMessage}`;
        }
        aiChatLog.appendChild(messageDiv);
        aiChatLog.scrollTop = aiChatLog.scrollHeight;
    }

    async function handleChatMessageSend() {
        if (!aiChatInput || !aiChatSendButton) { console.warn("AI chat input/send button not found."); return; }
        const userQuery = aiChatInput.value.trim();
        if (!userQuery) return;

        addChatMessageToLog(userQuery, 'user');
        const originalInputText = aiChatInput.value;
        aiChatInput.value = '';
        aiChatInput.disabled = true;
        aiChatSendButton.disabled = true;
        
        const existingLoadingMessage = document.getElementById('ai-loading-message');
        if (existingLoadingMessage) existingLoadingMessage.remove();
        addChatMessageToLog('SD CampusCoders AI is thinking...', 'ai-loading');

        const netlifyUser = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
        let headers = { 'Content-Type': 'application/json' };
        if (netlifyUser) {
            try {
                const token = await netlifyUser.jwt(true); // true to refresh if needed
                headers['Authorization'] = `Bearer ${token}`;
                console.log("Chat: Sending request with JWT for user:", netlifyUser.email);
            } catch (err) { 
                console.error("Error getting JWT for chat:", err);
                // Proceed as guest if token fails
            }
        } else {
            console.log("Chat: Sending request as guest (no Netlify user).");
        }

        try {
            const response = await fetch('/.netlify/functions/ask-gemini-enhanced', { 
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ userQuery })
            });
            
            const loadingMessage = document.getElementById('ai-loading-message');
            if (loadingMessage) loadingMessage.remove();

            if (!response.ok) {
                const errorText = await response.text();
                let errorMsg = `AI Service Error (${response.status})`;
                try { errorMsg = JSON.parse(errorText).error || errorMsg; } catch (e) {/*ignore if not json*/}
                addChatMessageToLog(errorMsg, 'ai-error');
                console.error("AI Chat Error From Function - Details:", errorText);
                aiChatInput.value = originalInputText; // Restore input on error
                return;
            }
            const data = await response.json();
            addChatMessageToLog(data.answer || "Sorry, I couldn't get a valid response from the AI.", 'ai');
        } catch (error) {
            const loadingMsg = document.getElementById('ai-loading-message');
            if(loadingMsg) loadingMsg.remove();
            addChatMessageToLog('A connection error occurred. Please check your network and try again.', 'ai-error');
            console.error('Chat send client-side fetch error:', error);
            aiChatInput.value = originalInputText; // Restore input on error
        } finally {
            aiChatInput.disabled = false;
            aiChatSendButton.disabled = false;
            if (!aiChatInput.value) aiChatInput.focus(); // Focus if input was cleared
        }
    }
    // --- End AI Chat Widget Logic ---

}); // End of DOMContentLoaded