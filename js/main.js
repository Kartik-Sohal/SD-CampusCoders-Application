// js/main.js
import { initAuth, updateNavOnAuthStateChange } from './auth.js';
import { initAiChat } from './ai-chat.js';
// Page-specific modules will be dynamically imported below

// General site initializations
function initFadeInSections() {
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
}

function setCurrentYear() {
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
}

// Helper function for HTML escaping, exported for other modules
export const escapeHTML = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
};



// Main DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    console.log("Main.js: DOMContentLoaded triggered.");

    // Initialize general site features
    setCurrentYear();
    initFadeInSections();

    // Initialize core modules that are generally needed
    initAuth();    // Sets up Netlify Identity event listeners and calls page-specific updates via reinitializePageSpecificModules
    initAiChat();  // Sets up the AI Chat widget listeners

    // Page-specific initializations using dynamic imports
    // These are called if the main distinguishing element of that page/module is present.
    // The respective init functions (e.g., initCeoDashboard) will then handle their own logic,
    // including checking user authentication state if necessary.

    if (document.getElementById('ceo-dashboard')) {
        console.log("Main.js: CEO Dashboard element found, loading module...");
        import('./ceo-dashboard.js')
            .then(module => {
                if (module.initCeoDashboard) { // Check if function exists
                    module.initCeoDashboard();
                    console.log("Main.js: CEO Dashboard module initialized.");
                } else {
                    console.warn("Main.js: initCeoDashboard function not found in ceo-dashboard.js module.");
                }
            })
            .catch(err => console.error("Main.js: Failed to load CEO Dashboard module:", err));
    }

    if (document.getElementById('profile-management')) {
        console.log("Main.js: Profile Management element found, loading module...");
        import('./profile-page.js')
            .then(module => {
                if (module.initProfilePage) { // Check if function exists
                    module.initProfilePage();
                    console.log("Main.js: Profile Page module initialized.");
                } else {
                    console.warn("Main.js: initProfilePage function not found in profile-page.js module.");
                }
            })
            .catch(err => console.error("Main.js: Failed to load Profile Page module:", err));
    }

    if (document.getElementById('service-order-form')) { 
        console.log("Main.js: Service Order Form element found, loading module...");
        import('./order-page.js')
            .then(module => {
                if (module.initOrderPage) { // Check if function exists
                    module.initOrderPage();
                    console.log("Main.js: Order Page module initialized.");
                } else {
                    console.warn("Main.js: initOrderPage function not found in order-page.js module.");
                }
            })
            .catch(err => console.error("Main.js: Failed to load Order Page module:", err));
    }
    
    if (document.getElementById('orders-dashboard-content')) { // For the new orders dashboard page
        console.log("Main.js: Orders Dashboard Content element found, loading module...");
        import('./orders-dashboard-page.js') // Ensure you create js/orders-dashboard-page.js
            .then(module => {
                if (module.initOrdersDashboardPage) { // And it exports this function
                    module.initOrdersDashboardPage();
                    console.log("Main.js: Orders Dashboard Page module initialized.");
                } else {
                    console.warn("Main.js: initOrdersDashboardPage function not found in orders-dashboard-page.js module. Please create it.");
                }
            })
            .catch(err => console.error("Main.js: Failed to load Orders Dashboard Page module:", err));
    }

    // This initial call ensures the nav elements (like 'Hi, User' and 'My Profile' link)
    // are updated based on the current auth state as soon as the page loads.
    // The Netlify Identity 'init' event in auth.js will also handle this.
    if (window.netlifyIdentity) {
        const currentUser = window.netlifyIdentity.currentUser();
        updateNavOnAuthStateChange(currentUser);
    } else {
        updateNavOnAuthStateChange(null); // Default to logged-out state for nav
    }
});