// js/order-page.js
import { escapeHTML } from './main.js'; // Ensure main.js exports this

// Get DOM elements. These will be null if not on the order.html page.
const orderForm = document.getElementById('service-order-form');
const submitOrderButton = document.getElementById('submit-order-button');
const orderFormMessage = document.getElementById('order-form-message');
const orderLoginPrompt = document.getElementById('order-login-prompt');
const orderFormContainer = document.getElementById('order-form-container');
const orderPageSubtitle = document.getElementById('order-page-subtitle'); // Optional: for changing subtitle text

function showOrderForm(user) {
    if (orderFormContainer) orderFormContainer.classList.remove('hidden');
    if (orderLoginPrompt) orderLoginPrompt.classList.add('hidden');
    if (orderPageSubtitle) orderPageSubtitle.textContent = "Please fill out the form below to tell us about your project needs. We'll be in touch soon!";

    // Pre-fill form if user is logged in and form exists
    if (user && orderForm) {
        const nameInput = orderForm.querySelector('input[name="name"]');
        const emailInput = orderForm.querySelector('input[name="email"]');
        
        if (nameInput && user.user_metadata && user.user_metadata.full_name && !nameInput.value) {
            nameInput.value = user.user_metadata.full_name;
        }
        if (emailInput && user.email && !emailInput.value) {
            emailInput.value = user.email;
            // Optional: Make email readonly if pre-filled from authenticated user
            // emailInput.readOnly = true;
            // emailInput.classList.add('bg-slate-600', 'opacity-70'); // Visual cue for readonly
        }
    }
}

function showOrderLoginPrompt() {
    if (orderFormContainer) orderFormContainer.classList.add('hidden');
    if (orderLoginPrompt) orderLoginPrompt.classList.remove('hidden');
    if (orderPageSubtitle) orderPageSubtitle.textContent = "Log in to place an order and track its progress in your profile.";
}

async function handleOrderFormSubmit(event) {
    event.preventDefault(); 

    if (!orderForm || !submitOrderButton || !orderFormMessage) {
        console.error("Order Page: Crucial form elements missing for submission handler.");
        return;
    }

    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    if (!user) {
        orderFormMessage.textContent = 'SESSION EXPIRED: Please log in again to submit an order.';
        orderFormMessage.className = 'mt-4 text-center text-sm text-red-400';
        showOrderLoginPrompt(); // Re-show login prompt
        return;
    }

    submitOrderButton.disabled = true;
    submitOrderButton.textContent = 'Submitting...';
    orderFormMessage.textContent = '';
    orderFormMessage.className = 'mt-4 text-center text-sm'; // Reset classes

    const formData = new FormData(orderForm);
    const formProps = Object.fromEntries(formData);

    // This is the payload structure expected by your functions/service-order-created.js
    const dataToSend = {
        customer_name: formProps.name, // Matches the 'name' attribute of the input field
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
        console.log("Order Page: Sending JWT for user:", user.email);
    } catch (err) {
        console.error("Order Page: Error getting JWT for order submission:", err);
        orderFormMessage.textContent = 'Authentication error. Please refresh and try logging in again.';
        orderFormMessage.classList.add('text-red-400');
        submitOrderButton.disabled = false;
        submitOrderButton.textContent = 'Submit Inquiry';
        return;
    }

    if (!token) { 
        console.error("Order Page: JWT is null or undefined after attempting to get it.");
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
            console.error("Order Page: Error response from service-order-created:", errorData);
        } else {
            const result = await response.json();
            // Redirect to a thank-you page on success
            window.location.href = '/thank-you-order.html'; 
            // If you want to pass orderId: `/thank-you-order.html?orderId=${result.orderId}`
            // orderFormMessage.textContent = escapeHTML(result.message || 'Your inquiry has been submitted successfully!');
            // orderFormMessage.className = 'mt-4 text-center text-sm text-green-400'; 
            // orderForm.reset(); 
        }

    } catch (error) { 
        console.error('Order Page: Error submitting order inquiry via JS fetch:', error);
        orderFormMessage.textContent = 'A network connection error occurred. Please check your connection and try again.';
        orderFormMessage.className = 'mt-4 text-center text-sm text-red-400';
    } finally {
        // Re-enable button only if there was an error and we didn't redirect
        if (submitOrderButton && !window.location.pathname.endsWith('/thank-you-order.html')) {
             submitOrderButton.disabled = false;
             submitOrderButton.textContent = 'Submit Inquiry';
        }
    }
}

// This function is exported and called by main.js if the order form element is present
export function initOrderPage() {
    // Ensure we are on the order page by checking for a specific element unique to it,
    // or rely on main.js to only call this if 'service-order-form' exists.
    if (!document.getElementById('service-order-form-section')) { 
        // console.log("Order Page: Not on order page or main section missing, skipping init.");
        return;
    }
    console.log("Order Page: Initializing logic...");

    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    
    if (user) {
        if (orderFormContainer) showOrderForm(user);
        if (orderForm) {
            orderForm.removeEventListener('submit', handleOrderFormSubmit); 
            orderForm.addEventListener('submit', handleOrderFormSubmit);
        } else {
            console.warn("Order Page: orderForm element not found for logged-in user setup.");
        }
    } else {
        if (orderLoginPrompt) showOrderLoginPrompt();
    }
    
    // Setup listeners for auth state changes specific to this page's needs
    if (window.netlifyIdentity) {
        const reEvaluateOrderPageDisplay = (eventUser) => {
            if (window.location.pathname.includes('/order.html')) { // Only act if on order page
                console.log(`Order Page: Netlify Identity event '${event.type}' with user:`, eventUser ? eventUser.email : 'null');
                if (eventUser) {
                    if (orderFormContainer) showOrderForm(eventUser);
                    if (orderForm) { // Re-attach listener if form is now shown
                        orderForm.removeEventListener('submit', handleOrderFormSubmit);
                        orderForm.addEventListener('submit', handleOrderFormSubmit);
                    }
                } else {
                    if (orderLoginPrompt) showOrderLoginPrompt();
                }
            }
        };

        window.netlifyIdentity.on('login', reEvaluateOrderPageDisplay);
        window.netlifyIdentity.on('logout', () => reEvaluateOrderPageDisplay(null));
        // The 'init' event in auth.js already handles initial state, but if needed here too:
        // window.netlifyIdentity.on('init', reEvaluateOrderPageDisplay); 
    }
}