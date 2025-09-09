/**
 * @file firebase-messaging-sw.js
 * @description Firebase Cloud Messaging Service Worker.
 * This file handles incoming push notifications when the app is in the background or closed.
 * It is essential for receiving and displaying push notifications.
 */

// Import the Firebase scripts that are needed.
// These are special versions for service workers.
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// --- Firebase Configuration ---
// This configuration is taken directly from your Firebase project settings.
// It allows this service worker to connect to the correct project.
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBV_2JwCLtow5F6C7463NmfP2py5W-fj5I",
    authDomain: "hsaban94-cc777.firebaseapp.com",
    projectId: "hsaban94-cc777",
    storageBucket: "hsaban94-cc777.appspot.com",
    messagingSenderId: "299206369469",
    appId: "1:299206369469:web:50ca90c58f1981ec9457d4"
};

// Initialize the Firebase app in the service worker with the provided config.
firebase.initializeApp(FIREBASE_CONFIG);

// Retrieve an instance of Firebase Messaging so we can handle background messages.
const messaging = firebase.messaging();

/**
 * Background Message Handler
 *
 * This function is triggered whenever a push notification is received while the app tab
 * is not in the foreground (i.e., the app is in the background, another tab is active, or the browser is closed).
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Customize the notification's title and body from the payload.
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'https://img.icons8.com/?size=100&id=9fZ3EWahbXyH&format=png&color=000000', // Main icon
        badge: 'https://img.icons8.com/?size=100&id=9fZ3EWahbXyH&format=png&color=000000', // Icon for Android notification bar
        // Pass data to the notification for the click event.
        // This allows the server to specify which URL to open upon click.
        data: {
            url: payload.data ? payload.data.url : '/'
        }
    };

    // Use the Service Worker's registration to show the notification.
    self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Notification Click Handler
 *
 * This function is triggered when a user clicks on a displayed notification.
 * Its job is to open the web app and focus the window.
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received.', event.notification);

    // Close the notification pop-up
    event.notification.close();

    // Get the URL to open from the notification's data property.
    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;


    // This code looks for an open window with the same URL and focuses it.
    // If no window is found, it opens a new one.
    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((clientList) => {
            // If a window for the app is already open, focus it.
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one.
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
