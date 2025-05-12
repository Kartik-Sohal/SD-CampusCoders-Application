// js/ceo-dashboard.js
import { escapeHTML } from './main.js'; // Assuming escapeHTML is exported from main.js

const ceoDashboardSection = document.getElementById('ceo-dashboard');
const applicationsListDiv = document.getElementById('applications-list');
const ceoLoadingMessage = document.getElementById('ceo-loading-message');
const ceoNoApplicationsMessage = document.getElementById('ceo-no-applications-message');

let currentUserForDashboard = null; // Store current user for re-fetching

export function updateCeoDashboardVisibility(user) {
    currentUserForDashboard = user; // Update stored user
    const isCEO = user && user.app_metadata && user.app_metadata.roles && user.app_metadata.roles.includes('ceo');
    if (ceoDashboardSection) {
        ceoDashboardSection.classList.toggle('hidden', !isCEO);
        if (isCEO) {
            fetchAndDisplayPendingApplications(user);
        }
    }
}

async function fetchAndDisplayPendingApplications(user) {
    if (!applicationsListDiv || !ceoLoadingMessage || !ceoNoApplicationsMessage || !user) return;
    
    applicationsListDiv.innerHTML = ''; 
    ceoLoadingMessage.classList.remove('hidden');
    ceoNoApplicationsMessage.classList.add('hidden');

    try {
        const token = await user.jwt(true); 
        const response = await fetch('/.netlify/functions/get-pending-applications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        ceoLoadingMessage.classList.add('hidden');
        if (!response.ok) { 
            const errorText = await response.text(); let errorMsg = `Error ${response.status}`; try {errorMsg = JSON.parse(errorText).error || errorMsg} catch(e){}
            applicationsListDiv.innerHTML = `<p class="text-red-400 text-center">Error loading applications: ${escapeHTML(errorMsg)}</p>`; return;
        }
        const applications = await response.json();
        if (applications.length === 0) { ceoNoApplicationsMessage.classList.remove('hidden'); } 
        else { 
            applications.forEach(app => { 
                const appCard = document.createElement('div');
                appCard.className = 'bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700/50';
                let resumeLinkHTML = '<span class="text-slate-500">N/A</span>';
                if (app.resume_data && typeof app.resume_data.url === 'string' && app.resume_data.url) {
                    resumeLinkHTML = `<a href="${escapeHTML(app.resume_data.url)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline">View Resume</a>`;
                } else if (app.resume_data && typeof app.resume_data.filename === 'string') {
                     resumeLinkHTML = `<span class="text-slate-400">${escapeHTML(app.resume_data.filename)} (URL missing)</span>`;
                }
                appCard.innerHTML = `
                    <div class="flex justify-between items-start mb-3"><h3 class="text-xl font-semibold text-pink-400">${escapeHTML(app.name)}</h3><span class="text-xs text-slate-500">${new Date(app.created_at).toLocaleDateString()}</span></div>
                    <p class="text-slate-300 mb-1"><strong class="font-medium text-slate-100 w-20 inline-block">Email:</strong> ${escapeHTML(app.email)}</p>
                    <p class="text-slate-300 mb-1"><strong class="font-medium text-slate-100 w-20 inline-block">Position:</strong> ${escapeHTML(app.position)}</p>
                    ${app.cover_letter ? `<div class="mt-2"><strong class="font-medium text-slate-100">Cover Letter:</strong><div class="text-slate-400 whitespace-pre-wrap bg-slate-700/50 p-3 rounded-md mt-1 text-sm">${escapeHTML(app.cover_letter)}</div></div>` : ''}
                    <div class="mt-6 flex space-x-3"><button data-id="${app.id}" data-action="approved" class="ceo-action-btn bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 flex-1">Approve</button><button data-id="${app.id}" data-action="denied" class="ceo-action-btn bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 flex-1">Deny</button></div>`;
                applicationsListDiv.appendChild(appCard);
            });
            document.querySelectorAll('.ceo-action-btn').forEach(button => { 
                button.removeEventListener('click', handleApplicationAction); 
                button.addEventListener('click', handleApplicationAction); 
            });
        }
    } catch (error) { 
        console.error("CEO Dashboard: App fetch error:", error); 
        if (ceoLoadingMessage) ceoLoadingMessage.classList.add('hidden'); 
        if(applicationsListDiv) applicationsListDiv.innerHTML = `<p class="text-red-400 text-center">Error loading applications.</p>`;
    }
}

async function handleApplicationAction(event) { 
    const button = event.currentTarget; const applicationId = button.dataset.id; const newStatus = button.dataset.action;
    const user = currentUserForDashboard; // Use the stored user
    if (!user) { console.error("CEO Dashboard: No user context for action."); return; }
    
    const card = button.closest('.bg-slate-800'); 
    const actionButtons = card ? card.querySelectorAll('.ceo-action-btn') : [button];
    actionButtons.forEach(btn => { btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed'); }); 
    button.textContent = 'Processing...';
    try {
        const token = await user.jwt(true);
        const response = await fetch('/.netlify/functions/update-application-status', {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ applicationId, newStatus })
        });
        if (!response.ok) { 
            const errorData = await response.json().catch(()=>({error: `Server error: ${response.status}`})); 
            alert(`Error: ${errorData.error}`); throw new Error(errorData.error);
        }
        if (card) { 
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease'; 
            card.style.opacity = '0'; card.style.transform = 'scale(0.95) translateY(-20px)'; 
            setTimeout(() => { 
                card.remove(); 
                if (applicationsListDiv && applicationsListDiv.children.length === 0 && ceoNoApplicationsMessage) { 
                    ceoNoApplicationsMessage.classList.remove('hidden'); 
                }
            }, 500);
        } else { fetchAndDisplayPendingApplications(user); }
    } catch (error) { 
        console.error("CEO Dashboard: App update error:", error); 
        alert("Update failed."); 
        actionButtons.forEach(btn => { btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed');});
        button.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    }
}

// This function is called by main.js if ceo-dashboard element exists
export function initCeoDashboard() {
    console.log("CEO Dashboard Initializing...");
    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    updateCeoDashboardVisibility(user); // Initial check
}