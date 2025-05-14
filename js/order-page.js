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

    if (user && orderForm) {
        const nameInput = orderForm.querySelector('input[name="name"]');
        const emailInput = orderForm.querySelector('input[name="email"]');
        if (nameInput && user.user_metadata && user.user_metadata.full_name && !nameInput.value) {
            nameInput.value = user.user_metadata.full_name;
        }
        if (emailInput && user.email && !emailInput.value) {
            emailInput.value = user.email;
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
        console.error("Order Page: Crucial form elements missing for submission.");
        return;
    }

    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    if (!user) {
        orderFormMessage.textContent = 'Please log in to submit an order.';
        orderFormMessage.className = 'mt-4 text-center text-sm text-red-400';
        showOrderLoginPrompt(); 
        return;
    }

    submitOrderButton.disabled = true;
    submitOrderButton.textContent = 'Submitting...';
    orderFormMessage.textContent = '';
    orderFormMessage.className = 'mt-4 text-center text-sm';

    const formData = new FormData(orderForm);
    const formProps = Object.fromEntries(formData);

    // This is the payload that service-order-created.js expects directly
    const dataToSend = {
        title: formProps.name,
        email: formProps.email,
        phone: formProps.phone,
        service_type: formProps.service_type,
        details: formProps.details
    };
    
    let headers = { 'Content-Type': 'application/json' };
    let token;
    try {
        token = await user.jwt(true); // true forces refresh if token is stale
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

    if (!token) { // Should not happen if user object exists, but defensive check
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
            orderFormMessage.textContent = `Error: ${escapeHTML(errorData.error || 'Could not submit your inquiry.')}`;
            orderFormMessage.classList.add('text-red-400');
            console.error("Order Page: Error response from service-order-created:", errorData);
            // Do not throw error here to allow finally block to run
        } else {
            const result = await response.json();
            orderFormMessage.textContent = escapeHTML(result.message || 'Your inquiry has been submitted successfully! We will get back to you soon.');
            order_form_message.className = 'mt-4 text-center text-sm text-green-400'; // Ensure green on success
            orderForm.reset(); 
        }

    } catch (error) {
        console.error('Order Page: Error submitting order inquiry via JS fetch:', error);
        orderFormMessage.textContent = 'A network error occurred. Please check your connection and try again.';
        orderFormMessage.classList.add('text-red-400');
    } finally {
        submitOrderButton.disabled = false;
        submitOrderButton.textContent = 'Submit Inquiry';
    }
}

export function initOrderPage() {
    if (!document.getElementById('service-order-form') && !document.getElementById('order-login-prompt')) {
        return; // Not on the order page, or essential elements are missing
    }
    console.log("Order Page: Initializing logic...");

    const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
    if (user) {
        if (orderFormContainer) showOrderForm(user); // Ensure container is defined
        if (orderForm) {
            orderForm.removeEventListener('submit', handleOrderFormSubmit); 
            orderForm.addEventListener('submit', handleOrderFormSubmit);
        }
    } else {
        if (orderLoginPrompt) showOrderLoginPrompt(); // Ensure container is defined
    }
    
    if (window.netlifyIdentity) {
        const handleLogin = (loggedInUser) => {
            if (window.location.pathname.includes('/order.html') && orderFormContainer) {
                console.log("Order Page: User logged in, showing form.");
                showOrderForm(loggedInUser);
                 if (orderForm) { // Re-add listener in case it was missed or for safety
                    orderForm.removeEventListener('submit', handleOrderFormSubmit); 
                    orderForm.addEventListener('submit', handleOrderFormSubmit);
                }
            }
        };
        const handleLogout = () => {
            if (window.location.pathname.includes('/order.html') && orderLoginPrompt) {
                console.log("Order Page: User logged out, showing login prompt.");
                showOrderLoginPrompt();
            }
        };

        window.netlifyIdentity.on('login', handleLogin);
        window.netlifyIdentity.on('logout', handleLogout);

        // Also handle if init event provides user after DOMContentLoaded but before login event
        window.netlifyIdentity.on('init', (initializedUser) => {
             if (window.location.pathname.includes('/order.html')) {
                if (initializedUser) {
                    console.log("Order Page: User already initialized, showing form.");
                    showOrderForm(initializedUser);
                     if (orderForm) {
                        orderForm.removeEventListener('submit', handleOrderFormSubmit); 
                        orderForm.addEventListener('submit', handleOrderFormSubmit);
                    }
                } else if(orderLoginPrompt) { // Only show prompt if user is null AND on order page
                    console.log("Order Page: No user on init, showing login prompt.");
                    showOrderLoginPrompt();
                }
            }
        });
    }
}