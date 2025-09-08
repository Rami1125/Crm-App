/**
 * @file app.js
 * @description Main client-side logic for the Container Management CRM PWA.
 * Handles data fetching, UI updates, event listeners, and notifications.
 */

// --- 1. CONFIGURATION & SETUP ---
const API_URL = 'https://script.google.com/macros/s/AKfycbx5Wu5wPWnRI8tRT93KYxSeRNDxlyjwUi2lAr7Qg5G9AHKgcUDJpbSUPcNRdalqYEZv/exec';
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBV_2JwCLtow5F6C7463NmfP2py5W-fj5I",
    authDomain: "hsaban94-cc777.firebaseapp.com",
    projectId: "hsaban94-cc777",
    storageBucket: "hsaban94-cc777.appspot.com",
    messagingSenderId: "299206369469",
    appId: "1:299206369469:web:50ca90c58f1981ec9457d4"
};

// --- 2. STATE MANAGEMENT ---
let currentClient = {
    id: null,
    name: null
};
let etaInterval = null;

// --- 3. DOM ELEMENT SELECTORS ---
const dom = {
    loader: document.getElementById('loader'),
    appContainer: document.querySelector('.app-container'),
    appContent: document.getElementById('app-content'),
    clientName: document.getElementById('client-name'),
    activeOrderSection: document.getElementById('active-order-section'),
    noActiveOrder: document.getElementById('no-active-order'),
    statusBadge: document.getElementById('status-badge'),
    orderAddress: document.getElementById('order-address'),
    orderId: document.getElementById('order-id'),
    daysOnSite: document.getElementById('days-on-site'),
    endDate: document.getElementById('end-date'),
    lastAction: document.getElementById('last-action'),
    historyList: document.getElementById('history-list'),
    requestSwapBtn: document.getElementById('request-swap-btn'),
    requestRemovalBtn: document.getElementById('request-removal-btn'),
    notificationModal: document.getElementById('notification-modal'),
    confirmNotificationsBtn: document.getElementById('confirm-notifications'),
    cancelNotificationsBtn: document.getElementById('cancel-notifications'),
    progressBar: document.getElementById('order-progress-bar'),
    progressStartDate: document.getElementById('progress-start-date'),
    progressEndDate: document.getElementById('progress-end-date'),
    toastContainer: document.getElementById('toast-container'),
    driverStatusOverlay: document.getElementById('driver-status-overlay'),
    etaTimer: document.getElementById('eta-timer'),
};

// --- 4. APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded. Initializing app...');
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('id');

    if (!clientId) {
        showError('שגיאה: לא זוהה מספר לקוח בכתובת ה-URL.');
        return;
    }
    
    currentClient.id = clientId;
    console.log(`Client ID found: ${clientId}`);

    initializeFirebase(clientId);
    loadClientData(clientId);
});

// --- 5. CORE LOGIC ---
async function loadClientData(clientId) {
    showLoader(true, 'טוען נתונים...');
    try {
        const response = await fetch(`${API_URL}?id=${clientId}`);
        if (!response.ok) throw new Error(`שגיאת רשת: ${response.status}`);
        
        const data = await response.json();
        if (data.error) throw new Error(`שגיאה מהשרת: ${data.error}`);
        
        console.log("Parsed data object:", data);
        updateUI(data);

    } catch (error) {
        console.error('CRITICAL ERROR during data loading:', error);
        showError(`אופס, משהו השתבש.<br>${error.message}`);
    } finally {
        showLoader(false);
    }
}

/**
 * Updates the User Interface with the data received from the API.
 * ⭐ NEW: This version includes robust checks to prevent errors if DOM elements are missing.
 * @param {object} data The structured data object for the client.
 */
function updateUI(data) {
    try {
        console.log("Starting UI update...");
        const clientInfo = data.clientInfo || { name: 'לקוח יקר' };
        const activeOrder = data.activeOrder;
        const orderHistory = data.orderHistory || [];

        // Check for driver status first
        if (activeOrder && activeOrder.driverStatus === 'en_route' && activeOrder.eta) {
            showDriverStatusScreen(activeOrder.eta);
            return; 
        }
        showMainAppScreen();
    
        // --- Client Info ---
        if (dom.clientName) {
            currentClient.name = clientInfo.name || 'לקוח יקר';
            dom.clientName.textContent = `שלום, ${currentClient.name}`;
            console.log("Client name updated.");
        } else {
            console.error("DOM element #client-name not found.");
        }

        // --- Active Order Section ---
        if (activeOrder && activeOrder.orderId) {
            if(dom.activeOrderSection) dom.activeOrderSection.style.display = 'block';
            if(dom.noActiveOrder) dom.noActiveOrder.style.display = 'none';

            if(dom.statusBadge) {
                dom.statusBadge.textContent = activeOrder.status || 'לא ידוע';
                dom.statusBadge.className = `status-badge ${getBadgeClass(activeOrder.status)}`;
            }
            if(dom.orderAddress) dom.orderAddress.textContent = activeOrder.address || 'לא צוינה';
            if(dom.orderId) dom.orderId.textContent = activeOrder.orderId || 'N/A';
            if(dom.daysOnSite) dom.daysOnSite.textContent = activeOrder.daysOnSite || '0';
            if(dom.lastAction) dom.lastAction.textContent = activeOrder.lastAction || 'N/A';
            
            updateProgressBar(activeOrder);
            console.log("Active order section populated.");
        } else {
            if(dom.activeOrderSection) dom.activeOrderSection.style.display = 'none';
            if(dom.noActiveOrder) dom.noActiveOrder.style.display = 'block';
            console.log("No active order found. Displaying 'no order' message.");
        }

        // --- Order History ---
        if (dom.historyList) {
            dom.historyList.innerHTML = '';
            if (orderHistory.length > 0) {
                const historyFragment = document.createDocumentFragment();
                orderHistory.forEach(order => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.innerHTML = `...`; // Content omitted for brevity, same as before
                    historyFragment.appendChild(item);
                });
                dom.historyList.appendChild(historyFragment);
                console.log("History section populated.");
            } else {
                dom.historyList.innerHTML = '<div class="empty-state">לא נמצאה היסטוריית הזמנות.</div>';
            }
        } else {
             console.error("DOM element #history-list not found.");
        }
        
        console.log('UI update process finished.');

    } catch (error) {
        console.error("A critical error occurred within the main updateUI function:", error);
        showError('שגיאה קריטית בעדכון הממשק.');
    }
}


// --- 6. EVENT LISTENERS & ACTIONS ---
if(dom.requestSwapBtn) dom.requestSwapBtn.addEventListener('click', () => handleAction('swap'));
if(dom.requestRemovalBtn) dom.requestRemovalBtn.addEventListener('click', () => handleAction('removal'));
if(dom.confirmNotificationsBtn) dom.confirmNotificationsBtn.addEventListener('click', requestNotificationPermission);
if(dom.cancelNotificationsBtn) dom.cancelNotificationsBtn.addEventListener('click', () => {
    if (dom.notificationModal) dom.notificationModal.style.display = 'none';
});

async function handleAction(actionType) {
    // ... (same as before)
}

// --- 7. HELPER & UI FUNCTIONS ---
function updateProgressBar(order) {
    if (!dom.progressBar || !dom.progressStartDate || !dom.progressEndDate || !order.startDate || !order.endDate) return;
    try {
        // ... (same as before)
    } catch(e) {
        console.error("Could not parse dates for progress bar:", order.startDate, order.endDate);
    }
}

function showLoader(visible, text = '') {
    // ... (same as before)
}

function showError(message) {
    // ... (same as before)
}

function getBadgeClass(status = "") {
    // ... (same as before)
}

function showToast(message, type = 'info') {
    // ... (same as before)
}

function showDriverStatusScreen(etaTimestamp) {
    // ... (same as before)
}

function showMainAppScreen() {
    // ... (same as before)
}

function startEtaTimer(etaTimestamp) {
    // ... (same as before)
}


// --- 8. PUSH NOTIFICATIONS LOGIC ---
function initializeFirebase(clientId) {
    // ... (same as before)
}

function setupNotifications(messaging, clientId) {
    // ... (same as before)
}

async function requestNotificationPermission() {
    // ... (same as before)
}

async function retrieveToken(messaging, clientId) {
    // ... (same as before)
}

async function sendTokenToServer(clientId, token) {
    // ... (same as before)
}

