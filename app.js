/**
 * app.js
 * * This file contains the core logic for the Client CRM PWA.
 * It handles:
 * - Configuration and API endpoints.
 * - Fetching data from the server (Google Apps Script).
 * - Updating the UI based on the fetched data.
 * - Handling user interactions (button clicks).
 * - Setting up push notifications via Firebase.
 * * To Deploy:
 * 1. Update the API_URL constant with your Google Apps Script Web App URL.
 * 2. Update the FIREBASE_CONFIG object with your Firebase project credentials.
 * 3. Update the VAPID_KEY constant with your FCM VAPID key for push notifications.
 */

// ===== 1. CONFIGURATION =====

/**
 * @desc The URL of the Google Apps Script web app that serves the client data.
 * @type {string}
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbyKI1f8msDh3jNnvVj4DSxtdJadVywkuDJIiChLr7gjC7P39wvkIl6PN6Ga2Ju6r4NS/exec';

/**
 * @desc Firebase configuration object for push notifications.
 * * ACTION REQUIRED: Replace this with the actual config object from your Firebase project.
 * * You can find this in your Firebase Console: Project settings > General > Your apps > Web app.
 * @type {object}
 */
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBV_2JwCLtow5F6C7463NmfP2py5W-fj5I",
    authDomain: "hsaban94-cc777.firebaseapp.com",
    projectId: "hsaban94-cc777",
    storageBucket: "hsaban94-cc777.appspot.com",
    messagingSenderId: "299206369469",
    // IMPORTANT: You need to get the `appId` from your Firebase project settings for your specific web app.
    appId: "1:299206369469:web:YOUR_UNIQUE_APP_ID" 
};

/**
 * @desc VAPID key for Firebase Cloud Messaging (FCM) push notifications.
 * * ACTION REQUIRED: Generate a new key pair in your Firebase Console and paste it here.
 * * Find it here: Project settings > Cloud Messaging > Web configuration > Generate key pair.
 * @type {string}
 */
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; 

// ===== 2. DOM ELEMENT SELECTORS =====
const dom = {
    loader: document.getElementById('loader'),
    appContent: document.getElementById('app-content'),
    clientName: document.getElementById('client-name'),
    noActiveOrder: document.getElementById('no-active-order'),
    activeOrderSection: document.getElementById('active-order-section'),
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

// ===== 3. APPLICATION INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('id');

    if (!clientId) {
        showError('שגיאה: לא זוהה מספר לקוח.');
        return;
    }

    // Initialize Firebase and then load client data
    try {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
            const messaging = firebase.messaging();
            setupNotifications(messaging, clientId);
        }
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        console.warn("Please ensure you have included the Firebase SDKs in your index.html and that your FIREBASE_CONFIG object is correct.");
    }
    
    loadClientData(clientId);
    initEventListeners();
});

// ===== 4. API & DATA HANDLING =====

/**
 * @desc Fetches client data from the API and triggers the UI update.
 * @param {string} clientId - The ID of the client to fetch data for.
 */
async function loadClientData(clientId) {
    try {
        const response = await fetch(`${API_URL}?id=${clientId}`);
        
        if (!response.ok) {
            // Handle HTTP errors like 404 or 500
            throw new Error(`שגיאת שרת: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.error) {
            // Handle application-specific errors from the API
            throw new Error(data.error);
        }

        updateUI(data);

        dom.loader.classList.add('hidden');
        dom.appContent.classList.remove('hidden');

    } catch (error) {
        console.error('Error loading client data:', error);
        showError(`אופס, משהו השתבש בטעינת הנתונים. (${error.message})`);
    }
}

/**
 * @desc Displays an error message in the UI, hiding the loader.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    dom.loader.innerHTML = `<p style="color: var(--danger-color);">${message}</p>`;
}

// ===== 5. UI UPDATES =====

/**
 * @desc Populates the UI with data received from the API.
 * @param {object} data - The client data object.
 */
function updateUI(data) {
    const { clientInfo, activeOrder, orderHistory } = data;

    // Update client name
    dom.clientName.textContent = clientInfo.name ? `שלום, ${clientInfo.name}` : 'לקוח יקר';

    // Update active order section
    if (activeOrder && Object.keys(activeOrder).length > 0) {
        dom.activeOrderSection.classList.remove('hidden');
        dom.noActiveOrder.classList.add('hidden');

        dom.statusBadge.textContent = activeOrder.status || 'לא ידוע';
        dom.statusBadge.className = `tag ${getStatusClass(activeOrder.status)}`;
        dom.orderAddress.textContent = activeOrder.address || 'לא צוינה כתובת';
        dom.orderId.textContent = activeOrder.orderId || '-';
        dom.daysOnSite.textContent = activeOrder.daysOnSite || '0';
        dom.endDate.textContent = activeOrder.endDate || '-';
        dom.lastAction.textContent = activeOrder.lastAction || '-';
    } else {
        dom.activeOrderSection.classList.add('hidden');
        dom.noActiveOrder.classList.remove('hidden');
    }

    // Update order history
    renderOrderHistory(orderHistory);
}

/**
 * @desc Renders the list of historical orders.
 * @param {Array<object>} history - An array of order history objects.
 */
function renderOrderHistory(history) {
    dom.historyList.innerHTML = '';
    if (history && history.length > 0) {
        history.forEach(order => {
            const item = document.createElement('div');
            item.className = 'order-item';
            
            const statusClass = getStatusClass(order.status);

            item.innerHTML = `
                <div class="details">
                    <strong>${order.action || 'פעולה לא ידועה'}</strong>
                    <div class="date">תעודה: ${order.orderId || '-'} | תאריך: ${order.date || '-'}</div>
                </div>
                <span class="tag ${statusClass}">${order.status || 'לא ידוע'}</span>
            `;
            dom.historyList.appendChild(item);
        });
    } else {
        dom.historyList.innerHTML = '<p>לא נמצאה היסטוריית הזמנות.</p>';
    }
}

/**
 * @desc Determines the CSS class for a status tag based on its text.
 * @param {string} statusText - The status text (e.g., "פתוח", "סגור").
 * @returns {string} The corresponding CSS class ('open', 'closed', 'alert').
 */
function getStatusClass(statusText = '') {
    const status = statusText.toLowerCase();
    if (status === 'פתוח') return 'open';
    if (status === 'סגור') return 'closed';
    // Add more statuses if needed
    return 'alert'; 
}


// ===== 6. EVENT LISTENERS =====

/**
 * @desc Initializes all event listeners for the application.
 */
function initEventListeners() {
    dom.requestSwapBtn.addEventListener('click', () => handleAction('swap'));
    dom.requestRemovalBtn.addEventListener('click', () => handleAction('removal'));
}

/**
 * @desc Handles the logic for requesting a swap or removal.
 * @param {'swap' | 'removal'} actionType - The type of action requested.
 */
function handleAction(actionType) {
    const actionText = actionType === 'swap' ? 'החלפה' : 'פינוי';
    // Replace the native confirm/alert with a custom modal/toast in a real app
    if (!confirm(`האם אתה בטוח שברצונך לבקש ${actionText}?`)) return;
    
    alert(`בקשת ${actionText} נשלחה למערכת. ניצור איתך קשר בהקדם לאישור.`);
    // In a real app, this would trigger an API call:
    // sendActionRequest(clientId, actionType);
}

// ===== 7. PUSH NOTIFICATIONS (FIREBASE) =====

/**
 * @desc Sets up the notification prompt and token retrieval logic.
 * @param {firebase.messaging.Messaging} messaging - The Firebase messaging instance.
 * @param {string} clientId - The current client's ID.
 */
function setupNotifications(messaging, clientId) {
    // Don't show prompt if permission is already granted or denied
    if (Notification.permission === 'granted') {
        retrieveToken(messaging, clientId);
        return;
    }
    if (Notification.permission === 'denied') {
        console.log("Notification permission was denied.");
        return;
    }

    // Show prompt after a delay
    setTimeout(() => {
        dom.notificationPrompt.classList.remove('hidden');
    }, 3000);

    dom.confirmNotificationsBtn.addEventListener('click', async () => {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await retrieveToken(messaging, clientId);
            }
        } catch (error) {
            console.error('Error requesting notification permission', error);
        } finally {
            dom.notificationPrompt.classList.add('hidden');
        }
    });

    dom.cancelNotificationsBtn.addEventListener('click', () => {
        dom.notificationPrompt.classList.add('hidden');
    });
}

/**
 * @desc Retrieves the FCM token and sends it to the server.
 * @param {firebase.messaging.Messaging} messaging - The Firebase messaging instance.
 * @param {string} clientId - The current client's ID.
 */
async function retrieveToken(messaging, clientId) {
     try {
        const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
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
 * @desc Sends the FCM token to your backend server via a POST request.
 * @param {string} clientId - The client's ID.
 * @param {string} token - The FCM token.
 */
function sendTokenToServer(clientId, token) {
    console.log(`Sending token to server for client ${clientId}`);
    fetch(API_URL, {
        method: 'POST',
        // Google Apps Script doPost requires a string payload and a specific content type
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'saveToken',
            clientId: clientId,
            token: token
        })
    })
    .then(res => res.json())
    .then(data => console.log('Server response to token save:', data))
    .catch(err => console.error('Error sending token to server:', err));
}

