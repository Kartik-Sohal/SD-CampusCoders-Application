// js/auth.js
import { updateCeoDashboardVisibility } from './ceo-dashboard.js'; // Assuming initCeoDashboard handles its own visibility
import { updateUserProfilePage } from './profile-page.js';   // Assuming initProfilePage handles its own visibility

const navProfileLink = document.getElementById('nav-profile-link');
const navUsernameDisplay = document.getElementById('nav-username-display'); // If you added this

export function updateNavOnAuthStateChange(user) {
    if (navProfileLink) {
        navProfileLink.classList.toggle('hidden', !user);
    }
    if (navUsernameDisplay) {
        if (user && user.user_metadata) {
            navUsernameDisplay.textContent = `Hi, ${user.user_metadata.full_name || user.email.split('@')[0]}`;
            navUsernameDisplay.classList.remove('hidden');
        } else {
            navUsernameDisplay.classList.add('hidden');
            navUsernameDisplay.textContent = '';
        }
    }
}


export function initAuth() {
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on('init', user => {
            console.log("Auth: Netlify Identity 'init', User:", user ? user.email : 'none');
            updateNavOnAuthStateChange(user);
            // Page specific updates based on auth state
            if (document.getElementById('ceo-dashboard')) updateCeoDashboardVisibility(user);
            if (document.getElementById('profile-management')) updateUserProfilePage(user);
        });

        window.netlifyIdentity.on('login', user => {
            console.log("Auth: Netlify Identity 'login', User:", user.email);
            updateNavOnAuthStateChange(user);
            if (document.getElementById('ceo-dashboard')) updateCeoDashboardVisibility(user);
            if (document.getElementById('profile-management')) updateUserProfilePage(user);
            window.netlifyIdentity.close();
        });

        window.netlifyIdentity.on('logout', () => {
            console.log("Auth: Netlify Identity 'logout'");
            updateNavOnAuthStateChange(null);
            if (document.getElementById('ceo-dashboard')) updateCeoDashboardVisibility(null);
            if (document.getElementById('profile-management')) updateUserProfilePage(null);
            // Optional: Redirect to home on logout from certain pages
            // if (window.location.pathname.includes('/profile.html')) {
            //     window.location.href = "/"; 
            // }
        });
    } else {
        // Handle case where identity widget might not be loaded yet or available
        // Potentially hide profile link if no user can be determined
        if (navProfileLink) navProfileLink.classList.add('hidden');
        if (navUsernameDisplay) navUsernameDisplay.classList.add('hidden');
        console.warn("Auth: Netlify Identity widget not available on initAuth call.");
         // If on profile page and no identity, trigger the prompt (handled by profile-page.js init)
        if (document.getElementById('profile-management')) updateUserProfilePage(null);

    }
}