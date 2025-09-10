// ========== STATE ==========
let rawData = [];
let headers = [];
let reportCharts = {};
let deferredPrompt = null;
let realTimeInterval = null;
let showClosedOrders = false;
let activeKpiFilter = null;
let uniqueClientNames = new Set();
let isFullFormVisible = false;

const API_URL = "https://script.google.com/macros/s/AKfycbwfRTTD1IyvbJPNuIzsip4kN-QX--hkRbGv7cHgZckODkZfOzPXaJQegwDMXvSethv0/exec";

const alertSettings = {
    overdue: true,
    newOrder: true,
    statusChange: false
};

// Assuming these new headers are in the sheet
const NEW_HEADERS = ['סוג פעולה', 'מכולה ירדה', 'מכולה עלתה', 'סטטוס ביצוע', 'הזמנה מקושרת', 'הערות מערכת', 'שם סוכן', 'שעת אספקה'];

const ICONS = {
    customer: "https://img.icons8.com/?size=100&id=7WwZau6gMj6x&format=png&color=000000",
    edit: "https://img.icons8.com/?size=100&id=86386&format=png&color=0b72b9",
    duplicate: "https://img.icons8.com/?size=100&id=D7WUsUhXDMGW&format=png&color=0b72b9",
    delete: "https://img.icons8.com/?size=100&id=9lB4p3bBjCNX&format=png&color=c5221f",
    success: "https://img.icons8.com/?size=100&id=xTkoPEFGI0P7&format=png&color=000000"
};

const whatsappTemplates = [
    { title: "בחר תבנית...", text: "" },
    { title: "אישור קבלת הזמנה", text: "שלום {{clientName}}, הזמנתך מספר {{orderId}} התקבלה בהצלחה ותסופק עד לתאריך {{endDate}}." },
    { title: "תזכורת לפינוי מכולה", text: "שלום {{clientName}}, תזכורת קטנה לגבי הזמנה {{orderId}}. המכולה אמורה להתפנות בתאריך {{endDate}}. נשמח לעדכון." },
    { title: "הודעת חריגה - יום 1", text: "שלום {{clientName}}, אנו רואים שהמכולה הקשורה להזמנה {{orderId}} עדיין אצלך, יום לאחר תאריך הפינוי המתוכנן ({{endDate}}). אנא צור קשר לעדכון." },
    { title: "הודעת חריגה - דחופה", text: "שלום {{clientName}}, פנייה דחופה בנוגע להזמנה {{orderId}}. המכולה חורגת משמעותית מתאריך הפינוי {{endDate}}. אנא צור עמנו קשר מיידי בטלפון." },
    { title: "עדכון על איסוף", text: "שלום {{clientName}}, הנהג שלנו בדרך לאסוף את המכולה מהזמנה {{orderId}}." },
    { title: "תודה וסיום שירות", text: "שלום {{clientName}}, המכולה מהזמנה {{orderId}} נאספה בהצלחה. תודה שבחרת בנו!" },
    { title: "בדיקת שביעות רצון", text: "שלום {{clientName}}, נשמח לשמוע איך היה השירות שקיבלת בהזמנה {{orderId}}. המשוב שלך חשוב לנו!"},
    { title: "הצעה מיוחדת", text: "שלום {{clientName}}, כלקוח ותיק שלנו, נשמח להציע לך הנחה על ההזמנה הבאה. צור קשר לפרטים."}
];


// ========== PWA SETUP ==========
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installButton').style.display = 'block';
    showInstallPrompt();
});

function showInstallPrompt() {
    const prompt = document.getElementById('installPrompt');
    prompt.classList.add('show');
}

function dismissInstallPrompt() {
    const prompt = document.getElementById('installPrompt');
    prompt.classList.remove('show');
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
            dismissInstallPrompt();
            document.getElementById('installButton').style.display = 'none';
        });
    }
}

// ========== MODAL CONTROLS ==========
const modalOverlay = document.getElementById('modalOverlay');
const appModal = document.getElementById('appModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalFooter = document.getElementById('modalFooter');
const modalForm = document.getElementById('modalForm');

function showModal(title, body, footer, isFullPage = false) {
    modalTitle.innerHTML = title;
    modalBody.innerHTML = body;
    modalFooter.innerHTML = footer;

    if(isFullPage) {
        appModal.classList.add('modal-full-page');
    } else {
        appModal.classList.remove('modal-full-page');
    }

    modalOverlay.classList.add('show');
    document.addEventListener('keydown', handleEscKey);
}

function closeModal() {
    modalOverlay.classList.remove('show');
    document.removeEventListener('keydown', handleEscKey);
}

// Close modal if overlay is clicked
modalOverlay.addEventListener('click', closeModal);

function handleEscKey(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
}

// ========== REAL-TIME UPDATES ==========
function initRealTimeUpdates() {
    if (realTimeInterval) clearInterval(realTimeInterval);
    realTimeInterval = setInterval(refresh, 30000);
    setInterval(simulateRealTimeChanges, 45000);
}

function simulateRealTimeChanges() {
    if (Math.random() > 0.7 && rawData.length > 0) {
        const randomIndex = Math.floor(Math.random() * rawData.length);
        const order = rawData[randomIndex];
        
        if (alertSettings.newOrder) {
            showToast(`הזמנה חדשה התווספה: ${order['מספר הזמנה'] || 'ללא מספר'}`, 'info');
        }
    }
}

// ========== TOAST NOTIFICATIONS ==========
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconHtml = '';
    if (type === 'success') {
        iconHtml = `<img src="${ICONS.success}" style="width:28px; height:28px; margin-left: 10px;" alt="אישור"/>`;
    }

    toast.innerHTML = `
        ${iconHtml}
        <div>${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// ========== ALERT SETTINGS ==========
function loadAlertSettings() {
    const saved = localStorage.getItem('alertSettings');
    if (saved) {
        Object.assign(alertSettings, JSON.parse(saved));
        document.getElementById('alertOverdue').checked = alertSettings.overdue;
        document.getElementById('alertNewOrder').checked = alertSettings.newOrder;
    }
}

function saveAlertSettings() {
    alertSettings.overdue = document.getElementById('alertOverdue').checked;
    alertSettings.newOrder = document.getElementById('alertNewOrder').checked;
    localStorage.setItem('alertSettings', JSON.stringify(alertSettings));
    showToast('הגדרות ההתראות נשמרו', 'success');
}

// ========== REPORTS PAGE ==========
function showReportsPage() {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    let body = `
        <div class="reports-page-header">
            <div class="form-group">
                <label for="startDate">מתאריך</label>
                <input type="date" id="startDate" value="${firstDayOfMonth}">
            </div>
            <div class="form-group">
                <label for="endDate">עד תאריך</label>
                <input type="date" id="endDate" value="${today}">
            </div>
            <button class="btn" onclick="updateReportCharts()">סנן</button>
        </div>
        <div class="reports-page-grid">
            <div class="chart-container"><div class="chart-title">הזמנות לפי סטטוס</div><canvas id="reportStatusChart"></canvas></div>
            <div class="chart-container"><div class="chart-title">הזמנות לפי חודש</div><canvas id="reportTimelineChart"></canvas></div>
            <div class="chart-container"><div class="chart-title">הזמנות לפי לקוח (TOP 10)</div><canvas id="reportCustomerChart"></canvas></div>
            <div class="chart-container"><div class="chart-title">התפלגות סוגי מכולות</div><canvas id="reportContainerTypeChart"></canvas></div>
        </div>
    `;
    showModal('דוחות וניתוח נתונים', body, '', true);
    initReportCharts();
}

function initReportCharts() {
    Object.values(reportCharts).forEach(chart => chart.destroy());

    reportCharts.status = new Chart(document.getElementById('reportStatusChart'), { type: 'doughnut', options: { responsive: true, plugins: { legend: { position: 'right' } } } });
    reportCharts.timeline = new Chart(document.getElementById('reportTimelineChart'), { type: 'bar', options: { responsive: true } });
    reportCharts.customer = new Chart(document.getElementById('reportCustomerChart'), { type: 'bar', options: { responsive: true, indexAxis: 'y' } });
    reportCharts.containerType = new Chart(document.getElementById('reportContainerTypeChart'), { type: 'pie', options: { responsive: true, plugins: { legend: { position: 'right' } } } });
    
    updateReportCharts();
}

function updateReportCharts() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const filtered = rawData.filter(r => {
        try {
            const orderDate = new Date(r['תאריך']);
            return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
        } catch(e) { return false; }
    });

    // Status Chart
    const statusData = prepareStatusData(filtered);
    reportCharts.status.data = { labels: statusData.labels, datasets: [{ data: statusData.values, backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#90a4ae'] }] };
    reportCharts.status.update();

    // Timeline Chart
    const timelineData = prepareTimelineData(filtered);
    reportCharts.timeline.data = { labels: timelineData.labels, datasets: [{ label: 'הזמנות', data: timelineData.values, backgroundColor: '#0b72b9' }] };
    reportCharts.timeline.update();

    // Customer Chart
    const customerData = prepareCustomerData(filtered);
    reportCharts.customer.data = { labels: customerData.labels, datasets: [{ label: 'הזמנות', data: customerData.values, backgroundColor: '#ff9f1c' }] };
    reportCharts.customer.update();

    // Container Type Chart
    const containerTypeData = prepareContainerTypeData(filtered);
    reportCharts.containerType.data = { labels: containerTypeData.labels, datasets: [{ data: containerTypeData.values, backgroundColor: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'] }] };
    reportCharts.containerType.update();
}

function prepareCustomerData(data) {
     const customerCount = {};
     data.forEach(order => {
        const customer = order['שם לקוח'] || 'לא ידוע';
        customerCount[customer] = (customerCount[customer] || 0) + 1;
     });
     const sorted = Object.entries(customerCount).sort((a,b) => b[1] - a[1]).slice(0, 10);
     return {
         labels: sorted.map(item => item[0]),
         values: sorted.map(item => item[1])
     };
}

function prepareContainerTypeData(data) {
     const typeCount = {};
     const headerKey = headers.find(h => h.includes('סוג מכולה'));
     if (!headerKey) return { labels: [], values: [] };
     data.forEach(order => {
        const type = order[headerKey] || 'לא ידוע';
        typeCount[type] = (typeCount[type] || 0) + 1;
     });
     return { labels: Object.keys(typeCount), values: Object.values(typeCount) };
}


function prepareStatusData(data) {
    const statusCount = { 'פתוח': 0, 'במשלוח': 0, 'נמסר': 0, 'חורג': 0, 'סגור': 0 };
    data.forEach(order => {
        const status = order['סטטוס'] || '';
        if (status.includes('חורג')) statusCount['חורג']++;
        else if (status.includes('סגור')) statusCount['סגור']++;
        else if (status.includes('משלוח')) statusCount['במשלוח']++;
        else if (status.includes('נמסר')) statusCount['נמסר']++;
        else statusCount['פתוח']++;
    });
    return { labels: Object.keys(statusCount), values: Object.values(statusCount) };
}

function prepareTimelineData(data) {
    const months = {};
    data.forEach(order => {
        if (order['תאריך']) {
            try {
                const orderDate = new Date(order['תאריך']);
                const monthKey = orderDate.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' });
                months[monthKey] = (months[monthKey] || 0) + 1;
            } catch (e) {}
        }
    });
    const sortedKeys = Object.keys(months).sort((a,b) => new Date(a) - new Date(b));
    return { labels: sortedKeys, values: sortedKeys.map(m => months[m] || 0) };
}

// ========== STATUS HELPERS ==========
function getStatusKey(status, executionStatus) {
    if (executionStatus === 'ממתינה לביצוע') return 'pending';
    if (!status) return 'open';
    status = String(status).toLowerCase();
    if (status.includes('חורג')) return 'overdue';
    if (status.includes('סגור')) return 'closed';
    return 'open';
}

function getStatusBadge(status, executionStatus) {
    if (executionStatus === 'ממתינה לביצוע') {
        return `<span class="status-badge status-pending">ממתינה לביצוע</span>`;
    }
    if (!status) return '';
    status = String(status);
    let badgeClass = 'status-available', badgeText = 'זמין';
    if (status.includes('משלוח')) { badgeClass = 'status-in-transit'; badgeText = 'במשלוח'; }
    else if (status.includes('נמסר')) { badgeClass = 'status-delivered'; badgeText = 'נמסר'; }
    else if (status.includes('חורג')) { badgeClass = 'status-overdue'; badgeText = 'חורג'; }
    else if (status.includes('סגור')) { badgeClass = 'status-delivered'; badgeText = 'סגור'; }
    return `<span class="status-badge ${badgeClass}">${badgeText}</span>`;
}

const statusOptions = ['זמין', 'במשלוח', 'נמסר', 'סגור', 'חורג'];


// ========== API HELPERS ==========
function showApiErrorModal() {
    const title = '🚨 שגיאת חיבור ל-API';
    const body = `
        <div style="text-align: right; line-height: 1.6;">
            <p>המערכת לא הצליחה להתחבר ל-Google Sheets. לרוב, הבעיה נובעת מהרשאות שגויות ב-Google Apps Script.</p>
            <strong>יש לבצע את הצעדים הבאים:</strong>
            <ol style="padding-right: 20px;">
                <li>פתח את קובץ ה-Google Sheets המקושר.</li>
                <li>בתפריט העליון, לחץ על <strong>הרחבות (Extensions) &rarr; Apps Script</strong>.</li>
                <li>בחלון עורך הסקריפט שנפתח, לחץ על הכפתור הכחול <strong>Deploy &rarr; Manage deployments</strong>.</li>
                <li>מצא את הפריסה הפעילה שלך, ולחץ על סמל העיפרון (עריכה).</li>
                <li>תחת "Web app", ודא שהאפשרות <strong>"Who has access"</strong> מוגדרת ל-<strong>"Anyone"</strong>.</li>
                <li>שמור את השינויים.</li>
            </ol>
            <p><strong>חשוב:</strong> אם ביצעת שינוי כלשהו בקוד של הסקריפט, עליך לבצע פריסה חדשה דרך <strong>Deploy &rarr; New deployment</strong>.</p>
        </div>
    `;
    const footer = `<button class="btn secondary" onclick="closeModal()">הבנתי, אסגור</button>`;
    showModal(title, body, footer);
}

async function apiGet(action) {
    try {
        const res = await fetch(`${API_URL}?action=${action}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch(e) {
        if (e.message.includes("Failed to fetch")) {
            showApiErrorModal();
        }
        throw e;
    }
}

async function apiPost(body) {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch(e) {
        if (e.message.includes("Failed to fetch")) {
            showApiErrorModal();
        }
        throw e;
    }
}

// ========== DATE FORMATTING ==========
function formatDateTime(value, includeTime = true) {
    if (!value && value !== 0) return "";
    let d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) return value;
    try {
        const dateStr = d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
        if (!includeTime) return dateStr;
        const timeStr = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
        if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) return dateStr;
        return `${dateStr}, ${timeStr}`;
    } catch (e) { return value; }
}

function looksLikeDateHeader(h) {
    if (!h) return false;
    const s = String(h).toLowerCase();
    return s.includes("תאריך") || s.includes("date") || s.includes("סיום");
}

// ========== UI RENDERERS ==========
function renderTable(data, hdrs) {
    const thead = document.getElementById("tHead");
    const tbody = document.getElementById("tBody");
    thead.innerHTML = "";
    tbody.innerHTML = "";

    if (!hdrs || hdrs.length === 0) {
        thead.innerHTML = "<tr><th>אין נתונים להצגה.</th></tr>";
        return;
    }
    
    const displayHeaders = hdrs.filter(h => !NEW_HEADERS.includes(h) || ['סוג פעולה', 'מכולה ירדה', 'מכולה עלתה'].includes(h));
    thead.innerHTML = "<tr><th>#</th>" + displayHeaders.map(h => `<th>${h}</th>`).join("") + "<th>סטטוס</th><th>פעולות</th></tr>";
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${displayHeaders.length + 3}" style="padding: 20px; color: var(--muted);">לא נמצאו הזמנות התואמות לסינון.</td></tr>`;
        return;
    }

    data.forEach((rowObj, i) => {
        const original_idx = rawData.indexOf(rowObj);
        const statusKey = getStatusKey(rowObj['סטטוס'], rowObj['סטטוס ביצוע']);
        const rowClass = `row-${statusKey} row-type-${rowObj['סוג פעולה'] || ''}`;

        const cells = displayHeaders.map(h => {
            const v = rowObj[h];
            let content = v === null || v === undefined ? "" : v;
             if (h === 'תאריך') {
                content = formatDateTime(v, false);
                if(rowObj['שעת אספקה']) content += ` ${rowObj['שעת אספקה']}`;
            } else if (looksLikeDateHeader(h)) {
                content = formatDateTime(v);
            }
            if (String(h).includes("טלפון") && v) content = `<a href="tel:${v}" onclick="event.stopPropagation()">${v}</a>`;
            if (String(h).includes("כתובת") && v) content = `<button class="btn secondary" style="padding: 4px 8px; font-size: 12px;" onclick="event.stopPropagation(); showMap('${encodeURIComponent(v)}')">מפה</button>`;
            return `<td>${content}</td>`;
        }).join("");

        const statusCell = `<td>${getStatusBadge(rowObj['סטטוס'], rowObj['סטטוס ביצוע'])}</td>`;
        
        const actionCell = `<td style="display: flex; gap: 8px; justify-content: center; align-items:center;">
            <button class="icon-btn" title="ערוך" onclick="event.stopPropagation(); editRowPrompt(${original_idx})"><img src="${ICONS.edit}" alt="ערוך"></button>
            <button class="icon-btn" title="שכפל / פעולה" onclick="event.stopPropagation(); duplicateRow(${original_idx})"><img src="${ICONS.duplicate}" alt="שכפל"></button>
            <button class="icon-btn" title="מחק" onclick="event.stopPropagation(); deleteRowByIdx(${original_idx})"><img src="${ICONS.delete}" alt="מחק"></button>
            </td>`;

        const rowHtml = document.createElement('tr');
        rowHtml.className = rowClass;
        rowHtml.onclick = () => showCustomerCard(original_idx);
        rowHtml.innerHTML = `<td style="font-weight: 700; color: var(--muted);">${i + 1}</td>${cells}${statusCell}${actionCell}`;
        tbody.appendChild(rowHtml);
    });
}

function filterByKpi(type) {
    document.querySelectorAll('.kpi-card').forEach(card => card.classList.remove('active'));

    if (activeKpiFilter === type) {
        activeKpiFilter = null;
    } else {
        activeKpiFilter = type;
        document.getElementById(`kpi-${type}`).classList.add('active');
    }
    renderFilteredData();
}


function renderFilteredData() {
    const searchTerm = document.getElementById("globalSearch").value.trim().toLowerCase();
    const showClosed = document.getElementById("showClosedCheckbox").checked;

    let dataToRender = [...rawData];

    // Filter 1: KPI Filter
    if (activeKpiFilter) {
        if (activeKpiFilter === 'open') {
            dataToRender = dataToRender.filter(r => getStatusKey(r['סטטוס']) !== 'closed');
        } else if (activeKpiFilter === 'overdue') {
            dataToRender = dataToRender.filter(r => getStatusKey(r['סטטוס']) === 'overdue');
        } else if (activeKpiFilter === 'active') {
            const activeOrders = rawData.filter(r => getStatusKey(r['סטטוס']) !== 'closed');
            const customerKey = headers.find(h => h.includes('שם לקוח'));
            if (customerKey) {
                const activeCustomerNames = [...new Set(activeOrders.map(o => o[customerKey]))];
                dataToRender = dataToRender.filter(r => activeCustomerNames.includes(r[customerKey]));
            }
        }
    }
    
    // Filter 2: Show Closed Checkbox (only if no specific KPI filter is active)
    if (!activeKpiFilter && !showClosed) {
        dataToRender = dataToRender.filter(r => getStatusKey(r['סטטוס']) !== 'closed');
    }

    // Filter 3: Search Term
    if (searchTerm) {
        dataToRender = dataToRender.filter(r => 
            Object.values(r).some(v => String(v || "").toLowerCase().includes(searchTerm))
        );
    }
    
    renderTable(dataToRender, headers);

    if (activeKpiFilter && activeKpiFilter !== 'total') {
        const tbody = document.getElementById("tBody");
        tbody.querySelectorAll('tr').forEach(tr => tr.classList.add('highlight-marker'));
    }
}

// ========== KPI + ALERTS + INSIGHTS ==========
function computeKPIs(data) {
    const total = data.length;
    const activeOrders = data.filter(r => getStatusKey(r['סטטוס']) !== 'closed');
    const openCount = activeOrders.length;
    const overdueOrders = activeOrders.filter(r => getStatusKey(r['סטטוס']) === 'overdue');

    document.getElementById("kTotal").innerText = total;
    document.getElementById("kOpen").innerText = openCount;
    document.getElementById("kOver").innerText = overdueOrders.length;

    const customerKey = headers.find(h => h.includes('שם לקוח'));
    const containerKey = headers.find(h => h.includes('מספר מכולה'));

    const activeCustomers = customerKey ? new Set(activeOrders.map(o => o[customerKey])) : new Set();
    document.getElementById("kActiveCustomers").innerText = activeCustomers.size;

    const activeContainers = containerKey ? new Set(activeOrders.map(o => o[containerKey])) : new Set();
    document.getElementById("kContainers").innerText = containerKey ? activeContainers.size : 'N/A';

    // Alerts
    const alertsContainer = document.getElementById("alertsContainer");
    alertsContainer.innerHTML = "";
    if (overdueOrders.length > 0) {
         alertsContainer.innerHTML = `<div style="font-weight: 700; color: var(--status-overdue-text); margin-bottom: 8px;">הזמנות חורגות</div>`;
         overdueOrders.slice(0, 5).forEach(o => {
            const title = (o["שם לקוח"] || o["לקוח"] || "לקוח לא ידוע");
            const dateField = headers.find(h => String(h).includes("סיום"));
            const end = formatDateTime(o[dateField]);
            alertsContainer.innerHTML += `<div class="alert"><div style="font-weight:700">${title}</div><div style="font-size:13px">תאריך סיום חורג: ${end}</div></div>`;
            if (alertSettings.overdue) {
                showToast(`הזמנה חורגת: ${title}`, 'error');
            }
        });
    }

    // Insights
    updateInsights(data);
}

function updateInsights(data) {
    const locationInsightContainer = document.getElementById('locationInsight');
    const locationCounts = {};
    const activeOrders = data.filter(r => getStatusKey(r['סטטוס']) !== 'closed' && r['כתובת']);
    activeOrders.forEach(r => {
        const city = (r['כתובת'] || '').split(',')[0].trim();
        if (city) locationCounts[city] = (locationCounts[city] || 0) + 1;
    });
    let locationHtml = '<div class="insight-title">📍 פילוח גיאוגרפי</div><div class="insight-list">';
    if (Object.keys(locationCounts).length > 0) {
        Object.entries(locationCounts).forEach(([city, count]) => {
            locationHtml += `<div class="insight-item" onclick="showCityOrders('${city}')"><span class="insight-item-label">${city}</span><span class="insight-item-value">${count}</span></div>`;
        });
    } else {
        locationHtml += '<p style="font-size:14px; color: var(--muted);">אין נתונים</p>';
    }
    locationInsightContainer.innerHTML = locationHtml + '</div>';

    const pendingInsightContainer = document.getElementById('pendingInsight');
    const pendingOrders = data.filter(r => r['סטטוס ביצוע'] === 'ממתינה לביצוע');
    let pendingHtml = '<div class="insight-title">⏳ הזמנות עתידיות</div><div class="insight-list">';
    if (pendingOrders.length > 0) {
        pendingOrders.forEach(order => {
            pendingHtml += `<div class="insight-item" onclick="showCustomerCard(${rawData.indexOf(order)})"><span class="insight-item-label">${order['שם לקוח']}</span><span class="insight-item-value">${order['סוג פעולה']}</span></div>`;
        });
    } else {
         pendingHtml += '<p style="font-size:14px; color: var(--muted);">אין הזמנות ממתינות</p>';
    }
    pendingInsightContainer.innerHTML = pendingHtml + '</div>';

    const recentInsightContainer = document.getElementById('recentInsight');
    const recentActivity = data.slice().sort((a, b) => new Date(b['תאריך']) - new Date(a['תאריך'])).slice(0, 3);
    let recentHtml = '<div class="insight-title">⏱️ פעילות אחרונה</div><div class="insight-list">';
     if (recentActivity.length > 0) {
        recentActivity.forEach(order => {
            recentHtml += `<div class="insight-item" onclick="showCustomerCard(${rawData.indexOf(order)})"><span class="insight-item-label">${order['שם לקוח']}</span><span class="insight-item-value">${formatDateTime(order['תאריך'], false)}</span></div>`;
        });
    } else {
         recentHtml += '<p style="font-size:14px; color: var(--muted);">אין נתונים</p>';
    }
    recentInsightContainer.innerHTML = recentHtml + '</div>';
}

function showCityOrders(city) {
    const cityOrders = rawData.filter(r => r['כתובת'] && r['כתובת'].startsWith(city));
    let listHtml = '';
    cityOrders.forEach(order => {
        listHtml += `<li>${order['שם לקוח']} - ${order['מספר מכולה ירדה'] || ''}</li>`;
    });
    const body = `<p>רשימת לקוחות ב<strong>${city}</strong>:</p><ul>${listHtml}</ul>`;
    showModal(`לקוחות ב${city}`, body, `<button class="btn secondary" onclick="closeModal()">סגור</button>`);
}


// ========== ACTIONS ==========
async function refresh() {
    const statusMsg = document.getElementById("statusMsg");
    statusMsg.innerText = "טוען...";
    try {
        const resp = await apiGet("getData");
        if (resp.status === "success") {
            rawData = resp.data || [];
            headers = resp.headers || (rawData[0] ? Object.keys(rawData[0]) : []);
            // Add new headers if they don't exist, for dev purposes
            NEW_HEADERS.forEach(h => { if (!headers.includes(h)) headers.push(h) });
            uniqueClientNames = new Set(rawData.map(r => r['שם לקוח']).filter(Boolean));
            renderFilteredData();
            computeKPIs(rawData);
            statusMsg.innerText = `נטענו ${rawData.length} שורות. עודכן לאחרונה: ${new Date().toLocaleTimeString('he-IL')}`;
        } else {
            statusMsg.innerText = "שגיאה: " + resp.message;
            showToast("שגיאה בטעינת הנתונים: " + resp.message, "error");
        }
    } catch (err) {
        statusMsg.innerText = "שגיאת רשת: " + err.message;
        // Toast is shown by apiGet
    }
}

function showCustomerCard(idx) {
    const order = rawData[idx];
    if (!order) return;

    const clientName = order['שם לקוח'] || 'אלמוני';
    const docNum = order['מספר תעודה'] || 'N/A';
    const clientNum = order['מספר לקוח'] || 'N/A';
    const address = order['כתובת'] || 'לא צוינה';
    const currentStatus = order['סטטוס'] || '';
    
    const title = ``;
    
    const statusDropdown = statusOptions.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`).join('');

    let body = `
        <div class="customer-card-header">
            <div class="customer-card-icon">
                <img src="${ICONS.customer}" alt="פרופיל לקוח" />
            </div>
            <div class="customer-card-title">
                <h2>${clientName}</h2>
                <p>תעודה: ${docNum} | מספר לקוח: ${clientNum}</p>
            </div>
            <div class="customer-card-actions">
                <div class="form-group">
                    <label>שנה סטטוס</label>
                    <select onchange="updateOrderStatus(${idx}, this.value)">${statusDropdown}</select>
                </div>
                <button class="btn" onclick="promptForNote(${idx})">הוסף הערה</button>
                <button class="icon-btn" title="שכפל" onclick="duplicateRow(${idx})"><img src="${ICONS.duplicate}" alt="שכפל"></button>
                <button class="icon-btn" title="מחק" onclick="deleteRowByIdx(${idx})"><img src="${ICONS.delete}" alt="מחק"></button>
            </div>
        </div>
        <div class="customer-card-body">
    `;
    
    headers.forEach(h => {
        if (h.toLowerCase().includes('כתובת')) return; 
        body += `<div class="customer-card-field">
                    <label>${h}</label>
                    <p>${order[h] || '—'}</p>
                 </div>`;
    });
    
    body += `
        <div class="map-container">
            <p>${address}</p>
            <button class="btn" onclick="showMap('${encodeURIComponent(address)}')">פתח מפה וניווט</button>
        </div>
    </div>`;

    const footer = `<button type="button" class="btn secondary" onclick="closeModal()">סגור</button>`;
    
    showModal(title, body, footer, true);
}

function showOverdueManagementPage() {
    const overdueOrders = rawData.filter(r => getStatusKey(r['סטטוס']) === 'overdue');
    const soonOverdueOrders = rawData.filter(r => {
        if (getStatusKey(r['סטטוס']) === 'closed' || getStatusKey(r['סטטוס']) === 'overdue') return false;
        const endDateField = headers.find(h => String(h).includes("סיום"));
        if (!endDateField || !r[endDateField]) return false;
        const diff = (new Date(r[endDateField]) - new Date()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 3; // Due in the next 3 days
    });

    const renderOverdueTable = (orders, isSoon) => {
        if (orders.length === 0) return `<p style="color: var(--muted); text-align: center;">אין הזמנות להצגה בקטגוריה זו.</p>`;
        let table = `<table class="table"><thead><tr><th>לקוח</th><th>מס' הזמנה</th><th>תאריך סיום</th><th>${isSoon ? 'ימים לסיום' : 'ימי חריגה'}</th><th>פעולות</th></tr></thead><tbody>`;
        orders.forEach(order => {
            const idx = rawData.indexOf(order);
            const endDateField = headers.find(h => String(h).includes("סיום"));
            const endDate = new Date(order[endDateField]);
            const diffDays = Math.round((new Date() - endDate) / (1000 * 60 * 60 * 24));
            table += `<tr>
                <td>${order['שם לקוח'] || 'N/A'}</td>
                <td>${order['מספר הזמנה'] || 'N/A'}</td>
                <td>${formatDateTime(endDate)}</td>
                <td style="font-weight: 700; color: ${isSoon ? 'var(--status-delivered-text)' : 'var(--status-overdue-text)'};">${isSoon ? -diffDays : diffDays}</td>
                <td><button class="btn" onclick="openWhatsAppDialog(${idx})">שלח התראה</button></td>
            </tr>`;
        });
        table += `</tbody></table>`;
        return table;
    };

    let body = `
        <div class="overdue-management-page-grid">
            <div class="overdue-section">
                <div class="overdue-section-title">🚨 הזמנות בחריגה (${overdueOrders.length})</div>
                ${renderOverdueTable(overdueOrders, false)}
            </div>
            <div class="overdue-section">
                <div class="overdue-section-title">⏳ צפי חריגה ב-3 הימים הקרובים (${soonOverdueOrders.length})</div>
                ${renderOverdueTable(soonOverdueOrders, true)}
            </div>
        </div>
    `;
    showModal('ניהול חריגות ומעקב פרואקטיבי', body, '', true);
}

function openWhatsAppDialog(idx) {
    const order = rawData[idx];
    let options = whatsappTemplates.map((t, i) => `<option value="${i}">${t.title}</option>`).join('');

    let body = `
        <div class="form-group">
            <label>בחר תבנית הודעה</label>
            <select id="templateSelector" class="form-control" onchange="updateWhatsappText(${idx})">${options}</select>
        </div>
        <div class="form-group">
            <label>תוכן ההודעה</label>
            <textarea id="whatsappText" class="note-area" rows="6"></textarea>
        </div>`;

    const footer = `<button type="button" class="btn secondary" onclick="closeModal()">ביטול</button>
                    <button type="button" class="btn" onclick="sendWhatsappFromDialog(${idx})">שלח ב-WhatsApp</button>`;

    showModal(`שליחת הודעה ללקוח: ${order['שם לקוח']}`, body, footer);
    updateWhatsappText(idx);
}

function updateWhatsappText(idx) {
    const order = rawData[idx];
    const selector = document.getElementById('templateSelector');
    const textarea = document.getElementById('whatsappText');
    if (!selector || !textarea || !order) return;
    
    const template = whatsappTemplates[selector.value];
    const endDateField = headers.find(h => String(h).includes("סיום"));

    let text = template.text;
    text = text.replace(/{{clientName}}/g, order['שם לקוח'] || '');
    text = text.replace(/{{orderId}}/g, order['מספר תעודה'] || ''); // Using תעודה as orderId
    text = text.replace(/{{endDate}}/g, formatDateTime(order[endDateField]) || '');
    textarea.value = text;
}

function sendWhatsappFromDialog(idx) {
    const order = rawData[idx];
    const text = document.getElementById('whatsappText').value;
    const phoneField = headers.find(h => h.includes("טלפון") || h.includes("phone"));
    const phone = phoneField ? order[phoneField] : "";
     if (!phone) { 
        showToast("לא נמצא מספר טלפון עבור הזמנה זו.", "warning");
        return;
    }
    const cleanPhone = String(phone).replace(/[^0-9]/g,'');
    window.open(`https://wa.me/972${cleanPhone.substring(cleanPhone.length-9)}?text=${encodeURIComponent(text)}`, "_blank");
    showToast('פותח WhatsApp...', 'info');
}



function showMap(addressQuery) {
    const title = "תצוגת מפה";
    const body = `<iframe 
                    width="100%" 
                    height="450" 
                    style="border:0" 
                    loading="lazy" 
                    allowfullscreen 
                    src="https://www.google.com/maps?q=${addressQuery}&output=embed">
                  </iframe>`;
    const footer = `<button class="btn secondary" onclick="closeModal()">סגור מפה</button>`;
    showModal(title, body, footer);
}

async function updateOrderStatus(idx, newStatus) {
    const statusHeaderIndex = headers.indexOf('סטטוס');

    if (statusHeaderIndex === -1) {
        showToast("שגיאה: לא נמצאה עמודת סטטוס.", "error");
        return;
    }
    
    const newRowArray = headers.map(h => rawData[idx][h]);
    newRowArray[statusHeaderIndex] = newStatus;
    
    try {
        const resp = await apiPost({ action: "updateRow", index: idx, row: newRowArray });
        if (resp && resp.apiError) return;
        showToast(`סטטוס עודכן ל: ${newStatus}`, 'success');
        await refresh(); 
        closeModal();
    } catch (e) {
        showToast("שגיאה בעדכון הסטטוס: " + e.message, "error");
    }
}


function editRowPrompt(idx) {
    const originalRow = rawData[idx];
    if (!originalRow) return;

    openNewOrder(originalRow, idx);
}

async function duplicateRow(idx) {
    const order = rawData[idx];
    const clientName = order['שם לקוח'];
    if (!clientName) { // Fallback to simple duplication if no client name
        openNewOrder(order);
        return;
    }

    // Client-side simulation of checking for open orders
    const openOrders = rawData.filter(r => 
        r['שם לקוח'] === clientName && 
        getStatusKey(r['סטטוס'], r['סטטוס ביצוע']) !== 'closed' && 
        r['מכולה ירדה']
    );
    
    if (openOrders.length > 0) {
        showSwapOrAddModal(order, openOrders[0]);
    } else {
        openNewOrder(order);
    }
}

function showSwapOrAddModal(originalOrder, activeOrder) {
    const containerId = activeOrder['מכולה ירדה'];
    const title = "זוהתה מכולה פעילה";
    const body = `<p>ללקוח <strong>${originalOrder['שם לקוח']}</strong> כבר יש מכולה פעילה (<strong>${containerId}</strong>).<br>איזו פעולה ברצונך לבצע?</p>`;
    const footer = `
        <button class="btn secondary" onclick="initiateSwapOrder(${rawData.indexOf(originalOrder)}, ${rawData.indexOf(activeOrder)})">🔄 בצע החלפה</button>
        <button class="btn" onclick="openNewOrder(${rawData.indexOf(originalOrder)})">➕ הורדה נוספת</button>
    `;
    showModal(title, body, footer);
}

function initiateSwapOrder(originalOrderIdx, activeOrderIdx) {
    const originalOrder = rawData[originalOrderIdx];
    const activeOrder = rawData[activeOrderIdx];
    const swapData = { ...originalOrder };

    swapData['סוג פעולה'] = 'החלפה';
    swapData['מכולה עלתה'] = activeOrder['מכולה ירדה'];
    swapData['הזמנה מקושרת'] = activeOrder['מספר תעודה'];
    swapData['תעודה'] = ''; // Clear for new document
    swapData['מספר תעודה'] = ''; // Clear for new document
    swapData['סטטוס ביצוע'] = 'ממתינה לביצוע';
    swapData['סטטוס'] = 'זמין'; // Reset status for new order
    swapData['מכולה ירדה'] = '';

    openNewOrder(swapData);
}

// ========== Smart Order Form ==========
function openNewOrder(initialData = null, editIndex = null) {
    isFullFormVisible = !!isEdit; // If editing, show all fields by default
    const data = initialData || {};
    const standardFields = headers.filter(h => !NEW_HEADERS.includes(h) && h !== 'שעת אספקה');
    const agentHeader = headers.find(h => h === 'שם סוכן');

    let formHtml = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 16px;">
            <img src="${ICONS.customer}" style="width: 48px; height: 48px;" alt="לקוח"/>
            <h3 style="font-weight: 700; color: var(--brand);">פרטי הזמנה</h3>
        </div>
        <div class="form-grid">`;
    
    const clientNameVal = data['שם לקוח'] || '';
    formHtml += `<div class="form-group autocomplete-container full-width">
        <label for="field-שם לקוח">שם לקוח</label>
        <input type="text" id="field-שם לקוח" name="שם לקוח" value="${clientNameVal}" oninput="handleClientSearch(this)">
        <div class="autocomplete-results" id="autocomplete-results"></div>
    </div>`;

    const actionType = data['סוג פעולה'] || 'הורדה';
    formHtml += `<div class="form-group">
        <label for="field-סוג_פעולה">סוג פעולה</label>
        <select id="field-סוג_פעולה" name="סוג פעולה" class="form-control" onchange="updateDynamicFormFields(this.value, {}, ${isEdit})">
            <option value="הורדה" ${actionType === 'הורדה' ? 'selected' : ''}>הורדה</option>
            <option value="החלפה" ${actionType === 'החלפה' ? 'selected' : ''}>החלפה</option>
            <option value="העלאה" ${actionType === 'העלאה' ? 'selected' : ''}>העלאה</option>
        </select>
    </div>`;

     if (agentHeader) {
        const agentVal = data[agentHeader] || '';
        formHtml += `<div class="form-group">
            <label for="field-${agentHeader}">${agentHeader}</label>
            <select id="field-${agentHeader}" name="${agentHeader}" class="form-control">
                <option value="">בחר סוכן</option>
                <option value="1-אגבאריה/שארק" ${agentVal === '1-אגבאריה/שארק' ? 'selected' : ''}>1-אגבאריה/שארק</option>
                <option value="2=מוחמד/שארק" ${agentVal === '2=מוחמד/שארק' ? 'selected' : ''}>2=מוחמד/שארק</option>
            </select>
        </div>`;
    } else {
        formHtml += '<div></div>';
    }
    
    standardFields.forEach(h => {
        if (h === 'שם לקוח') return;
        const val = data[h] || '';
        const isDateField = looksLikeDateHeader(h);
        const inputType = isDateField ? 'date' : 'text';
        const displayValue = isDateField && val ? new Date(val).toISOString().split('T')[0] : val;

        if (h === 'תאריך') {
             const timeVal = data['שעת אספקה'] || '';
             formHtml += `<div class="form-group">
                <label for="field-תאריך">תאריך</label>
                <input type="date" id="field-תאריך" name="תאריך" value="${displayValue}">
             </div>`;
             formHtml += `<div class="form-group">
                <label for="field-שעת אספקה">שעת אספקה</label>
                <input type="time" id="field-שעת אספקה" name="שעת אספקה" value="${timeVal}">
             </div>`;
        } else {
            formHtml += `<div class="form-group">
                <label for="field-${h}">${h}</label>
                <input type="${inputType}" id="field-${h}" name="${h}" value="${displayValue}">
            </div>`;
        }
    });
    
    formHtml += `</div><div class="form-grid" id="dynamic-fields-container"></div>`;

    modalForm.onsubmit = () => handleFormSubmit(editIndex, data);
    
    const title = ``;
    const buttonText = isEdit ? 'שמור שינויים' : 'צור הזמנה';
    const footer = `
        <div>
            ${!isEdit ? `<button type="button" class="btn secondary" onclick="toggleFullForm()">הצג את כל הטופס</button>` : ''}
        </div>
        <div>
            <button type="button" class="btn secondary" onclick="closeModal()">ביטול</button>
            <button type="submit" class="btn">${buttonText}</button>
        </div>`;

    showModal(title, formHtml, footer);
    updateDynamicFormFields(actionType, data, isEdit);
}

function toggleFullForm() {
    isFullFormVisible = !isFullFormVisible;
    const actionType = document.getElementById('field-סוג_פעולה').value;
     const button = modalFooter.querySelector('button');
    button.textContent = isFullFormVisible ? 'הסתר שדות מיותרים' : 'הצג את כל הטופס';
    
    const currentData = {};
    const formData = new FormData(modalForm);
    for(let [key, value] of formData.entries()) {
        currentData[key] = value;
    }
    updateDynamicFormFields(actionType, currentData); 
}

function updateDynamicFormFields(actionType, data = {}, forceShowAll = false) {
    const container = document.getElementById('dynamic-fields-container');
    if (!container) return;
    
    let fieldsHtml = '';
    const showDropped = forceShowAll || isFullFormVisible || actionType === 'הורדה' || actionType === 'החלפה';
    const showPickedUp = forceShowAll || isFullFormVisible || actionType === 'העלאה' || actionType === 'החלפה';

    if (showDropped) {
        fieldsHtml += `<div class="form-group">
            <label for="field-מכולה ירדה">מכולה ירדה</label>
            <input type="text" id="field-מכולה ירדה" name="מכולה ירדה" value="${data['מכולה ירדה'] || ''}" onblur="checkContainerAvailability(event)">
            <div class="form-warning" id="container-warning"></div>
        </div>`;
    }

    if (showPickedUp) {
         fieldsHtml += `<div class="form-group">
            <label for="field-מכולה עלתה">מכולה עלתה</label>
            <input type="text" id="field-מכולה עלתה" name="מכולה עלתה" value="${data['מכולה עלתה'] || ''}">
        </div>`;
    }
    container.innerHTML = fieldsHtml;
}

function handleClientSearch(inputElement) {
    const value = inputElement.value.toLowerCase();
    const resultsContainer = document.getElementById('autocomplete-results');
    resultsContainer.innerHTML = '';

    if (value.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }

    const matches = [...uniqueClientNames].filter(name => name.toLowerCase().includes(value));
    
    if (matches.length > 0) {
        matches.forEach(name => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = name;
            item.onclick = () => selectClient(name);
            resultsContainer.appendChild(item);
        });
        resultsContainer.style.display = 'block';
    } else {
        resultsContainer.style.display = 'none';
    }
}

function selectClient(name) {
    const clientOrder = rawData.find(r => r['שם לקוח'] === name);
    if (!clientOrder) return;
    
    document.getElementById('field-שם לקוח').value = name;
    // Auto-fill other fields based on the found order
    ['מספר לקוח', 'כתובת', 'טלפון'].forEach(h => {
        if (document.getElementById(`field-${h}`)) {
            document.getElementById(`field-${h}`).value = clientOrder[h] || '';
        }
    });
    
    document.getElementById('autocomplete-results').style.display = 'none';
}


async function checkContainerAvailability(e) {
    const containerId = e.target.value;
    const warningDiv = document.getElementById('container-warning');
    if (!containerId || !warningDiv) return;

    // Client-side check
    const existingOrder = rawData.find(r => r['מכולה ירדה'] == containerId && getStatusKey(r['סטטוס'], r['סטטוס ביצוע']) !== 'closed');
    
    if (existingOrder) {
        warningDiv.innerHTML = `⚠️ <strong>שימו לב!</strong> מכולה <strong>${containerId}</strong> רשומה כרגע אצל הלקוח "${existingOrder['שם לקוח']}".`;
        warningDiv.style.display = 'block';
    } else {
        warningDiv.style.display = 'none';
    }
}


async function handleFormSubmit(idx, initialData = null) {
    const isNew = idx === null;
    const action = isNew ? "addRow" : "updateRow";
    const formData = new FormData(modalForm);
    
    const finalRowData = isNew ? { ...initialData } : { ...rawData[idx] };

    for (let [key, value] of formData.entries()) {
        finalRowData[key] = value;
    }

    const wasPending = (isNew ? initialData : rawData[idx])?.['סטטוס ביצוע'] === 'ממתינה לביצוע';
    if (wasPending && (finalRowData['מספר תעודה'] || finalRowData['תעודה'])) {
        finalRowData['סטטוס ביצוע'] = 'בוצע';
    }

    if (isNew && !initialData) {
        finalRowData['סטטוס ביצוע'] = 'בוצע';
        finalRowData['סטטוס'] = 'זמין';
    }

    const rowAsArray = headers.map(h => finalRowData[h] || "");

    const payload = { 
        action: action, 
        row: rowAsArray
    };
    if (!isNew) {
        payload.index = idx;
    }

    const submitBtn = modalFooter.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'שומר...';
    submitBtn.disabled = true;

    try {
        const r = await apiPost(payload);
        if (r && r.apiError) { 
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            return; 
        }
        showToast(r.message || "הפעולה בוצעה בהצלחה", "success");
        
        if (wasPending && finalRowData['סטטוס ביצוע'] === 'בוצע' && finalRowData['הזמנה מקושרת']) {
            const linkedDocId = finalRowData['הזמנה מקושרת'];
            const linkedOrderIndex = rawData.findIndex(o => o['מספר תעודה'] == linkedDocId);
            if (linkedOrderIndex > -1) {
                 await apiPost({ action: "closeOrder", index: linkedOrderIndex });
                 showToast(`הזמנה מקושרת ${linkedDocId} נסגרה אוטומטית.`, 'info');
            }
        }

        if (r.status === 'success' && isNew && alertSettings.newOrder) {
            showToast('הזמנה חדשה נוצרה', 'info');
        }
        await refresh();
        closeModal();
    } catch (e) {
        showToast("שגיאה בשמירה: " + e.message, "error");
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

function deleteRowByIdx(idx) {
    const rowToDelete = rawData[idx];
    const identifier = rowToDelete[headers[0]] || `שורה ${idx+1}`;
    
    const body = `<p>האם אתה בטוח שברצונך למחוק את ההזמנה <strong>"${identifier}"</strong>? לא ניתן לשחזר פעולה זו.</p>`;
    const footer = `
        <button type="button" class="btn secondary" onclick="closeModal()">ביטול</button>
        <button type="button" class="btn danger" id="confirmDeleteBtn">מחק</button>`;

    showModal('אישור מחיקה', body, footer);

    document.getElementById('confirmDeleteBtn').onclick = async () => {
        const btn = document.getElementById('confirmDeleteBtn');
        btn.innerHTML = 'מוחק...';
        btn.disabled = true;

        try {
            const r = await apiPost({ action: "deleteRow", index: idx });
            if (r && r.apiError) return;
            showToast(r.message, "success");
            await refresh();
        } catch (e) {
            showToast("שגיאה במחיקה: " + e.message, "error");
        } finally {
            closeModal();
        }
    };
}

// Notes System
function promptForNote(orderIdx = null) {
    let body = `<textarea id="newNoteText" class="note-area" placeholder="תוכן ההערה..."></textarea>
                <label style="display:flex; align-items:center; gap: 8px; margin-top: 10px;">
                    <input type="checkbox" id="newNoteUrgent"> <strong>הערה דחופה</strong>
                </label>`;
    
    const footer = `<button class="btn secondary" onclick="closeModal()">ביטול</button>
                    <button class="btn" onclick="saveOrderNote(${orderIdx})">שמור הערה</button>`;

    const order = orderIdx !== null ? rawData[orderIdx] : null;
    const title = order ? `הוסף הערה להזמנה של ${order['שם לקוח']}` : 'הוסף הערה כללית';

    showModal(title, body, footer);
}

async function saveOrderNote(orderIdx) {
    const text = document.getElementById('newNoteText')?.value.trim();
    const isUrgent = document.getElementById('newNoteUrgent')?.checked;

    if (!text) {
        showToast("יש לכתוב תוכן להערה.", "warning");
        return;
    }
    
    const order = orderIdx !== null ? rawData[orderIdx] : null;

    const note = { 
        author: "מנהל", 
        text: text,
        isUrgent: isUrgent,
        orderId: order ? order['מספר הזמנה'] : 'כללי',
        clientName: order ? order['שם לקוח'] : 'N/A',
        clientNum: order ? order['מספר לקוח'] : 'N/A'
    };

    try {
        const resp = await apiPost({ action: "saveDevNote", note: note });
        if (resp && resp.apiError) return; // Modal already shown
        showToast(resp.message || "ההערה נשמרה", "success");
        closeModal();
        await loadDevNotes(); // Refresh notes list
    } catch(e) {
        console.error("שגיאה מלאה בשמירת הערה:", e);
        // The API helper will show the modal, so we just log here.
    }
}


async function loadDevNotes(){
    try {
        const resp = await apiGet("getDevNotes");
        const notesTableBody = document.getElementById('notesTableBody');
        notesTableBody.innerHTML = '';
        if (resp.status === "success" && resp.notes && resp.notes.length) {
            resp.notes.reverse().forEach(n => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDateTime(n.timestamp)}</td>
                    <td>${n.clientName || 'כללי'}</td>
                    <td class="${n.isUrgent ? 'note-urgent' : ''}">${n.note}</td>
                `;
                notesTableBody.appendChild(row);
            });
        } else {
            notesTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--muted);">אין הערות להצגה</td></tr>';
        }
    } catch(e) {
        // Toast is shown by apiGet
        console.error("Error loading dev notes", e);
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', function() {
    try {
        // DEFAULTS
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = "Assistant";
            Chart.defaults.font.weight = "bold";
            Chart.defaults.font.size = 14;
            Chart.defaults.color = "#333";
        }
        
        loadAlertSettings();
        refresh();
        loadDevNotes();
        initRealTimeUpdates();
        
        // Event Listeners
        document.getElementById('globalSearch').addEventListener('input', renderFilteredData);
        document.getElementById('showClosedCheckbox').addEventListener('change', renderFilteredData);
        document.getElementById('reportsBtn').addEventListener('click', showReportsPage);
        document.getElementById('overdueBtn').addEventListener('click', showOverdueManagementPage);
        document.getElementById('refreshBtn').addEventListener('click', refresh);
        document.getElementById('newOrderBtn').addEventListener('click', () => openNewOrder());
        document.getElementById('addNoteBtn').addEventListener('click', () => promptForNote(null));
        document.getElementById('loadNotesBtn').addEventListener('click', loadDevNotes);
        document.getElementById('saveAlertsBtn').addEventListener('click', saveAlertSettings);
        document.getElementById('dismissInstallBtn').addEventListener('click', dismissInstallPrompt);
        document.getElementById('installPwaBtn').addEventListener('click', installPWA);
        document.querySelectorAll('.kpi-card').forEach(card => {
            const type = card.id.split('-')[1];
            card.addEventListener('click', () => filterByKpi(type));
        });
        
        if ('serviceWorker' in navigator) {
            const swScript = `
                self.addEventListener('install', event => { self.skipWaiting(); });
                self.addEventListener('activate', event => {});
                self.addEventListener('fetch', event => {});
            `;
            const blob = new Blob([swScript], { type: 'application/javascript' });
            const swURL = URL.createObjectURL(blob);
            
            navigator.serviceWorker.register(swURL)
                .then(reg => console.log('SW registered:', reg))
                .catch(err => console.log('SW registration failed:', err));
        }
    } catch(err) {
        console.error("שגיאה קריטית באתחול האפליקציה:", err);
        alert("אירעה שגיאה קריטית. יש לרענן את הדף.");
    }
});
    </script>
</body>
</html>
