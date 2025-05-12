// js/profile-page.js
import { escapeHTML } from './main.js';
import { updateNavOnAuthStateChange } from './auth.js'; // To update nav after profile name change

// Profile Edit Elements
const profileContentDiv = document.getElementById('profile-content');
const profileUsernameSpan = document.getElementById('profile-username');
const profileEmailSpan = document.getElementById('profile-email');
const profileEditForm = document.getElementById('profile-edit-form');
const profileFullNameInput = document.getElementById('profile-fullname');
const profileNewPasswordInput = document.getElementById('profile-new-password');
const profileMessageDiv = document.getElementById('profile-message');
const profileLoginPromptDiv = document.getElementById('profile-login-prompt');
const profileLoadingDiv = document.getElementById('profile-loading');
const profileUpdateButton = document.getElementById('profile-update-button');
const profileLogoutButton = document.getElementById('profile-logout-button');


// "My Orders" Section Elements
const myOrdersSectionDiv = document.getElementById('my-orders-section');
const myOrdersLoadingDiv = document.getElementById('my-orders-loading');
const myOrdersNoneFoundDiv = document.getElementById('my-orders-none-found');
const myOrdersListDiv = document.getElementById('my-orders-list');

let currentUserForProfile = null; 

function loadUserProfileData(user) {
    if (profileContentDiv && profileUsernameSpan && profileEmailSpan && profileFullNameInput) {
        if (profileLoadingDiv) profileLoadingDiv.classList.add('hidden');
        profileContentDiv.classList.remove('hidden');
        if (profileLoginPromptDiv) profileLoginPromptDiv.classList.add('hidden');

        profileUsernameSpan.textContent = user.user_metadata.full_name || user.email.split('@')[0];
        profileEmailSpan.textContent = user.email;
        profileFullNameInput.value = user.user_metadata.full_name || '';
    }
}

function showLoginPromptForProfile() {
    if (profileLoginPromptDiv && profileContentDiv && profileLoadingDiv) {
        profileLoginPromptDiv.classList.remove('hidden');
        if (profileContentDiv) profileContentDiv.classList.add('hidden');
        if (profileLoadingDiv) profileLoadingDiv.classList.add('hidden');
        if (myOrdersSectionDiv) myOrdersSectionDiv.classList.add('hidden'); // Hide orders too
    }
}

async function handleProfileFormSubmit(event) {
    event.preventDefault();
    if (!profileEditForm || !profileMessageDiv || !profileFullNameInput || !profileNewPasswordInput || !profileUpdateButton) return;

    const user = currentUserForProfile; // Use stored user
    if (!user) { /* ... error handling ... */ return; }

    profileUpdateButton.disabled = true;
    profileUpdateButton.textContent = 'Updating...';
    profileMessageDiv.textContent = ''; 

    const updates = { data: { full_name: profileFullNameInput.value.trim() } };
    const newPassword = profileNewPasswordInput.value;

    try {
        await user.update(updates);
        profileMessageDiv.textContent = 'Profile updated successfully!';
        profileMessageDiv.className = 'mt-4 text-sm text-center text-green-400';
        
        // Force a re-fetch of the user object to get the latest metadata
        // Netlify Identity's currentUser() might not update immediately after .update()
        // A common pattern is to trigger a pseudo-refresh or re-check identity.
        // For simplicity, we'll update local display and nav directly.
        const updatedFullName = updates.data.full_name;
        if (profileUsernameSpan) profileUsernameSpan.textContent = updatedFullName || user.email.split('@')[0];
        
        // Create a temporary user-like object for nav update if Netlify's currentUser isn't immediately fresh
        const tempUserForNav = { 
            ...user, 
            user_metadata: { ...user.user_metadata, full_name: updatedFullName } 
        };
        updateNavOnAuthStateChange(tempUserForNav);

        if (profileNewPasswordInput) profileNewPasswordInput.value = '';
        if (newPassword) { 
            profileMessageDiv.textContent += ' Password changes are processed by Netlify Identity, often requiring email confirmation.';
        }
    } catch (error) { /* ... error handling ... */ 
        profileMessageDiv.textContent = `Error: ${error.message || 'Failed to update profile.'}`;
        profileMessageDiv.className = 'mt-4 text-sm text-center text-red-400';
    } finally {
        profileUpdateButton.disabled = false;
        profileUpdateButton.textContent = 'Update Profile Info';
    }
}

async function fetchAndDisplayMyOrders(user) {
    if (!user || !myOrdersSectionDiv || !myOrdersListDiv || !myOrdersLoadingDiv || !myOrdersNoneFoundDiv) {
        if (myOrdersSectionDiv) myOrdersSectionDiv.classList.add('hidden');
        return;
    }

    myOrdersSectionDiv.classList.remove('hidden');
    myOrdersListDiv.innerHTML = ''; 
    myOrdersLoadingDiv.classList.remove('hidden');
    myOrdersNoneFoundDiv.classList.add('hidden');

    try {
        const token = await user.jwt(true);
        const response = await fetch('/.netlify/functions/get-my-service-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        myOrdersLoadingDiv.classList.add('hidden');

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
            myOrdersListDiv.innerHTML = `<p class="text-red-400 text-sm">Error loading your orders: ${escapeHTML(errorData.error)}</p>`;
            return;
        }

        const orders = await response.json();

        if (!orders || orders.length === 0) {
            myOrdersNoneFoundDiv.classList.remove('hidden');
        } else {
            orders.forEach(order => {
                const orderDiv = document.createElement('div');
                orderDiv.className = 'bg-slate-700/50 p-4 rounded-lg shadow';
                let statusColor = 'text-slate-400';
                const statusText = order.status ? order.status.toLowerCase() : 'unknown';
                switch (statusText) {
                    case 'new': statusColor = 'text-blue-400'; break;
                    case 'in-progress': statusColor = 'text-yellow-400'; break;
                    case 'completed': statusColor = 'text-green-400'; break;
                    case 'rejected': statusColor = 'text-red-400'; break;
                }
                orderDiv.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-semibold text-indigo-300">${escapeHTML(order.service_type?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Service')}</h4>
                        <span class="text-xs font-medium ${statusColor}">${escapeHTML(statusText.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()))}</span>
                    </div>
                    <p class="text-slate-300 text-xs mb-1">Date: ${new Date(order.created_at).toLocaleDateString()}</p>
                    <p class="text-slate-400 text-sm mt-1">Details: ${escapeHTML(order.project_details?.substring(0, 100) || 'N/A')}${order.project_details && order.project_details.length > 100 ? '...' : ''}</p>
                `;
                myOrdersListDiv.appendChild(orderDiv);
            });
        }
    } catch (error) {
        console.error("Profile Page: Error fetching user's orders:", error);
        if (myOrdersLoadingDiv) myOrdersLoadingDiv.classList.add('hidden');
        if (myOrdersListDiv) myOrdersListDiv.innerHTML = `<p class="text-red-400 text-sm">Could not load your orders at this time.</p>`;
    }
}

export function updateUserProfilePage(user) {
    currentUserForProfile = user; 
    if (user) {
        if (profileContentDiv) loadUserProfileData(user); 
        if (myOrdersSectionDiv) fetchAndDisplayMyOrders(user); 
    } else {
        showLoginPromptForProfile();
        if (myOrdersSectionDiv) myOrdersSectionDiv.classList.add('hidden');
    }
}

export function initProfilePage() {
    if (!document.getElementById('profile-management')) return; 

    console.log("Profile Page Initializing or Re-initializing...");
    if (profileEditForm) {
        profileEditForm.removeEventListener('submit', handleProfileFormSubmit); 
        profileEditForm.addEventListener('submit', handleProfileFormSubmit);
    }
    if (profileLogoutButton) {
        profileLogoutButton.removeEventListener('click', () => window.netlifyIdentity.logout());
        profileLogoutButton.addEventListener('click', () => {
            if(window.netlifyIdentity) window.netlifyIdentity.logout();
        });
    }
    
    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    updateUserProfilePage(user); 
}