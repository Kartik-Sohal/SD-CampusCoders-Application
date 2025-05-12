// js/main.js
import { initAuth, updateNavOnAuthStateChange } from './auth.js';
import { initAiChat } from './ai-chat.js';
// Import other page-specific initializers if they need to run on all pages or based on DOM elements
// For example, if ceo-dashboard elements could appear on multiple pages and need initialization based on presence
// import { initCeoDashboard } from './ceo-dashboard.js'; 
// import { initProfilePage } from './profile-page.js';


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

// Helper function (can be moved to a utils.js if you have many)
export const escapeHTML = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
};


document.addEventListener('DOMContentLoaded', () => {
    setCurrentYear();
    initFadeInSections();
    initAuth(); // Initialize authentication listeners
    initAiChat(); // Initialize AI Chat

    // Page-specific initializations (alternative to importing and calling directly)
    // This checks if specific elements for a page exist before running its init function.
    // Requires those init functions to be exported from their respective files.
    if (document.getElementById('ceo-dashboard')) {
        import('./ceo-dashboard.js').then(module => module.initCeoDashboard());
    }
    if (document.getElementById('profile-management')) {
        import('./profile-page.js').then(module => module.initProfilePage());
    }

    // Initial check for nav update based on auth state
    // This might be redundant if initAuth handles it, but good for initial load
    const currentUser = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    updateNavOnAuthStateChange(currentUser); 
});