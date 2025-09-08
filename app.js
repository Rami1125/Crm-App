/**
 * @file app.js
 * @description Main client-side logic for the Container Management CRM PWA.
 * Handles data fetching, UI updates, event listeners, and notifications.
 */

// --- 1. CONFIGURATION & SETUP ---
// Instructions: Replace this URL with your own Google Apps Script deployment URL.
const API_URL = 'https://script.google.com/macros/s/AKfycbzZ_hW8oyMDbwdqbLJkU9wYl8OJ9JcW4WRFVHS86rYhzEGEgfKOiy0g1PhIz2Xws70p6w/exec';

// Instructions: Replace this with your actual Firebase project configuration.
// This is required for Push Notifications to work.
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBV_2JwCLtow5F6C7463NmfP2py5W-fj5I",
    authDomain: "hsaban94-cc777.firebaseapp.com",
    projectId: "hsaban94-cc777",
    storageBucket: "hsaban94-cc777.appspot.com",
    messagingSenderId: "299206369469",
    appId: "1:299206369469:web:50ca90c58f1981ec9457d4" // Replace with your web app's ID
};

// --- 2. DOM ELEMENT SELECTORS ---
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
};

// --- 3. APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded. Initializing app...');
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('id');

    if (!clientId) {
        showError('שגיאה: לא זוהה מספר לקוח בכתובת ה-URL.');
        return;
    }
    console.log(`Client ID found: ${clientId}`);

    initializeFirebase(clientId);
    loadClientData(clientId);
});

// --- 4. CORE LOGIC ---

/**
 * Fetches client data from the Google Apps Script API.
 * @param {string} clientId The ID of the client to fetch data for.
 */
async function loadClientData(clientId) {
    showLoader(true, 'טוען את נתוני המכולה שלך...');
    try {
        console.log(`Attempting to fetch data for client ID: ${clientId} from ${API_URL}`);
        const response = await fetch(`${API_URL}?id=${clientId}`);
        console.log('Fetch response received:', response);

        if (!response.ok) {
            throw new Error(`שגיאת רשת: השרת החזיר סטטוס ${response.status}`);
        }
        
        // --- Enhanced Debugging ---
        // First, get the raw text to see exactly what the server sent.
        const rawText = await response.text();
        console.log("Raw response text from server:", rawText);

        // Then, try to parse it as JSON.
        const data = JSON.parse(rawText);
        console.log("Parsed data object:", data);


        if (data.error) {
            throw new Error(`שגיאה מהשרת: ${data.error}`);
        }

        updateUI(data);
        console.log('UI updated successfully.');

    } catch (error) {
        console.error('Error in loadClientData:', error);
        showError(`אופס, משהו השתבש בטעינת הנתונים. ${error.message}`);
    } finally {
        showLoader(false);
    }
}

/**
 * Updates the User Interface with the data received from the API.
 * @param {object} data The structured data object for the client.
 */
function updateUI(data) {
    const { clientInfo, activeOrder, orderHistory } = data;

    // --- Client Info ---
    dom.clientName.textContent = clientInfo.name ? `שלום, ${clientInfo.name}` : 'לקוח יקר';

    // --- Active Order Section ---
    if (activeOrder && activeOrder.orderId) {
        dom.activeOrderSection.style.display = 'block';
        dom.noActiveOrder.style.display = 'none';

        dom.statusBadge.textContent = activeOrder.status || 'לא ידוע';
        dom.statusBadge.className = `status-badge ${getBadgeClass(activeOrder.status)}`;
        dom.orderAddress.textContent = activeOrder.address || 'לא צוינה';
        dom.orderId.textContent = activeOrder.orderId;
        dom.daysOnSite.textContent = activeOrder.daysOnSite;
        dom.endDate.textContent = activeOrder.endDate;
        dom.lastAction.textContent = activeOrder.lastAction;
    } else {
        dom.activeOrderSection.style.display = 'none';
        dom.noActiveOrder.style.display = 'block';
    }

    // --- Order History ---
    dom.historyList.innerHTML = '';
    if (orderHistory && orderHistory.length > 0) {
        const historyFragment = document.createDocumentFragment();
        orderHistory.forEach(order => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="icon-wrapper">
                    <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                </div>
                <div class="details">
                    <div class="title"><strong>${order.action || 'פעולה'}</strong> - תעודה: ${order.orderId}</div>
                    <div class="meta">
                        <span>${order.date}</span>
                        <span class="separator">•</span>
                        <span>${order.address}</span>
                    </div>
                </div>
                <div class="status-tag-wrapper">
                    <span class="status-tag ${getBadgeClass(order.status)}">${order.status}</span>
                </div>
            `;
            historyFragment.appendChild(item);
        });
        dom.historyList.appendChild(historyFragment);
    } else {
        dom.historyList.innerHTML = '<div class="empty-state">לא נמצאה היסטוריית הזמנות.</div>';
    }
}


// --- 5. EVENT LISTENERS ---
dom.requestSwapBtn.addEventListener('click', () => handleAction('swap'));
dom.requestRemovalBtn.addEventListener('click', () => handleAction('removal'));
dom.confirmNotificationsBtn.addEventListener('click', requestNotificationPermission);
dom.cancelNotificationsBtn.addEventListener('click', () => {
    dom.notificationPrompt.classList.remove('show');
});


// --- 6. HELPER FUNCTIONS ---

/**
 * Handles user actions like requesting a swap or removal.
 * @param {string} actionType - 'swap' or 'removal'.
 */
function handleAction(actionType) {
    const actionText = actionType === 'swap' ? 'החלפה' : 'פינוי';
    // Replace the simple alerts with a more modern modal/toast in a real app
    alert(`בקשת ${actionText} נשלחה למערכת. ניצור איתך קשר בהקדם לאישור.`);
}

/**
 * Shows or hides the main loader.
 * @param {boolean} visible - Should the loader be visible?
 * @param {string} [text] - Optional text to display in the loader.
 */
function showLoader(visible, text = '') {
    if (visible) {
        dom.loader.textContent = text;
        dom.loader.style.display = 'block';
        dom.appContent.style.display = 'none';
    } else {
        dom.loader.style.display = 'none';
        dom.appContent.style.display = 'block';
    }
}

/**
 * Displays an error message to the user.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    dom.loader.innerHTML = `<div class="error-state">${message}</div>`;
    showLoader(true);
}

/**
 * Returns a CSS class for a status badge based on the status text.
 * @param {string} status - The status text (e.g., "פתוח", "סגור").
 * @returns {string} The corresponding CSS class.
 */
function getBadgeClass(status = "") {
    const s = String(status).toLowerCase();
    if (s.includes('פתוח')) return 'open';
    if (s.includes('סגור')) return 'closed';
    return 'default';
}

// --- 7. PUSH NOTIFICATIONS LOGIC ---

/**
 * Initializes the Firebase app and sets up messaging.
 * @param {string} clientId - The current client's ID.
 */
function initializeFirebase(clientId) {
    try {
        // Check if Firebase is available and hasn't been initialized yet
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

/**
 * Manages the logic for showing the notification prompt and handling user's choice.
 * @param {object} messaging - The Firebase Messaging instance.
 * @param {string} clientId - The current client's ID.
 */
function setupNotifications(messaging, clientId) {
    // Don't show the prompt if permission is already granted or denied
    if (Notification.permission === 'granted') {
        retrieveToken(messaging, clientId);
        return;
    }
    if (Notification.permission === 'denied') {
        console.log('Notification permission has been denied by the user.');
        return;
    }
    // Show the custom prompt after a short delay
    setTimeout(() => {
        dom.notificationPrompt.classList.add('show');
    }, 3000);
}

/**
 * Requests browser permission for notifications.
 */
async function requestNotificationPermission() {
    dom.notificationPrompt.classList.remove('show');
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            // Re-initialize messaging and get token now that we have permission
            const clientId = new URLSearchParams(window.location.search).get('id');
            initializeFirebase(clientId);
        } else {
            console.log('Unable to get permission to notify.');
        }
    } catch (error) {
        console.error('Error requesting notification permission', error);
    }
}


/**
 * Retrieves the FCM token and sends it to the server.
 * @param {object} messaging - The Firebase Messaging instance.
 * @param {string} clientId - The current client's ID.
 */
async function retrieveToken(messaging, clientId) {
    try {
        // ⭐️⭐️⭐️ ACTION REQUIRED ⭐️⭐️⭐️
        // Replace "YOUR_VAPID_PUBLIC_KEY" with your key from Firebase Console
        // Project Settings > Cloud Messaging > Web configuration > "Web Push certificates"
        const vapidKey = 'YOUR_VAPID_PUBLIC_KEY'; 
        const currentToken = await messaging.getToken({ vapidKey: vapidKey });

        if (currentToken) {
            console.log('FCM Token:', currentToken);
            sendTokenToServer(clientId, currentToken);
        } else {
            console.log('No registration token available. Request permission to generate one.');
        }
    } catch (err) {
        console.log('An error occurred while retrieving token. ', err);
    }
}

/**
 * Sends the FCM token to the server to be stored.
 * @param {string} clientId - The client's ID.
 * @param {string} token - The FCM token.
 */
async function sendTokenToServer(clientId, token) {
    console.log(`Sending token to server for client ${clientId}...`);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            // Use 'text/plain' to avoid CORS preflight issues with simple Apps Script deployments
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'saveFCMToken',
                clientId: clientId,
                token: token
            })
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success') {
            console.log('Token successfully saved on the server.');
        } else {
            throw new Error(`Server returned an error: ${result.message}`);
        }

    } catch (error) {
        console.error('Failed to send token to server:', error);
    }
}

