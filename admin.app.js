/**
 * @file admin.app.js
 * @description Client-side logic for the Admin Dashboard.
 */

// Use the same API_URL from the client app
const API_URL = 'https://script.google.com/macros/s/AKfycbyyZHLsF9KDuRynsuNjweUHqVnNDZ9ZFIiDqRTT23aQSyJ98bCK4I6J1-EBMdNKrDvu/exec';

// DOM Elements
const clientsTableBody = document.getElementById('clients-table-body');
const requestsLog = document.getElementById('requests-log');
const modal = document.getElementById('notification-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const notificationForm = document.getElementById('notification-form');
const modalClientId = document.getElementById('modal-client-id');
const modalClientName = document.getElementById('modal-client-name');

/**
 * Fetches data from the server API.
 * @param {string} action The action to perform on the server.
 * @returns {Promise<any>} The JSON response from the server.
 */
async function fetchData(action) {
    try {
        const response = await fetch(`${API_URL}?action=${action}`);
        if (!response.ok) throw new Error(`Network error: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(`API error: ${data.error}`);
        return data;
    } catch (error) {
        console.error(`Failed to fetch ${action}:`, error);
        alert(`שגיאה בטעינת הנתונים: ${error.message}`);
        return null;
    }
}

/**
 * Populates the active clients table.
 */
async function loadActiveClients() {
    const data = await fetchData('getAllClients'); // This action needs to be created in Apps Script
    if (!data || !data.clients || data.clients.length === 0) {
        clientsTableBody.innerHTML = '<tr><td colspan="5" class="placeholder">לא נמצאו לקוחות פעילים.</td></tr>';
        return;
    }

    clientsTableBody.innerHTML = ''; // Clear placeholder
    data.clients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.clientId}</td>
            <td>${client.clientName}</td>
            <td>${client.address}</td>
            <td>${client.daysOnSite}</td>
            <td><button class="btn primary" data-id="${client.clientId}" data-name="${client.clientName}">שלח התראה</button></td>
        `;
        clientsTableBody.appendChild(row);
    });
}

/**
 * Populates the recent requests log.
 */
async function loadRecentRequests() {
    const data = await fetchData('getRecentRequests'); // This action needs to be created in Apps Script
     if (!data || !data.requests || data.requests.length === 0) {
        requestsLog.innerHTML = '<li class="placeholder">לא נמצאו בקשות אחרונות.</li>';
        return;
    }

    requestsLog.innerHTML = ''; // Clear placeholder
    data.requests.forEach(req => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${req.type}</strong> - ${req.clientName} (${new Date(req.timestamp).toLocaleString('he-IL')})`;
        requestsLog.appendChild(item);
    });
}

/**
 * Opens the notification modal with client data.
 * @param {string} clientId 
 * @param {string} clientName 
 */
function openNotificationModal(clientId, clientName) {
    modalClientId.value = clientId;
    modalClientName.textContent = clientName;
    modal.style.display = 'flex';
}

/**
 * Handles the form submission for sending a notification.
 * @param {Event} event 
 */
async function handleSendNotification(event) {
    event.preventDefault();
    const clientId = modalClientId.value;
    const title = document.getElementById('notification-title').value;
    const body = document.getElementById('notification-body').value;
    
    const submitBtn = notificationForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'שולח...';
    submitBtn.disabled = true;

    try {
         const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'sendAdminNotification', // This action needs to be created in Apps Script
                clientId,
                title,
                body
            })
        });
        if (!response.ok) throw new Error(`Network error: ${response.status}`);

        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);

        alert('ההתראה נשלחה בהצלחה!');
        modal.style.display = 'none';
        notificationForm.reset();

    } catch(error) {
        console.error('Failed to send notification:', error);
        alert(`שליחת ההתראה נכשלה: ${error.message}`);
    } finally {
        submitBtn.textContent = 'שלח עכשיו';
        submitBtn.disabled = false;
    }
}

// --- Event Listeners ---

// Initial data load
document.addEventListener('DOMContentLoaded', () => {
    loadActiveClients(); 
    loadRecentRequests();
    setInterval(loadRecentRequests, 15000); // Refresh requests every 15 seconds
});

// Modal listeners
clientsTableBody.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
        const { id, name } = event.target.dataset;
        openNotificationModal(id, name);
    }
});

modalCloseBtn.addEventListener('click', () => modal.style.display = 'none');
notificationForm.addEventListener('submit', handleSendNotification);

