// js/order-page.js
import { escapeHTML } from './main.js';

const orderForm = document.getElementById('service-order-form');
const submitOrderButton = document.getElementById('submit-order-button');
const orderFormMessage = document.getElementById('order-form-message');
const orderLoginPrompt = document.getElementById('order-login-prompt');
const orderFormContainer = document.getElementById('order-form-container');
const orderPageSubtitle = document.getElementById('order-page-subtitle');


function showOrderForm(user) {
    if (orderFormContainer) orderFormContainer.classList.remove('hidden');
    if (orderLoginPrompt) orderLoginPrompt.classList.add('hidden');
    if (orderPageSubtitle) orderPageSubtitle.textContent = "Please fill out the form below to tell us about your project needs. We'll be in touch soon!";


    // Pre-fill form if user is logged in
    if (user && orderForm) {
        const nameInput = orderForm.querySelector('input[name="name"]');
        const emailInput = orderForm.querySelector('input[name="email"]');
        if (nameInput && user.user_metadata && user.user_metadata.full_name && !nameInput.value) {
            nameInput.value = user.user_metadata.full_name;
        }
        if (emailInput && user.email && !emailInput.value) {
            emailInput.value = user.email;
            // Optionally make email readonly if pre-filled from authenticated user
            // emailInput.readOnly = true;
            // emailInput.classList.add('bg-slate-600', 'cursor-not-allowed', 'opacity-70');
        }
    }
}

function showOrderLoginPrompt() {
    if (orderFormContainer) orderFormContainer.classList.add('hidden');
    if (orderLoginPrompt) orderLoginPrompt.classList.remove('hidden');
    if (orderPageSubtitle) orderPageSubtitle.textContent = "Log in to place an order and track its progress in your profile.";
}


async function handleOrderFormSubmit(event) {
    event.preventDefault(); // Always prevent default now, as JS handles it

    if (!orderForm || !submitOrderButton || !orderFormMessage) {
        console.error("Order form elements missing.");
        return;
    }

    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    if (!user) {
        orderFormMessage.textContent = 'Please log in to submit an order.';
        orderFormMessage.className = 'mt-4 text-center text-sm text-red-400';
        showOrderLoginPrompt(); // Re-show login prompt just in case
        return;
    }

    submitOrderButton.disabled = true;
    submitOrderButton.textContent = 'Submitting...';
    orderFormMessage.textContent = '';
    orderFormMessage.className = 'mt-4 text-center text-sm';

    const formData = new FormData(orderForm);
    const formProps = Object.fromEntries(formData);

    const dataToSend = {
        name: formProps.name,
        email: formProps.email, // User might change prefilled, or you can enforce user.email
        phone: formProps.phone,
        service_type: formProps.service_type,
        details: formProps.details
    };
    
    let headers = { 'Content-Type': 'application/json' };
    try {
        const token = await user.jwt(true);
        headers['Authorization'] = `Bearer ${token}`;
    } catch (err) {
        console.error("Error getting JWT for order submission:", err);
        orderFormMessage.textContent = 'Authentication error. Please refresh and try logging in again.';
        orderFormMessage.classList.add('text-red-400');
        submitOrderButton.disabled = false;
        submitOrderButton.textContent = 'Submit Inquiry';
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/service-order-created', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(dataToSend) // Send data directly, not nested under payload.data
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}`}));
            orderFormMessage.textContent = `Error: ${errorData.error || 'Could not submit your inquiry.'}`;
            orderFormMessage.classList.add('text-red-400');
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        orderFormMessage.textContent = result.message || 'Your inquiry has been submitted successfully! We will get back to you soon.';
        orderFormMessage.classList.add('text-green-400');
        orderForm.reset(); 

    } catch (error) {
        console.error('Error submitting order inquiry via JS:', error);
        if (!orderFormMessage.textContent.toLowerCase().includes('error')) {
             orderFormMessage.textContent = 'An error occurred while submitting. Please try again or contact us directly.';
             orderFormMessage.classList.add('text-red-400');
        }
    } finally {
        submitOrderButton.disabled = false;
        submitOrderButton.textContent = 'Submit Inquiry';
    }
}

export function initOrderPage() {
    if (!orderForm && !orderLoginPrompt && !orderFormContainer) {
        // Not on the order page, or elements are missing
        return; 
    }
    console.log("Order Page Initializing...");

    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    if (user) {
        showOrderForm(user);
        if (orderForm) {
            orderForm.removeEventListener('submit', handleOrderFormSubmit); // Remove if already added
            orderForm.addEventListener('submit', handleOrderFormSubmit);
        }
    } else {
        showOrderLoginPrompt();
    }
    
    // Listen for login/logout to toggle form visibility on this page
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on('login', (loggedInUser) => {
            if(window.location.pathname.includes('/order.html')) showOrderForm(loggedInUser);
        });
        window.netlifyIdentity.on('logout', () => {
            if(window.location.pathname.includes('/order.html')) showOrderLoginPrompt();
        });
    }
}