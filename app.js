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
        showError('שגיאה: לא זוהה מספר לקוח בכתובת ה-URL. יש לוודא שהכתובת כוללת `?id=NUMBER`');
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
        
        const rawText = await response.text();
        console.log("Raw response text from server:", rawText);

        const data = JSON.parse(rawText);
        console.log("Parsed data object:", data);

        if (data.error) {
            throw new Error(`שגיאה מהשרת: ${data.error}`);
        }

        updateUI(data);
        console.log('UI updated successfully.');

    } catch (error) {
        console.error('CRITICAL ERROR during data loading:', error);
        showError(`אופס, משהו השתבש בטעינת הנתונים.<br>${error.message}<br>אנא בדוק את הקונסול (F12) לפרטים נוספים.`);
    } finally {
        showLoader(false);
    }
}

/**
 * Updates the User Interface with the data received from the API.
 * This version includes robust checks to prevent errors if data is missing.
 * @param {object} data The structured data object for the client.
 */
function updateUI(data) {
    // Safely access data using optional chaining (?.) and provide default values (||).
    const clientInfo = data.clientInfo || { name: 'לקוח יקר' };
    const activeOrder = data.activeOrder;
    const orderHistory = data.orderHistory || [];

    // --- Client Info ---
    dom.clientName.textContent = `שלום, ${clientInfo.name}`;

    // --- Active Order Section ---
    if (activeOrder && activeOrder.orderId) {
        dom.activeOrderSection.style.display = 'block';
        dom.noActiveOrder.style.display = 'none';

        dom.statusBadge.textContent = activeOrder.status || 'לא ידוע';
        dom.statusBadge.className = `status-badge ${getBadgeClass(activeOrder.status)}`;
        dom.orderAddress.textContent = activeOrder.address || 'לא צוינה';
        dom.orderId.textContent = activeOrder.orderId || 'N/A';
        dom.daysOnSite.textContent = activeOrder.daysOnSite || '0';
        dom.endDate.textContent = activeOrder.endDate || 'N/A';
        dom.lastAction.textContent = activeOrder.lastAction || 'N/A';
    } else {
        dom.activeOrderSection.style.display = 'none';
        dom.noActiveOrder.style.display = 'block';
    }

    // --- Order History ---
    dom.historyList.innerHTML = '';
    if (orderHistory.length > 0) {
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
    alert(`בקשת ${actionText} נשלחה למערכת. ניצור איתך קשר בהקדם לאישור.`);
}

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

function showError(message) {
    dom.loader.innerHTML = `<div class="error-state">${message}</div>`;
    dom.loader.style.display = 'block';
    dom.appContent.style.display = 'none';
}

function getBadgeClass(status = "") {
    const s = String(status).toLowerCase();
    if (s.includes('פתוח')) return 'open';
    if (s.includes('סגור')) return 'closed';
    return 'default';
}

// --- 7. PUSH NOTIFICATIONS LOGIC ---

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
    if (Notification.permission === 'denied') {
        console.log('Notification permission has been denied by the user.');
        return;
    }
    setTimeout(() => {
        dom.notificationPrompt.classList.add('show');
    }, 3000);
}

async function requestNotificationPermission() {
    dom.notificationPrompt.classList.remove('show');
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            const clientId = new URLSearchParams(window.location.search).get('id');
            initializeFirebase(clientId);
        } else {
            console.log('Unable to get permission to notify.');
        }
    } catch (error) {
        console.error('Error requesting notification permission', error);
    }
}

async function retrieveToken(messaging, clientId) {
    try {
        // ⭐️⭐️⭐️ ACTION REQUIRED ⭐️⭐️⭐️
        // Replace "YOUR_VAPID_PUBLIC_KEY" with your key from Firebase Console
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
        if (result.status === 'success') {
            console.log('Token successfully saved on the server.');
        } else {
            throw new Error(`Server returned an error: ${result.message}`);
        }
    } catch (error) {
        console.error('Failed to send token to server:', error);
    }
}

