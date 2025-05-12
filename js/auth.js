// js/auth.js
import { updateCeoDashboardVisibility } from './ceo-dashboard.js'; 
import { updateUserProfilePage } from './profile-page.js';   
// We don't directly import updateUserOrderPage, initOrderPage will be called by main.js
// or we can call it here if the element exists.

const navProfileLink = document.getElementById('nav-profile-link');
const navUsernameDisplay = document.getElementById('nav-username-display');
// Navigation link for Orders Dashboard
const navOrdersDashboardLink = document.getElementById('nav-orders-dashboard-link');


export function updateNavOnAuthStateChange(user) {
    const isEmployeeOrHigher = user && user.app_metadata && user.app_metadata.roles &&
                               (user.app_metadata.roles.includes('employee') || 
                                user.app_metadata.roles.includes('order_manager') || 
                                user.app_metadata.roles.includes('ceo'));

    if (navProfileLink) {
        navProfileLink.classList.toggle('hidden', !user);
    }
    if (navOrdersDashboardLink) {
        navOrdersDashboardLink.classList.toggle('hidden', !isEmployeeOrHigher);
    }

    if (navUsernameDisplay) {
        if (user && user.user_metadata && user.user_metadata.full_name) {
            navUsernameDisplay.textContent = `Hi, ${user.user_metadata.full_name}`;
            navUsernameDisplay.classList.remove('hidden');
        } else if (user && user.email) {
            navUsernameDisplay.textContent = `Hi, ${user.email.split('@')[0]}`;
            navUsernameDisplay.classList.remove('hidden');
        } else {
            navUsernameDisplay.classList.add('hidden');
            navUsernameDisplay.textContent = '';
        }
    }
}

// This function will be called by main.js and by auth events
// to re-initialize page-specific modules if their root elements are present.
function reinitializePageSpecificModules(user) {
    if (document.getElementById('ceo-dashboard')) {
        // updateCeoDashboardVisibility is typically called directly, no need to re-import
        updateCeoDashboardVisibility(user);
    }
    if (document.getElementById('profile-management')) {
        updateUserProfilePage(user);
    }
    if (document.getElementById('service-order-form')) {
        // For order page, its init function handles user state
        import('./order-page.js').then(module => module.initOrderPage());
    }
    if (document.getElementById('orders-dashboard-content')) { // For the new orders dashboard page
        // We'll need an init function in orders-dashboard-page.js similar to others
        // For now, let's assume it exists or will be added.
        import('./orders-dashboard-page.js') // Assuming you'll create this file
            .then(module => {
                if (module.initOrdersDashboardPage) {
                    module.initOrdersDashboardPage();
                } else {
                    // Fallback if initOrdersDashboardPage not yet implemented
                    // We might just call a visibility function if that's all it does initially.
                    // For now, ensure your orders-dashboard-page.js exports initOrdersDashboardPage
                }
            })
            .catch(err => console.error("Auth: Failed to load Orders Dashboard module for reinitialization:", err));
    }
}


export function initAuth() {
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on('init', user => {
            console.log("Auth: Netlify Identity 'init', User:", user ? user.email : 'none');
            updateNavOnAuthStateChange(user);
            reinitializePageSpecificModules(user);
        });

        window.netlifyIdentity.on('login', user => {
            console.log("Auth: Netlify Identity 'login', User:", user.email);
            updateNavOnAuthStateChange(user);
            reinitializePageSpecificModules(user);
            window.netlifyIdentity.close();
        });

        window.netlifyIdentity.on('logout', () => {
            console.log("Auth: Netlify Identity 'logout'");
            updateNavOnAuthStateChange(null);
            reinitializePageSpecificModules(null);
        });
    } else {
        updateNavOnAuthStateChange(null); // Set nav to logged-out state
        // Call reinitialize with null to hide protected content if identity fails to load
        reinitializePageSpecificModules(null); 
        console.warn("Auth: Netlify Identity widget not available on initAuth call.");
    }
}