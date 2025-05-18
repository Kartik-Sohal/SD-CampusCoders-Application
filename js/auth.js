// js/auth.js
// ... (imports remain the same) ...

const navOrdersDashboardLinkDesktop = document.getElementById('nav-orders-dashboard-link');
const navProfileLinkDesktop = document.getElementById('desktop-nav-profile-link');
const navUsernameDesktop = document.getElementById('nav-username-desktop');
const desktopUserIndicator = document.getElementById('desktop-user-indicator');
const desktopLoginIcon = document.getElementById('desktop-login-icon');
const desktopUserMenuButton = document.getElementById('user-menu-button');
const desktopUserMenu = document.getElementById('user-menu');
const desktopLogoutButton = document.getElementById('desktop-nav-logout-button');
const desktopLoginButton = document.getElementById('desktop-nav-login-button');

// ... (Mobile Nav Elements remain the same) ...
const mobileNavOrdersDashboardLink = document.getElementById('mobile-nav-orders-dashboard-link');
// ... etc ...

export function updateNavOnAuthStateChange(user) {
    const isEmployeeOrHigher = user?.app_metadata?.roles?.some(role => 
        ['employee', 'order_manager', 'ceo'].includes(role)
    );

    // --- Desktop Nav Update ---
    if (navOrdersDashboardLinkDesktop) navOrdersDashboardLinkDesktop.classList.toggle('hidden', !isEmployeeOrHigher);
    
    if (user) { // User is LOGGED IN
        if (navUsernameDesktop) {
            navUsernameDesktop.textContent = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'; // Show first name or username part of email
            navUsernameDesktop.classList.remove('hidden');
        }
        if (desktopLoginIcon) desktopLoginIcon.classList.add('hidden');
        if (desktopUserIndicator) desktopUserIndicator.classList.remove('bg-slate-700', 'hover:bg-slate-600'); // Use button's base style

        // Dropdown items for logged-in user
        if (navProfileLinkDesktop) navProfileLinkDesktop.classList.remove('hidden');
        if (desktopLogoutButton) desktopLogoutButton.classList.remove('hidden');
        if (desktopLoginButton) desktopLoginButton.classList.add('hidden');
        if(desktopUserMenuButton) desktopUserMenuButton.setAttribute('aria-expanded', 'false');


    } else { // User is LOGGED OUT
        if (navUsernameDesktop) {
            navUsernameDesktop.textContent = 'Account'; // Or "Log In"
            navUsernameDesktop.classList.remove('hidden'); // Keep 'Account' visible
        }
        if (desktopLoginIcon) desktopLoginIcon.classList.remove('hidden'); // Show login icon
        if (desktopUserIndicator) desktopUserIndicator.classList.add('bg-slate-700', 'hover:bg-slate-600'); // Style as button

        // Dropdown items for logged-out user
        if (navProfileLinkDesktop) navProfileLinkDesktop.classList.add('hidden');
        if (desktopLogoutButton) desktopLogoutButton.classList.add('hidden');
        if (desktopLoginButton) desktopLoginButton.classList.remove('hidden');
        if(desktopUserMenuButton) desktopUserMenuButton.setAttribute('aria-expanded', 'false');
        if(desktopUserMenu && !desktopUserMenu.classList.contains('hidden')) desktopUserMenu.classList.add('hidden','opacity-0','scale-95'); // Ensure menu is closed
    }

    // --- Mobile Nav Update (remains largely the same as your previous version) ---
    if (mobileNavOrdersDashboardLink) mobileNavOrdersDashboardLink.classList.toggle('hidden', !isEmployeeOrHigher);
    // ... (rest of mobile nav updates for profile, logout, login buttons, user info visibility) ...
    const mobileNavProfileLink = document.getElementById('mobile-nav-profile-link');
    const mobileLogoutButton = document.getElementById('mobile-nav-logout-button');
    const mobileLoginButton = document.getElementById('mobile-nav-login-button');
    const mobileUserInfoDiv = document.getElementById('mobile-user-info');
    const mobileNavUsername = document.getElementById('mobile-nav-username');
    const mobileNavEmail = document.getElementById('mobile-nav-email');

    if (mobileNavProfileLink) mobileNavProfileLink.classList.toggle('hidden', !user);
    if (mobileLogoutButton) mobileLogoutButton.classList.toggle('hidden', !user);
    if (mobileLoginButton) mobileLoginButton.classList.toggle('hidden', !!user);
    if (mobileUserInfoDiv) mobileUserInfoDiv.classList.toggle('hidden', !user);
    
    if (user && mobileNavUsername && mobileNavEmail) {
        mobileNavUsername.textContent = user.user_metadata?.full_name || "User";
        mobileNavEmail.textContent = user.email;
    }
    
    // Ensure old nav elements are hidden (if they existed from previous versions)
    const legacyNavProfileLink = document.getElementById('nav-profile-link');
    const legacyNavUsernameDisplay = document.getElementById('nav-username-display');
    if(legacyNavProfileLink && legacyNavProfileLink !== navProfileLinkDesktop && legacyNavProfileLink !== mobileNavProfileLink) legacyNavProfileLink.classList.add('hidden');
    if(legacyNavUsernameDisplay && legacyNavUsernameDisplay !== navUsernameDesktop && legacyNavUsernameDisplay !== mobileNavUsername) legacyNavUsernameDisplay.classList.add('hidden');
}

function reinitializePageSpecificModules(user) { /* ... same as before ... */ }

export function initAuth() {
    if (desktopUserMenuButton && desktopUserMenu) {
        desktopUserMenuButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const isHidden = desktopUserMenu.classList.contains('hidden');
            if (isHidden) {
                desktopUserMenu.classList.remove('hidden');
                setTimeout(() => { // Allow display:block to take effect before transition
                    desktopUserMenu.classList.remove('opacity-0', 'scale-95');
                    desktopUserMenu.classList.add('opacity-100', 'scale-100');
                }, 10); // Small delay
                desktopUserMenuButton.setAttribute('aria-expanded', 'true');
            } else {
                desktopUserMenu.classList.remove('opacity-100', 'scale-100');
                desktopUserMenu.classList.add('opacity-0', 'scale-95');
                setTimeout(() => {
                    desktopUserMenu.classList.add('hidden');
                }, 100); // Match transition duration
                desktopUserMenuButton.setAttribute('aria-expanded', 'false');
            }
        });

        // Close dropdown if clicked outside
        document.addEventListener('click', (event) => {
            if (!desktopUserMenu.classList.contains('hidden') && 
                !desktopUserMenuButton.contains(event.target) && 
                !desktopUserMenu.contains(event.target)) {
                
                desktopUserMenu.classList.remove('opacity-100', 'scale-100');
                desktopUserMenu.classList.add('opacity-0', 'scale-95');
                setTimeout(() => {
                    desktopUserMenu.classList.add('hidden');
                }, 100);
                desktopUserMenuButton.setAttribute('aria-expanded', 'false');
            }
        });

        // Close dropdown with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !desktopUserMenu.classList.contains('hidden')) {
                desktopUserMenu.classList.remove('opacity-100', 'scale-100');
                desktopUserMenu.classList.add('opacity-0', 'scale-95');
                setTimeout(() => {
                    desktopUserMenu.classList.add('hidden');
                }, 100);
                desktopUserMenuButton.setAttribute('aria-expanded', 'false');
                desktopUserMenuButton.focus(); // Return focus to the button
            }
        });
    }
    
    // Event listeners for buttons inside the dropdown
    if (desktopLoginButton) desktopLoginButton.addEventListener('click', () => { if(window.netlifyIdentity) window.netlifyIdentity.open('login'); desktopUserMenu.classList.add('hidden','opacity-0','scale-95'); });
    if (desktopLogoutButton) desktopLogoutButton.addEventListener('click', () => { if(window.netlifyIdentity) window.netlifyIdentity.logout(); desktopUserMenu.classList.add('hidden','opacity-0','scale-95');});
    if (navProfileLinkDesktop) navProfileLinkDesktop.addEventListener('click', () => { desktopUserMenu.classList.add('hidden','opacity-0','scale-95'); /* Allow link to navigate */ });


    // ... (Mobile login/logout button listeners remain the same as your previous correct version) ...
    const mobileLoginButton = document.getElementById('mobile-nav-login-button');
    const mobileLogoutButton = document.getElementById('mobile-nav-logout-button');
    const mobileMenu = document.getElementById('mobile-menu'); // Ensure mobileMenu is accessible

    if (mobileLoginButton) {
        mobileLoginButton.addEventListener('click', () => {
            if (window.netlifyIdentity) window.netlifyIdentity.open('login');
            if (mobileMenu) mobileMenu.classList.add('hidden');
        });
    }
    if (mobileLogoutButton) {
        mobileLogoutButton.addEventListener('click', () => {
            if (window.netlifyIdentity) window.netlifyIdentity.logout();
            if (mobileMenu) mobileMenu.classList.add('hidden');
        });
    }


    // Netlify Identity event listeners
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on('init', user => { /* ... call updateNav, reinitialize, sync ... */ 
            console.log("Auth: Netlify Identity 'init', User:", user ? user.email : 'none');
            updateNavOnAuthStateChange(user);
            reinitializePageSpecificModules(user);
            if (user) syncUserProfileWithBackend(user);
        });
        window.netlifyIdentity.on('login', user => { /* ... call updateNav, reinitialize, sync ... */ 
            console.log("Auth: Netlify Identity 'login', User:", user.email);
            updateNavOnAuthStateChange(user);
            syncUserProfileWithBackend(user);
            reinitializePageSpecificModules(user);
            window.netlifyIdentity.close(); 
        });
        window.netlifyIdentity.on('logout', () => { /* ... call updateNav, reinitialize ... */ 
            console.log("Auth: Netlify Identity 'logout'");
            updateNavOnAuthStateChange(null);
            reinitializePageSpecificModules(null);
        });
    } else { /* ... fallback logic ... */ 
        updateNavOnAuthStateChange(null);
        reinitializePageSpecificModules(null);
        console.warn("Auth: Netlify Identity widget not available on initAuth call.");
    }
}

async function syncUserProfileWithBackend(netlifyUser) { /* ... same as before ... */ }