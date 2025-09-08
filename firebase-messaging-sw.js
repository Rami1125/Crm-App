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
    // The structure of 'payload.notification' is determined by how you send the message
    // from your server (e.g., from the Google Apps Script).
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'https://placehold.co/192x192/0b72b9/FFFFFF?text=סבן', // A default icon
        badge: 'https://placehold.co/96x96/0b72b9/FFFFFF?text=📦' // Icon for Android notification bar
    };

    // Use the Service Worker's registration to show the notification.
    self.registration.showNotification(notificationTitle, notificationOptions);
});

