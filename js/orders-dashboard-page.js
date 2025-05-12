// js/orders-dashboard-page.js
import { escapeHTML } from './main.js'; // Assuming escapeHTML is in main.js

const ordersDashboardContent = document.getElementById('orders-dashboard-content');
const ordersUnauthorizedPrompt = document.getElementById('orders-unauthorized-prompt');
const ordersLoadingDiv = document.getElementById('orders-loading');
const ordersNoneFoundDiv = document.getElementById('orders-none-found');
const ordersListContainer = document.getElementById('orders-list-container');

// Filter buttons
const filterButtons = document.querySelectorAll('.order-filter-btn');
let currentFilter = 'new'; // Default filter

let currentUserContext = null; // To store the current logged-in user for reuse

// Function to render a single order card
function renderOrderCard(order, canManageOrders) {
    const card = document.createElement('div');
    card.className = 'bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700/50 space-y-3';

    let statusColor = 'text-slate-400';
    switch (order.status) {
        case 'new': statusColor = 'text-blue-400'; break;
        case 'in-progress': statusColor = 'text-yellow-400'; break;
        case 'completed': statusColor = 'text-green-400'; break;
        case 'rejected': statusColor = 'text-red-400'; break;
    }

    let managerControlsHTML = '';
    if (canManageOrders) {
        managerControlsHTML = `
            <div class="mt-4 pt-4 border-t border-slate-700/50">
                <label for="status-select-${order.id}" class="block text-sm font-medium text-slate-300 mb-1">Update Status:</label>
                <select id="status-select-${order.id}" data-order-id="${order.id}" class="status-update-select w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="new" ${order.status === 'new' ? 'selected' : ''}>New</option>
                    <option value="in-progress" ${order.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="rejected" ${order.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <h3 class="text-lg font-semibold text-pink-400">${escapeHTML(order.customer_name)} <span class="text-xs text-slate-500">(${escapeHTML(order.customer_email)})</span></h3>
            <span class="text-sm font-medium ${statusColor}">${order.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
        </div>
        <p class="text-slate-300"><strong class="text-slate-100">Service:</strong> ${escapeHTML(order.service_type)}</p>
        <p class="text-slate-300"><strong class="text-slate-100">Details:</strong></p>
        <p class="text-slate-400 text-sm whitespace-pre-wrap bg-slate-700/30 p-3 rounded-md max-h-32 overflow-y-auto">${escapeHTML(order.project_details)}</p>
        <p class="text-xs text-slate-500">Order ID: ${order.id}</p>
        <p class="text-xs text-slate-500">Received: ${new Date(order.created_at).toLocaleString()}</p>
        ${order.last_updated_at ? `<p class="text-xs text-slate-500">Last Update: ${new Date(order.last_updated_at).toLocaleString()}</p>` : ''}
        ${managerControlsHTML}
    `;
    return card;
}

// Function to fetch and display orders
async function fetchAndDisplayOrders(filterStatus = 'new') {
    if (!currentUserContext || !ordersListContainer || !ordersLoadingDiv || !ordersNoneFoundDiv) {
        console.warn("Orders Dashboard: Missing current user or DOM elements for displaying orders.");
        if(ordersLoadingDiv) ordersLoadingDiv.classList.add('hidden'); // Hide loading if it was shown
        return;
    }

    ordersListContainer.innerHTML = ''; // Clear previous orders
    ordersLoadingDiv.classList.remove('hidden');
    ordersNoneFoundDiv.classList.add('hidden');
    currentFilter = filterStatus; // Update current filter

    // Update active state of filter buttons
    filterButtons.forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'ring-2', 'ring-indigo-400');
        btn.classList.add(btn.id === `filter-${filterStatus}` ? 'bg-indigo-600' : (btn.id === 'filter-new' ? 'bg-blue-500' : (btn.id === 'filter-in-progress' ? 'bg-yellow-500' : (btn.id === 'filter-completed' ? 'bg-green-500' : (btn.id === 'filter-rejected' ? 'bg-red-500' : 'bg-slate-600')))));
        if (btn.id === `filter-${filterStatus}`) {
             btn.classList.add('ring-2', 'ring-indigo-400');
        }
    });


    try {
        const token = await currentUserContext.jwt(true);
        const response = await fetch(`/.netlify/functions/get-service-orders?status=${filterStatus}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        ordersLoadingDiv.classList.add('hidden');

        if (!response.ok) {
            if (response.status === 401) { // Unauthorized specifically
                showUnauthorizedAccess();
                return;
            }
            const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
            ordersListContainer.innerHTML = `<p class="text-red-400 text-center">Error loading orders: ${escapeHTML(errorData.error)}</p>`;
            return;
        }

        const orders = await response.json();
        if (orders.length === 0) {
            ordersNoneFoundDiv.classList.remove('hidden');
        } else {
            const userRoles = currentUserContext.app_metadata.roles || [];
            const canManage = userRoles.includes('order_manager') || userRoles.includes('ceo');
            
            orders.forEach(order => {
                ordersListContainer.appendChild(renderOrderCard(order, canManage));
            });

            if (canManage) {
                document.querySelectorAll('.status-update-select').forEach(selectElement => {
                    selectElement.addEventListener('change', handleStatusUpdate);
                });
            }
        }
    } catch (error) {
        console.error("Orders Dashboard: Error fetching orders:", error);
        ordersLoadingDiv.classList.add('hidden');
        ordersListContainer.innerHTML = `<p class="text-red-400 text-center">An error occurred while fetching orders. Please try again.</p>`;
    }
}

// Function to handle status updates
async function handleStatusUpdate(event) {
    const selectElement = event.target;
    const orderId = selectElement.dataset.orderId;
    const newStatus = selectElement.value;

    if (!currentUserContext || !orderId || !newStatus) {
        alert("Error: Missing information to update status.");
        return;
    }
    
    // Temporarily disable select while processing
    selectElement.disabled = true;
    const originalStatus = Array.from(selectElement.options).find(opt => opt.selected)?.dataset.originalStatus || selectElement.querySelector(`option[value="${newStatus}"]`).textContent; // A bit complex to get original if not stored

    try {
        const token = await currentUserContext.jwt(true);
        const response = await fetch('/.netlify/functions/update-service-order-status', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId, newStatus })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: "Server error"}));
            alert(`Failed to update status: ${errorData.error}`);
            // Revert select to original value on failure (more complex, for now just re-enable)
            selectElement.disabled = false; 
            return;
        }
        
        // alert(`Order ${orderId} status updated to ${newStatus}.`);
        // For better UX, update the card directly or re-fetch the current filter
        fetchAndDisplayOrders(currentFilter); // Re-fetch to show updated list / remove if status changed it from current filter

    } catch (error) {
        console.error("Orders Dashboard: Error updating status:", error);
        alert("An error occurred while updating status.");
        selectElement.disabled = false;
    }
}


function showUnauthorizedAccess() {
    if (ordersDashboardContent) ordersDashboardContent.classList.add('hidden');
    if (ordersUnauthorizedPrompt) ordersUnauthorizedPrompt.classList.remove('hidden');
    if (ordersLoadingDiv) ordersLoadingDiv.classList.add('hidden');
}

function showDashboard(user) {
    if (ordersDashboardContent) ordersDashboardContent.classList.remove('hidden');
    if (ordersUnauthorizedPrompt) ordersUnauthorizedPrompt.classList.add('hidden');
    fetchAndDisplayOrders(currentFilter); // Fetch with default/current filter
}


// Main initialization function for this page/module
export function initOrdersDashboardPage() {
    if (!ordersDashboardContent) {
        // console.log("Orders Dashboard: Not on the orders dashboard page or main element missing.");
        return;
    }
    console.log("Orders Dashboard: Initializing page...");
    currentUserContext = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;

    if (currentUserContext) {
        const roles = currentUserContext.app_metadata.roles || [];
        if (roles.includes('employee') || roles.includes('order_manager') || roles.includes('ceo')) {
            showDashboard(currentUserContext);
            // Add event listeners to filter buttons
            filterButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const filterValue = e.target.id.replace('filter-', '');
                    fetchAndDisplayOrders(filterValue);
                });
            });
        } else {
            showUnauthorizedAccess();
        }
    } else {
        showUnauthorizedAccess();
    }

    // Listen for login/logout to re-evaluate access on this page
     if (window.netlifyIdentity) {
        window.netlifyIdentity.on('login', (user) => {
            if(window.location.pathname.includes('/orders-dashboard.html')) {
                currentUserContext = user;
                initOrdersDashboardPage(); // Re-initialize based on new user
            }
        });
        window.netlifyIdentity.on('logout', () => {
             if(window.location.pathname.includes('/orders-dashboard.html')) {
                currentUserContext = null;
                initOrdersDashboardPage(); // Re-initialize, will show unauthorized
            }
        });
    }
}