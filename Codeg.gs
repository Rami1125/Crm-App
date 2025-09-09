/**
 * @file Code.gs
 * @description The complete server-side logic for the Saban CRM system.
 * This script handles all data interactions with Google Sheets for both the Admin Dashboard and the Client App,
 * including a full two-way push notification system via Firebase Cloud Messaging (FCM).
 * Author: Gemini AI for Rami
 */

// ========== 1. GLOBAL CONFIGURATION ==========

// --- ⭐️⭐️⭐️ ACTION REQUIRED: Configure Column Names ⭐️⭐️⭐️ ---
// Make sure these names EXACTLY match the header names in your Google Sheet.
const CLIENT_ID_COLUMN = "מספר לקוח";
const CLIENT_NAME_COLUMN = "שם לקוח";
const CLIENT_PHONE_COLUMN = "טלפון";
// --- End of Configuration ---

// --- Sheet Names (configure these to match your Google Sheet) ---
const MAIN_SHEET_NAME = "מעקב";
const NOTES_SHEET_NAME = "הערות";
const REQUESTS_SHEET_NAME = "בקשות"; // New sheet for client requests

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

// ========== 2. MAIN API ROUTERS (doGet & doPost) ==========

function doGet(e) {
  try {
    const action = e.parameter.action;
    let responseData;

    switch (action) {
      case 'getData':
        responseData = getAllData(MAIN_SHEET_NAME);
        break;
      case 'getDevNotes':
        responseData = getAllData(NOTES_SHEET_NAME, 'notes');
        break;
      case 'getClientData':
        const identifier = e.parameter.identifier;
        responseData = getClientSpecificData(identifier);
        break;
      case 'getRecentRequests':
        responseData = getAllData(REQUESTS_SHEET_NAME, 'requests');
        break;
      default:
        throw new Error("Invalid 'action' parameter provided.");
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', ...responseData }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    let result = {};

    switch (action) {
      case 'addRow':
        result.message = addRow(MAIN_SHEET_NAME, request.row);
        break;
      case 'updateRow':
        result.message = updateRow(MAIN_SHEET_NAME, request.index, request.row);
        break;
      case 'deleteRow':
        result.message = deleteRow(MAIN_SHEET_NAME, request.index);
        break;
      case 'closeOrder':
        result.message = updateOrderStatus(request.index, 'סגור');
        break;
      case 'saveDevNote':
        result.message = saveNote(NOTES_SHEET_NAME, request.note);
        break;
      case 'clientRequest':
        result.message = handleClientRequest(request);
        break;
      case 'saveClientToken':
        saveClientToken(request.clientId, request.token);
        result.message = "Token saved successfully.";
        break;
      case 'sendAdminNotification':
        result.message = sendNotificationToClient(request.clientId, request.title, request.body);
        break;
      default:
        throw new Error("Invalid 'action' parameter provided.");
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', ...result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========== 3. DATA RETRIEVAL FUNCTIONS (GET Actions) ==========

function getAllData(sheetName, dataKey = 'data') {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { [dataKey]: [], headers: [] };
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift() || [];
  const jsonData = data.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  return { [dataKey]: jsonData, headers: headers };
}

/**
 * Gets all data relevant to a specific client by ID or Phone Number using configured column names.
 * This version is more robust and finds column indexes dynamically.
 * @param {string} identifier The client's ID or Phone Number.
 * @returns {object} An object containing the client's name, actual ID, and their orders.
 */
function getClientSpecificData(identifier) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet '${MAIN_SHEET_NAME}' not found.`);

  const allData = sheet.getDataRange().getValues();
  const headers = allData.shift() || [];
  
  // Get column indices from configured names
  const clientIdColIdx = headers.indexOf(CLIENT_ID_COLUMN);
  const clientPhoneColIdx = headers.indexOf(CLIENT_PHONE_COLUMN);

  if (clientIdColIdx === -1) throw new Error(`Could not find the client ID column: '${CLIENT_ID_COLUMN}'. Please check configuration.`);
  
  let clientRows = [];
  const cleanIdentifier = String(identifier).trim();

  // Search by client ID first with flexible comparison
  clientRows = allData.filter(row => {
    const sheetValue = String(row[clientIdColIdx]).trim();
    // Compare as string AND as number to handle formatting issues (e.g. "123" vs 123)
    return sheetValue == cleanIdentifier;
  });

  // If not found and a phone column exists, search by phone number
  if (clientRows.length === 0 && clientPhoneColIdx !== -1) {
    const numericIdentifier = cleanIdentifier.replace(/[^0-9]/g, '');
    clientRows = allData.filter(row => {
      const phone = String(row[clientPhoneColIdx]).replace(/[^0-9]/g, '');
      return phone.endsWith(numericIdentifier); // More flexible phone match (e.g. last 7 digits)
    });
  }
  
  if (clientRows.length === 0) {
    throw new Error(`Client with identifier '${identifier}' not found.`);
  }

  const jsonData = clientRows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  const clientName = jsonData[0][CLIENT_NAME_COLUMN];
  const clientId = jsonData[0][CLIENT_ID_COLUMN];
  return { clientName, clientId, orders: jsonData };
}


// ========== 4. DATA MODIFICATION FUNCTIONS (POST Actions) ==========

function addRow(sheetName, rowData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.appendRow(rowData);
  return "הזמנה נוספה בהצלחה!";
}

function updateRow(sheetName, rowIndex, rowData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const range = sheet.getRange(rowIndex + 2, 1, 1, rowData.length);
  range.setValues([rowData]);
  return "הזמנה עודכנה בהצלחה!";
}

function deleteRow(sheetName, rowIndex) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.deleteRow(rowIndex + 2);
  return "הזמנה נמחקה בהצלחה!";
}

function updateOrderStatus(rowIndex, newStatus) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusColIndex = headers.indexOf("סטטוס");
    if (statusColIndex === -1) {
        throw new Error("Column 'סטטוס' not found.");
    }
    sheet.getRange(rowIndex + 2, statusColIndex + 1).setValue(newStatus);
    return `סטטוס הזמנה עודכן ל'${newStatus}'.`;
}

function saveNote(sheetName, note) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.appendRow([new Date(), note.clientName || 'N/A', note.orderId || 'כללי', note.isUrgent || false, note.text]);
  return "ההערה נשמרה בהצלחה!";
}


// ========== 5. CLIENT APP & NOTIFICATION LOGIC (POST Actions) ==========

function handleClientRequest(request) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REQUESTS_SHEET_NAME);
  sheet.appendRow([
    new Date(),
    request.clientId,
    request.clientName,
    request.requestType,
    request.details
  ]);
  
  notifyAdminOfNewRequest(request.clientName, request.requestType);
  return "הבקשה נשלחה בהצלחה למנהל המערכת.";
}

function saveClientToken(clientId, token) {
  if (clientId && token) {
    PropertiesService.getUserProperties().setProperty('fcm_token_' + clientId, token);
    Logger.log(`Token saved for client: ${clientId}`);
  }
}

function sendNotificationToClient(clientId, title, body) {
  const token = PropertiesService.getUserProperties().getProperty('fcm_token_' + clientId);
  if (token) {
    sendPushNotification(token, title, body);
    return `התראה נשלחה ללקוח ${clientId}.`;
  } else {
    throw new Error(`לא נמצא מזהה התראות (token) עבור לקוח ${clientId}.`);
  }
}

function notifyAdminOfNewRequest(clientName, requestType) {
  const adminToken = PropertiesService.getUserProperties().getProperty('fcm_token_admin');
  
  if (adminToken) {
    const title = "🔔 בקשה חדשה מלקוח";
    const body = `${clientName} שלח בקשת ${requestType} חדשה.`;
    sendPushNotification(adminToken, title, body);
  } else {
    Logger.log("Could not find admin token to send notification.");
  }
}

function sendPushNotification(token, title, body) {
  const SERVER_KEY = PropertiesService.getScriptProperties().getProperty('FCM_SERVER_KEY');
  if (!SERVER_KEY) {
    Logger.log("FCM_SERVER_KEY not set in Script Properties.");
    return;
  }

  const payload = {
    to: token,
    notification: {
      title: title,
      body: body,
      icon: "https://rami1125.github.io/crm-makav/icon-192.png"
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'key=' + SERVER_KEY
    },
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(FCM_URL, options);
  } catch (e) {
    Logger.log(`Error sending push notification: ${e.toString()}`);
  }
}

