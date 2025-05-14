// js/order-page.js
import { escapeHTML } from './main.js'; // Ensure main.js exports this

// Get DOM elements. These might be null if not on the order.html page.
// The initOrderPage function will check if it's on the correct page.
const orderForm = document.getElementById('service-order-form');
const submitOrderButton = document.getElementById('submit-order-button');
const orderFormMessage = document.getElementById('order-form-message');
const orderLoginPrompt = document.getElementById('order-login-prompt');
const orderFormContainer = document.getElementById('order-form-container');
const orderPageSubtitle = document.getElementById('order-page-subtitle');

function showOrderFormUI(user) {
    if (orderFormContainer) orderFormContainer.classList.remove('hidden');
    if (orderLoginPrompt) orderLoginPrompt.classList.add('hidden');
    if (orderPageSubtitle) orderPageSubtitle.textContent = "Please fill out the form below to tell us about your project needs. We'll be in touch soon!";

    if (user && orderForm) {
        const nameInput = orderForm.querySelector('input[name="name"]');
        const emailInput = orderForm.querySelector('input[name="email"]');
        
        if (nameInput && user.user_metadata?.full_name && !nameInput.value) {
            nameInput.value = user.user_metadata.full_name;
        }
        if (emailInput && user.email && !emailInput.value) {
            emailInput.value = user.email;
        }
    }
}

function showOrderLoginPromptUI() {
    if (orderFormContainer) orderFormContainer.classList.add('hidden');
    if (orderLoginPrompt) orderLoginPrompt.classList.remove('hidden');
    if (orderPageSubtitle) orderPageSubtitle.textContent = "Log in to place an order and track its progress in your profile.";
}

async function handleOrderFormSubmit(event) {
    event.preventDefault(); 

    if (!orderForm || !submitOrderButton || !orderFormMessage) {
        console.error("Order Page JS: Submit handler called but form elements are missing.");
        return;
    }

    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    if (!user) {
        if(orderFormMessage) {
            orderFormMessage.textContent = 'SESSION EXPIRED: Please log in again to submit an order.';
            orderFormMessage.className = 'mt-4 text-center text-sm text-red-400';
        }
        showOrderLoginPromptUI();
        return;
    }

    submitOrderButton.disabled = true;
    submitOrderButton.textContent = 'Submitting...';
    orderFormMessage.textContent = '';
    orderFormMessage.className = 'mt-4 text-center text-sm';

    const formData = new FormData(orderForm);
    const formProps = Object.fromEntries(formData);

    const dataToSend = {
        customer_name: formProps.name,
        customer_email: formProps.email,
        customer_phone: formProps.phone,
        service_type: formProps.service_type,
        project_details: formProps.details 
    };
    
    let headers = { 'Content-Type': 'application/json' };
    let token;
    try {
        token = await user.jwt(true); 
        headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
        console.error("Order Page JS: Error getting JWT:", err);
        orderFormMessage.textContent = 'Authentication error. Please refresh and try logging in again.';
        orderFormMessage.classList.add('text-red-400');
        submitOrderButton.disabled = false;
        submitOrderButton.textContent = 'Submit Inquiry';
        return;
    }

    if (!token) { 
        console.error("Order Page JS: JWT is null/undefined after attempting to get it.");
        orderFormMessage.textContent = 'Authentication token missing. Please try logging out and in again.';
        orderFormMessage.classList.add('text-red-400');
        submitOrderButton.disabled = false;
        submitOrderButton.textContent = 'Submit Inquiry';
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/service-order-created', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(dataToSend) 
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}. Please try again.`}));
            orderFormMessage.textContent = `Error: ${escapeHTML(errorData.message || errorData.error || 'Could not submit your inquiry.')}`;
            orderFormMessage.className = 'mt-4 text-center text-sm text-red-400';
            console.error("Order Page JS: Error response from Netlify Function:", errorData);
        } else {
            window.location.href = '/thank-you-order.html'; 
        }

    } catch (error) { 
        console.error('Order Page JS: Client-side fetch error:', error);
        orderFormMessage.textContent = 'A network connection error occurred. Please check your connection and try again.';
        orderFormMessage.className = 'mt-4 text-center text-sm text-red-400';
    } finally {
        // Re-enable button only if we haven't redirected (i.e., an error occurred)
        if (submitOrderButton && window.location.pathname.endsWith('/order.html')) { 
             submitOrderButton.disabled = false;
             submitOrderButton.textContent = 'Submit Inquiry';
        }
    }
}

export function initOrderPage() {
    // Check for a unique wrapper ID for the order page's main interactive section
    const orderPageSection = document.getElementById('order-services-form-section');
    if (!orderPageSection) { 
        return; // Not on the order page, or main section missing
    }
    console.log("Order Page JS: Initializing for /order.html");

    // Ensure all specific elements are queryable before proceeding
    if (!orderForm || !orderLoginPrompt || !orderFormContainer || !submitOrderButton || !orderFormMessage) {
        console.warn("Order Page JS: One or more required DOM elements not found. Functionality may be limited.");
        if(orderLoginPrompt) orderLoginPrompt.classList.remove('hidden'); // Default to showing login prompt if elements are missing
        if(orderFormContainer) orderFormContainer.classList.add('hidden');
        return;
    }
    
    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    
    if (user) {
        showOrderFormUI(user);
        orderForm.removeEventListener('submit', handleOrderFormSubmit); // Prevent duplicate listeners
        orderForm.addEventListener('submit', handleOrderFormSubmit);
    } else {
        showOrderLoginPromptUI();
    }
    
    // Listen for login/logout events to dynamically update this page's UI
    if (window.netlifyIdentity) {
        const updateUserSpecificUI = (eventUser) => {
            // Only run if we are on the order page
            if (document.getElementById('order-services-form-section')) {
                console.log(`Order Page JS: Netlify Identity event detected on order page. User:`, eventUser ? eventUser.email : 'null');
                if (eventUser) {
                    showOrderFormUI(eventUser);
                    if (orderForm) {
                        orderForm.removeEventListener('submit', handleOrderFormSubmit);
                        orderForm.addEventListener('submit', handleOrderFormSubmit);
                    }
                } else {
                    showOrderLoginPromptUI();
                }
            }
        };
        window.netlifyIdentity.on('login', updateUserSpecificUI);
        window.netlifyIdentity.on('logout', () => updateUserSpecificUI(null));
        // init event already handled by main.js and auth.js, but we ensure this page reacts.
        // The initial setup of `user` above should handle the 'init' state correctly.
    }
}