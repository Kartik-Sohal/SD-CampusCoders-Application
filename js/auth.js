// js/auth.js
import { updateCeoDashboardVisibility } from './ceo-dashboard.js'; 
import { updateUserProfilePage } from './profile-page.js';   
// import { initOrderPage } from './order-page.js'; // order-page.js has its own init

const navProfileLink = document.getElementById('nav-profile-link');
const navUsernameDisplay = document.getElementById('nav-username-display');
const navOrdersDashboardLink = document.getElementById('nav-orders-dashboard-link');


async function syncUserProfileWithBackend(netlifyUser) {
    if (!netlifyUser) return;

    try {
        const token = await netlifyUser.jwt(true); // Get fresh token
        const response = await fetch('/.netlify/functions/sync-user-profile', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' // Though body is not strictly needed for this func as user comes from JWT
            },
            // body: JSON.stringify({}) // Can send an empty body or specific data if needed
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Auth: Failed to sync user profile with backend.', response.status, errorData);
        } else {
            const result = await response.json();
            console.log('Auth: User profile sync successful.', result.message, "Synced User:", result.user);
             // Optionally, update the local netlifyUser object if the backend returns enriched data
            // For example, if your sync function added a field to user_metadata in Netlify Identity (more advanced)
            // window.netlifyIdentity.refresh(); // This would fetch the latest from Netlify Identity
        }
    } catch (error) {
        console.error('Auth: Error calling sync-user-profile function:', error);
    }
}

export function updateNavOnAuthStateChange(user) {
    // ... (same as your previous correct version) ...
    const isEmployeeOrHigher = user && user.app_metadata && user.app_metadata.roles &&
                               (user.app_metadata.roles.includes('employee') || 
                                user.app_metadata.roles.includes('order_manager') || 
                                user.app_metadata.roles.includes('ceo'));
    if (navProfileLink) navProfileLink.classList.toggle('hidden', !user);
    if (navOrdersDashboardLink) navOrdersDashboardLink.classList.toggle('hidden', !isEmployeeOrHigher);
    if (navUsernameDisplay) {
        if (user && user.user_metadata && user.user_metadata.full_name) { /* ... */ navUsernameDisplay.textContent = `Hi, ${user.user_metadata.full_name}`; navUsernameDisplay.classList.remove('hidden');}
        else if (user && user.email) { /* ... */ navUsernameDisplay.textContent = `Hi, ${user.email.split('@')[0]}`; navUsernameDisplay.classList.remove('hidden');}
        else { /* ... */ navUsernameDisplay.classList.add('hidden'); navUsernameDisplay.textContent = '';}
    }
}

function reinitializePageSpecificModules(user) {
    // Update visibility/content of page-specific sections
    if (document.getElementById('ceo-dashboard') && typeof updateCeoDashboardVisibility === 'function') {
        updateCeoDashboardVisibility(user);
    }
    if (document.getElementById('profile-management') && typeof updateUserProfilePage === 'function') {
        updateUserProfilePage(user);
    }
    // order-page.js has its own init that checks user, but we can trigger a re-check
    if (document.getElementById('service-order-form')) {
        import('./order-page.js').then(module => {
            if (module.initOrderPage) module.initOrderPage(); // initOrderPage itself handles user state
        }).catch(err => console.error("Auth: Failed to re-init order page module:", err));
    }
    if (document.getElementById('orders-dashboard-content')) {
        import('./orders-dashboard-page.js')
            .then(module => {
                if (module.initOrdersDashboardPage) module.initOrdersDashboardPage();
            })
            .catch(err => console.warn("Auth: orders-dashboard-page.js or its init not found for re-init.", err));
    }
}

export function initAuth() {
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on('init', user => {
            console.log("Auth: Netlify Identity 'init', User:", user ? user.email : 'none');
            updateNavOnAuthStateChange(user);
            reinitializePageSpecificModules(user);
            if (user) {
                syncUserProfileWithBackend(user); // Sync on initial load if user exists
            }
        });

        window.netlifyIdentity.on('login', user => {
            console.log("Auth: Netlify Identity 'login', User:", user.email);
            updateNavOnAuthStateChange(user);
            syncUserProfileWithBackend(user); // Sync after login/signup
            reinitializePageSpecificModules(user);
            window.netlifyIdentity.close();
        });

        window.netlifyIdentity.on('logout', () => {
            console.log("Auth: Netlify Identity 'logout'");
            updateNavOnAuthStateChange(null);
            reinitializePageSpecificModules(null);
        });
    } else {
        // Fallback if Netlify Identity widget fails to load
        updateNavOnAuthStateChange(null);
        reinitializePageSpecificModules(null);
        console.warn("Auth: Netlify Identity widget not available on initAuth call.");
    }
}