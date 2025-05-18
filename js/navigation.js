// js/navigation.js

const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
// For desktop "user menu" if you implement one triggered by a button
// const userMenuButton = document.getElementById('user-menu-button'); 
// const userMenu = document.getElementById('user-menu');

export function initNavigation() {
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            // Optional: ARIA attribute for accessibility
            const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true' || false;
            mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
        });
    } else {
        // console.warn("Mobile menu button or menu itself not found.");
    }

    // Optional: Close mobile menu if user clicks outside of it
    document.addEventListener('click', (event) => {
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            const isClickInsideMenu = mobileMenu.contains(event.target);
            const isClickOnMenuButton = mobileMenuButton ? mobileMenuButton.contains(event.target) : false;
            if (!isClickInsideMenu && !isClickOnMenuButton) {
                mobileMenu.classList.add('hidden');
                if (mobileMenuButton) mobileMenuButton.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Add similar logic for a desktop user menu if you create one
    // if (userMenuButton && userMenu) { ... }

    console.log("Navigation Initialized.");
}