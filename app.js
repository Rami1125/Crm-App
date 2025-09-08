/**
 * @file app.js
 * @description Main client-side logic for the Container Management CRM PWA.
 * Handles data fetching, UI updates, event listeners, and notifications.
 */

// --- 1. CONFIGURATION & SETUP ---
// Instructions: Replace this URL with your own Google Apps Script deployment URL.
const API_URL = 'https://script.google.com/macros/s/AKfycbzldGUaX-PP-_w7PiX5s3v0XD72XkPwZDnPvqNeC4_wKrjWdZDPbgbLg4l1rz_ms4iX/exec'; // Example URL, replace with your latest deployment

// Instructions: This is your Firebase project configuration.
// It is required for Push Notifications to work.
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

// --- 3. DOM ELEMENT SELECTORS ---
const dom = {
    loader: document.getElementById('loader'),
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
    notificationPrompt: document.getElementById('notification-prompt'),
    confirmNotificationsBtn: document.getElementById('confirm-notifications'),
    cancelNotificationsBtn: document.getElementById('cancel-notifications'),
    progressBar: document.getElementById('order-progress-bar'),
    progressStartDate: document.getElementById('progress-start-date'),
    progressEndDate: document.getElementById('progress-end-date'),
};

// --- 4. APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded. Initializing app...');
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('id');

    if (!clientId) {
        showError('שגיאה: לא זוהה מספר לקוח בכתובת ה-URL. יש לוודא שהכתובת כוללת `?id=NUMBER`');
        return;
    }
    
    currentClient.id = clientId;
    console.log(`Client ID found: ${clientId}`);

    initializeFirebase(clientId);
    loadClientData(clientId);
});

// --- 5. CORE LOGIC ---
async function loadClientData(clientId) {
    showLoader(true, 'טוען את נתוני המכולה שלך...');
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
 * This version includes robust checks to prevent errors if data or DOM elements are missing.
 * @param {object} data The structured data object for the client.
 */
function updateUI(data) {
    try {
        console.log("Starting UI update...");
        const clientInfo = data.clientInfo || { name: 'לקוח יקר' };
        const activeOrder = data.activeOrder;
        const orderHistory = data.orderHistory || [];

        // --- Client Info ---
        if (dom.clientName) {
            currentClient.name = clientInfo.name || 'לקוח יקר';
            dom.clientName.textContent = `שלום, ${currentClient.name}`;
            console.log("Client name updated.");
        } else {
            console.error("DOM element #client-name not found.");
        }

        // --- Active Order Section ---
        try {
            if (activeOrder && activeOrder.orderId) {
                console.log("Active order found. Populating details...");
                if(dom.activeOrderSection) dom.activeOrderSection.style.display = 'block';
                if(dom.noActiveOrder) dom.noActiveOrder.style.display = 'none';

                if(dom.statusBadge) {
                    dom.statusBadge.textContent = activeOrder.status || 'לא ידוע';
                    dom.statusBadge.className = `status-badge ${getBadgeClass(activeOrder.status)}`;
                }
                if(dom.orderAddress) dom.orderAddress.textContent = activeOrder.address || 'לא צוינה';
                if(dom.orderId) dom.orderId.textContent = activeOrder.orderId || 'N/A';
                if(dom.daysOnSite) dom.daysOnSite.textContent = activeOrder.daysOnSite || '0';
                if(dom.endDate) dom.endDate.textContent = activeOrder.endDate || 'N/A';
                if(dom.lastAction) dom.lastAction.textContent = activeOrder.lastAction || 'N/A';
                
                updateProgressBar(activeOrder);
                console.log("Active order section populated.");
            } else {
                console.log("No active order found. Displaying 'no order' message.");
                if(dom.activeOrderSection) dom.activeOrderSection.style.display = 'none';
                if(dom.noActiveOrder) dom.noActiveOrder.style.display = 'block';
            }
        } catch (e) {
            console.error("Error updating ACTIVE ORDER section:", e);
        }

        // --- Order History ---
        try {
            if (dom.historyList) {
                dom.historyList.innerHTML = '';
                if (orderHistory.length > 0) {
                    console.log(`Found ${orderHistory.length} items for history. Populating list...`);
                    const historyFragment = document.createDocumentFragment();
                    orderHistory.forEach(order => {
                        const item = document.createElement('div');
                        item.className = 'history-item';
                        item.innerHTML = `
                            <div class="icon-wrapper">
                                <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                            </div>
                            <div class="details">
                                <div class="title"><strong>${order.action || 'פעולה'}</strong> - תעודה: ${order.orderId || 'N/A'}</div>
                                <div class="meta">
                                    <span>${order.date || 'אין תאריך'}</span>
                                    <span class="separator">•</span>
                                    <span>${order.address || 'אין כתובת'}</span>
                                </div>
                            </div>
                            <div class="status-tag-wrapper">
                                <span class="status-tag ${getBadgeClass(order.status)}">${order.status || 'לא ידוע'}</span>
                            </div>
                        `;
                        historyFragment.appendChild(item);
                    });
                    dom.historyList.appendChild(historyFragment);
                    console.log("History section populated.");
                } else {
                    console.log("No history items found. Displaying empty state.");
                    dom.historyList.innerHTML = '<div class="empty-state">לא נמצאה היסטוריית הזמנות.</div>';
                }
            } else {
                 console.error("DOM element #history-list not found.");
            }
        } catch (e) {
            console.error("Error updating HISTORY section:", e);
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
    if(dom.notificationPrompt) dom.notificationPrompt.classList.remove('show');
});

async function handleAction(actionType) {
    const actionText = actionType === 'swap' ? 'החלפה' : 'פינוי';
    if (!confirm(`האם אתה בטוח שברצונך לבקש ${actionText}?`)) return;

    showLoader(true, 'שולח את בקשתך...');
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'logClientRequest',
                clientId: currentClient.id,
                clientName: currentClient.name,
                requestType: actionType
            })
        });
        if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
        
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);

        alert('בקשתך נשלחה בהצלחה! ניצור קשר בהקדם.');
    } catch (error) {
        console.error('Failed to send action request:', error);
        alert(`אופס, שליחת הבקשה נכשלה. (${error.message})`);
    } finally {
        showLoader(false);
    }
}

// --- 7. HELPER FUNCTIONS ---
function updateProgressBar(order) {
    if (!dom.progressBar || !order.startDate || !order.endDate) return;
    const start = new Date(order.startDate.split('/').reverse().join('-'));
    const end = new Date(order.endDate.split('/').reverse().join('-'));
    const today = new Date();
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        dom.progressBar.style.width = '0%';
        return;
    }
    const totalDuration = (end - start) / (1000 * 60 * 60 * 24);
    const elapsedDuration = (today - start) / (1000 * 60 * 60 * 24);
    let percentage = (elapsedDuration / totalDuration) * 100;
    percentage = Math.max(0, Math.min(percentage, 100));
    dom.progressBar.style.width = percentage + '%';
    if (percentage > 80) { dom.progressBar.style.backgroundColor = 'var(--color-danger)'; } 
    else if (percentage > 50) { dom.progressBar.style.backgroundColor = 'var(--color-accent)'; } 
    else { dom.progressBar.style.backgroundColor = 'var(--color-success)'; }
    if(dom.progressStartDate) dom.progressStartDate.textContent = order.startDate;
    if(dom.progressEndDate) dom.progressEndDate.textContent = order.endDate;
}

function showLoader(visible, text = '') {
    if (dom.loader) {
        dom.loader.style.display = visible ? 'block' : 'none';
        if (visible) dom.loader.textContent = text;
    }
    if (dom.appContent) {
        dom.appContent.style.display = visible ? 'none' : 'block';
    }
}

function showError(message) {
    if (dom.loader) {
        dom.loader.innerHTML = `<div class="error-state">${message}</div>`;
        dom.loader.style.display = 'block';
    }
    if (dom.appContent) {
        dom.appContent.style.display = 'none';
    }
}

function getBadgeClass(status = "") {
    const s = String(status || "").toLowerCase();
    if (s.includes('פתוח')) return 'open';
    if (s.includes('סגור')) return 'closed';
    return 'default';
}

// --- 8. PUSH NOTIFICATIONS LOGIC ---
function initializeFirebase(clientId) {
    try {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
            const messaging = firebase.messaging();
            setupNotifications(messaging, clientId);
        } else {
             console.warn("Firebase SDK not found or already initialized.");
        }
    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }
}

function setupNotifications(messaging, clientId) {
    if (Notification.permission === 'granted') {
        retrieveToken(messaging, clientId);
        return;
    }
    if (Notification.permission === 'denied') { return; }
    
    setTimeout(() => {
        if (dom.notificationPrompt) dom.notificationPrompt.classList.add('show');
    }, 3000);
}

async function requestNotificationPermission() {
    if (dom.notificationPrompt) dom.notificationPrompt.classList.remove('show');
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            const clientId = new URLSearchParams(window.location.search).get('id');
            initializeFirebase(clientId);
        }
    } catch (error) {
        console.error('Error requesting notification permission', error);
    }
}

async function retrieveToken(messaging, clientId) {
    try {
        const vapidKey = 'YOUR_VAPID_PUBLIC_KEY'; // Replace with your key
        const currentToken = await messaging.getToken({ vapidKey: vapidKey });

        if (currentToken) {
            console.log('FCM Token:', currentToken);
            sendTokenToServer(clientId, currentToken);
        }
    } catch (err) {
        console.log('An error occurred while retrieving token. ', err);
    }
}

async function sendTokenToServer(clientId, token) {
    console.log(`Sending token to server for client ${clientId}...`);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'saveFCMToken',
                clientId: clientId,
                token: token
            })
        });
        if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);
        console.log('Token successfully saved on the server.');
    } catch (error) {
        console.error('Failed to send token to server:', error);
    }
}

