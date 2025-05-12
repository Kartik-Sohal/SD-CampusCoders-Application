// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- General Site Logic ---
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
    
    // Profile Page Elements
    const profileContent = document.getElementById('profile-content');
    const profileUsernameSpan = document.getElementById('profile-username');
    const profileEmailSpan = document.getElementById('profile-email');
    const profileEditForm = document.getElementById('profile-edit-form');
    const profileFullNameInput = document.getElementById('profile-fullname');
    // const profileCurrentPasswordInput = document.getElementById('profile-current-password'); // We'll use this in Phase 2
    const profileNewPasswordInput = document.getElementById('profile-new-password');
    const profileMessageDiv = document.getElementById('profile-message');
    const profileLoginPrompt = document.getElementById('profile-login-prompt');
    const profileLoadingDiv = document.getElementById('profile-loading');


    function displayCEOControls(user) {
        const isCEO = user && user.app_metadata && user.app_metadata.roles && user.app_metadata.roles.includes('ceo');
        if (ceoDashboardSection) { // This dashboard is on index.html (or wherever you placed it)
            ceoDashboardSection.classList.toggle('hidden', !isCEO);
            if (isCEO) fetchAndDisplayPendingApplications(user);
        }
        // Update nav profile link visibility or text (optional, could always show it)
        // const navProfileLink = document.getElementById('nav-profile-link');
        // if(navProfileLink) navProfileLink.classList.toggle('hidden', !user);
    }

    function loadUserProfile(user) {
        if (profileContent && profileUsernameSpan && profileEmailSpan && profileFullNameInput && profileLoadingDiv) {
            profileLoadingDiv.classList.add('hidden');
            profileContent.classList.remove('hidden');
            profileUsernameSpan.textContent = user.user_metadata.full_name || user.email.split('@')[0];
            profileEmailSpan.textContent = user.email;
            profileFullNameInput.value = user.user_metadata.full_name || '';
        }
         if (profileLoginPrompt) profileLoginPrompt.classList.add('hidden');
    }

    function showProfileLoginPrompt() {
        if (profileLoginPrompt && profileContent && profileLoadingDiv) {
            profileLoginPrompt.classList.remove('hidden');
            profileContent.classList.add('hidden');
            profileLoadingDiv.classList.add('hidden');
        }
    }


    async function fetchAndDisplayPendingApplications(user) {
        if (!applicationsListDiv || !ceoLoadingMessage || !ceoNoApplicationsMessage) return;
        applicationsListDiv.innerHTML = ''; 
        ceoLoadingMessage.classList.remove('hidden');
        ceoNoApplicationsMessage.classList.add('hidden');
        try {
            const token = await user.jwt(true); 
            const response = await fetch('/.netlify/functions/get-pending-applications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            ceoLoadingMessage.classList.add('hidden');
            if (!response.ok) { /* ... error handling ... */ 
                const errorText = await response.text(); let errorMsg = `Error ${response.status}`; try {errorMsg = JSON.parse(errorText).error || errorMsg} catch(e){}
                applicationsListDiv.innerHTML = `<p class="text-red-400">Error: ${escapeHTML(errorMsg)}</p>`; return;
            }
            const applications = await response.json();
            if (applications.length === 0) { ceoNoApplicationsMessage.classList.remove('hidden'); } 
            else { applications.forEach(app => { /* ... render app card ... */ 
                const appCard = document.createElement('div');
                appCard.className = 'bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700/50';
                let resumeLinkHTML = '<span class="text-slate-500">N/A</span>';
                if (app.resume_data && typeof app.resume_data.url === 'string' && app.resume_data.url) {
                    resumeLinkHTML = `<a href="${escapeHTML(app.resume_data.url)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline">View Resume</a>`;
                } else if (app.resume_data && typeof app.resume_data.filename === 'string') {
                     resumeLinkHTML = `<span class="text-slate-400">${escapeHTML(app.resume_data.filename)} (URL not found)</span>`;
                }
                appCard.innerHTML = `
                    <div class="flex justify-between items-start mb-3"><h3 class="text-xl font-semibold text-pink-400">${escapeHTML(app.name)}</h3><span class="text-xs text-slate-500">${new Date(app.created_at).toLocaleDateString()}</span></div>
                    <p class="text-slate-300 mb-1"><strong class="font-medium text-slate-100 w-20 inline-block">Email:</strong> ${escapeHTML(app.email)}</p>
                    <p class="text-slate-300 mb-1"><strong class="font-medium text-slate-100 w-20 inline-block">Position:</strong> ${escapeHTML(app.position)}</p>
                    ${app.phone ? `<p class="text-slate-300 mb-1"><strong class="font-medium text-slate-100 w-20 inline-block">Phone:</strong> ${escapeHTML(app.phone)}</p>` : ''}
                    ${app.linkedin ? `<p class="text-slate-300 mb-1"><strong class="font-medium text-slate-100 w-20 inline-block">LinkedIn:</strong> <a href="${app.linkedin.startsWith('http') ? '' : 'https://'}${escapeHTML(app.linkedin)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300">${escapeHTML(app.linkedin)}</a></p>` : ''}
                    <p class="text-slate-300 mb-3"><strong class="font-medium text-slate-100 w-20 inline-block">Resume:</strong> ${resumeLinkHTML}</p>
                    ${app.cover_letter ? `<div class="mt-2"><strong class="font-medium text-slate-100">Cover Letter:</strong><div class="text-slate-400 whitespace-pre-wrap bg-slate-700/50 p-3 rounded-md mt-1 text-sm">${escapeHTML(app.cover_letter)}</div></div>` : ''}
                    <div class="mt-6 flex space-x-3"><button data-id="${app.id}" data-action="approved" class="ceo-action-btn bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 flex-1">Approve</button><button data-id="${app.id}" data-action="denied" class="ceo-action-btn bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 flex-1">Deny</button></div>`;
                applicationsListDiv.appendChild(appCard);
            });
            document.querySelectorAll('.ceo-action-btn').forEach(button => { button.removeEventListener('click', handleApplicationAction); button.addEventListener('click', handleApplicationAction); });
            }
        } catch (error) { console.error("App fetch error:", error); if (ceoLoadingMessage) ceoLoadingMessage.classList.add('hidden'); if(applicationsListDiv) applicationsListDiv.innerHTML = `<p class="text-red-400">Error loading apps.</p>`;}
    }

    async function handleApplicationAction(event) { /* ... same as Step 5 ... */ 
        const button = event.currentTarget; const applicationId = button.dataset.id; const newStatus = button.dataset.action;
        const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null; if (!user) return;
        const card = button.closest('.bg-slate-800'); const actionButtons = card ? card.querySelectorAll('.ceo-action-btn') : [button];
        actionButtons.forEach(btn => { btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed'); }); button.textContent = 'Processing...';
        try {
            const token = await user.jwt(true);
            const response = await fetch('/.netlify/functions/update-application-status', {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId, newStatus })
            });
            if (!response.ok) { /* ... error handling ... */ 
                const errorData = await response.json().catch(()=>({error: `Server error: ${response.status}`})); alert(`Error: ${errorData.error}`); throw new Error(errorData.error);
            }
            if (card) { card.style.transition = 'opacity 0.5s ease, transform 0.5s ease'; card.style.opacity = '0'; card.style.transform = 'scale(0.95) translateY(-20px)'; setTimeout(() => { card.remove(); if (applicationsListDiv && applicationsListDiv.children.length === 0 && ceoNoApplicationsMessage) { ceoNoApplicationsMessage.classList.remove('hidden'); }}, 500);
            } else { fetchAndDisplayPendingApplications(user); }
        } catch (error) { console.error("App update error:", error); alert("Update failed."); 
            actionButtons.forEach(btn => { btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed');});
            button.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
        }
    }
    
    // Netlify Identity Event Listeners
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on('init', user => {
            console.log("Netlify Identity 'init', User:", user ? user.email : 'none');
            displayCEOControls(user); // For CEO dashboard on any page it might exist
            if (user && window.location.pathname.includes('/profile.html')) { // If on profile page
                loadUserProfile(user);
            } else if (!user && window.location.pathname.includes('/profile.html')) {
                showProfileLoginPrompt();
            }
        });
        window.netlifyIdentity.on('login', user => {
            console.log("Netlify Identity 'login', User:", user.email);
            displayCEOControls(user);
            if (window.location.pathname.includes('/profile.html')) {
                loadUserProfile(user);
            }
            // Optionally redirect or update UI further
            // Example: if(window.location.pathname === "/login-required-page.html" && !user) { window.location.href = "/"; }
            window.netlifyIdentity.close();
        });
        window.netlifyIdentity.on('logout', () => {
            console.log("Netlify Identity 'logout'");
            displayCEOControls(null);
            if (window.location.pathname.includes('/profile.html')) {
                showProfileLoginPrompt();
            }
            // Optional: redirect to homepage on logout
            // window.location.href = "/"; 
        });
    } else {
        // If on profile page and no identity widget, still show login prompt
        if (window.location.pathname.includes('/profile.html') && profileLoginPrompt) {
           showProfileLoginPrompt();
           if(profileLoadingDiv) profileLoadingDiv.classList.add('hidden');
        }
    }
    
    // --- AI Chat Widget Logic (from Step 6) ---
    // ... (The full AI Chat widget logic from the previous step should be here) ...
    // ... (Make sure function names like addChatMessageToLog, handleChatMessageSend are distinct ...
    // ... or ensure they are correctly scoped if using the same names) ...
    const aiChatToggleButton = document.getElementById('ai-chat-toggle-button');
    const aiChatWidgetContainer = document.getElementById('ai-chat-widget-container');
    const aiChatCloseButton = document.getElementById('ai-chat-close-button');
    const aiChatLog = document.getElementById('ai-chat-log');
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiChatSendButton = document.getElementById('ai-chat-send-button');

    if (aiChatToggleButton && aiChatWidgetContainer && aiChatCloseButton && aiChatLog && aiChatInput && aiChatSendButton) {
        aiChatToggleButton.addEventListener('click', () => { /* ... */ aiChatWidgetContainer.classList.toggle('hidden'); aiChatWidgetContainer.classList.toggle('flex'); if(!aiChatWidgetContainer.classList.contains('hidden')){aiChatInput.focus(); if(aiChatLog.children.length === 0) addChatMessageToLog("Hi! Ask me anything about SD CampusCoders.",'ai');}});
        aiChatCloseButton.addEventListener('click', () => { /* ... */  aiChatWidgetContainer.classList.add('hidden'); aiChatWidgetContainer.classList.remove('flex');});
        aiChatSendButton.addEventListener('click', handleChatMessageSend);
        aiChatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleChatMessageSend(); }});
    }

    function addChatMessageToLog(message, sender = 'user') { /* ... same as Step 6 ... */ 
        if (!aiChatLog) return; const messageDiv = document.createElement('div'); messageDiv.classList.add('p-2.5','rounded-lg','max-w-[85%]','text-sm','leading-relaxed','break-words','shadow-md'); const sanitizedMessage = escapeHTML(message);
        if(sender === 'user'){messageDiv.classList.add('bg-indigo-600','text-white','self-end','ml-auto'); messageDiv.innerHTML = sanitizedMessage;}
        else if(sender === 'ai'){messageDiv.classList.add('bg-slate-700','text-slate-100','self-start','mr-auto'); let fmtMsg = sanitizedMessage.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>'); messageDiv.innerHTML = fmtMsg;}
        else if(sender === 'ai-loading'){messageDiv.classList.add('bg-slate-600','text-slate-300','self-start','mr-auto','italic'); messageDiv.innerHTML = `<i>${sanitizedMessage}</i>`; messageDiv.id='ai-loading-message';}
        else if(sender === 'ai-error'){messageDiv.classList.add('bg-red-600','text-red-100','self-start','mr-auto'); messageDiv.innerHTML = `<strong>Error:</strong> ${sanitizedMessage}`;}
        aiChatLog.appendChild(messageDiv); aiChatLog.scrollTop = aiChatLog.scrollHeight;
    }

    async function handleChatMessageSend() { /* ... same as Step 6, calling ask-gemini-enhanced ... */ 
        if(!aiChatInput || !aiChatSendButton) return; const userQuery = aiChatInput.value.trim(); if(!userQuery) return;
        addChatMessageToLog(userQuery,'user'); const origInput = aiChatInput.value; aiChatInput.value = ''; aiChatInput.disabled = true; aiChatSendButton.disabled = true;
        const existingLoadMsg = document.getElementById('ai-loading-message'); if(existingLoadMsg) existingLoadMsg.remove(); addChatMessageToLog('AI is thinking...','ai-loading');
        const netUser = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null; let hdrs = {'Content-Type':'application/json'};
        if(netUser){try{const tk = await netUser.jwt(true); hdrs['Authorization']=`Bearer ${tk}`; console.log("Chat: JWT sent for", netUser.email);}catch(e){console.error("Chat JWT err:",e);}} else {console.log("Chat: guest user");}
        try {
            const response = await fetch('/.netlify/functions/ask-gemini-enhanced', {method:'POST',headers:hdrs,body:JSON.stringify({userQuery})});
            const loadMsg = document.getElementById('ai-loading-message'); if(loadMsg)loadMsg.remove();
            if(!response.ok){const errTxt = await response.text(); let errMsg = `AI Error ${response.status}`; try{errMsg = JSON.parse(errTxt).error || errMsg;}catch(e){} addChatMessageToLog(errMsg,'ai-error'); console.error("AI Chat func err:",errTxt); aiChatInput.value = origInput; return;}
            const data = await response.json(); addChatMessageToLog(data.answer || "No AI answer.",'ai');
        } catch(err_cli) { const ldMsg = document.getElementById('ai-loading-message'); if(ldMsg)ldMsg.remove(); addChatMessageToLog('Connection error.','ai-error'); console.error("Chat fetch err:",err_cli); aiChatInput.value = origInput;}
        finally {aiChatInput.disabled = false; aiChatSendButton.disabled = false; if(!aiChatInput.value) aiChatInput.focus();}
    }
});