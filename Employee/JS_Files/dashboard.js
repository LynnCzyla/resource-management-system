import { supabase } from "../../supabaseClient.js";

let currentReferenceDate = new Date();

// Cache to avoid unnecessary Supabase calls
const cache = {
    today: null,
    week: {}
};

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard().catch(err => console.error(err));
});

// ============================================
// MAIN INITIALIZATION (Optimized - Parallel Loading)
// ============================================
async function initializeDashboard() {
    // Show loading indicator
    showLoadingAlert('Loading dashboard...');

    try {
        // Update stats immediately (local only)
        updateStats();

        // Run async data loads in parallel to reduce waiting time
        await Promise.all([
            updateHeaderInfo(),
            loadCalendar(currentReferenceDate),
            loadDailySummary(),
        ]);

        setupEventListeners();
        
        // Close loading indicator
        closeLoadingAlert();
        
    } catch (error) {
        // Close loading and show error
        closeLoadingAlert();
        showErrorMessage('Failed to load dashboard. Please try again.');
        console.error('Dashboard initialization error:', error);
    }
}

// ============================================
// LOADING ALERT FUNCTIONS
// ============================================
function showLoadingAlert(message = 'Loading...') {
    if (typeof Swal === 'undefined') {
        console.log(message);
        return;
    }

    Swal.fire({
        title: message,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        },
        backdrop: true,
        showConfirmButton: false,
        willOpen: () => {
            // Add blur effect to background if needed
            const app = document.querySelector('.dashboard-container');
            if (app) app.style.filter = 'blur(2px)';
        }
    });
}

function closeLoadingAlert() {
    if (typeof Swal !== 'undefined') {
        Swal.close();
        // Remove blur effect
        const app = document.querySelector('.dashboard-container');
        if (app) app.style.filter = 'none';
    }
}

// ============================================
// UPDATE HEADER WITH PROFILE PICTURE
// ============================================
async function updateHeaderInfo() {
    const headerName = document.getElementById('headerName');
    const headerAvatar = document.getElementById('headerAvatar');

    const storedUser = localStorage.getItem("loggedUser");
    if (!storedUser) {
        window.location.href = '/login/HTML_Files/login.html';
        return;
    }

    const user = JSON.parse(storedUser);

    // Show user name
    if (headerName) headerName.textContent = user.name || "Unknown User";

    // Fetch profile picture
    try {
        const { data: userDetails } = await supabase
            .from('user_details')
            .select('profile_pic')
            .eq('user_id', user.id)
            .single();

        const profilePic = userDetails?.profile_pic;
        const usingDBPic = profilePic && profilePic.trim() !== '' && profilePic !== 'null';

        if (headerAvatar) {
            if (usingDBPic) {
                headerAvatar.src = profilePic;
                headerAvatar.style.objectFit = 'cover';
            } else {
                const name = encodeURIComponent(user.name || "User");
                headerAvatar.src = `https://ui-avatars.com/api/?name=${name}&background=4A90E2&color=fff`;
            }

            // Fallback for broken images
            headerAvatar.onerror = function() {
                const name = encodeURIComponent(user.name || "User");
                this.src = `https://ui-avatars.com/api/?name=${name}&background=4A90E2&color=fff`;
            };
        }
    } catch (err) {
        console.error(err);
    }
}

// ============================================
// UPDATE STATS (Unchanged — Fast)
// ============================================
function updateStats() {
    const stats = {
        activeAssignments: 2,
        workingHours: 6,
        completedTasks: 1,
        pendingTasks: 1
    };

    const id = (x) => document.getElementById(x);
    if (id('activeAssignments')) id('activeAssignments').textContent = stats.activeAssignments;
    if (id('workingHours')) id('workingHours').textContent = stats.workingHours + 'h';
    if (id('completedTasks')) id('completedTasks').textContent = stats.completedTasks;
    if (id('pendingTasks')) id('pendingTasks').textContent = stats.pendingTasks;
}

// ============================================
// GET CALENDAR DATA (With Week Caching)
// ============================================
async function getCalendarData(startDate) {
    const startStr = startDate.toISOString().split('T')[0];

    if (cache.week[startStr]) return cache.week[startStr];

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const endStr = endDate.toISOString().split('T')[0];

    const storedUser = localStorage.getItem("loggedUser");
    if (!storedUser) return [];

    const user = JSON.parse(storedUser);

    const { data, error } = await supabase
        .from('worklogs')
        .select(`
            id,
            log_date,
            hours,
            work_type,
            work_description,
            status,
            projects ( name )
        `)
        .eq('user_id', user.id)
        .gte('log_date', startStr)
        .lte('log_date', endStr)
        .order('log_date', { ascending: true });

    if (!error) cache.week[startStr] = data || [];

    return data || [];
}

// ============================================
// WEEK START
// ============================================
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// ============================================
// LOAD CALENDAR (Optimized DOM Rendering)
// ============================================
async function loadCalendar(referenceDate = new Date()) {
    const weekStart = getWeekStart(referenceDate);
    const worklogs = await getCalendarData(weekStart);

    // Prepare 5-day list
    const days = [...Array(5)].map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
    });

    // Update week range
    const startStr = days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = days[4].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekRangeEl = document.getElementById('weekRange');
    if (weekRangeEl) weekRangeEl.textContent = `${startStr} - ${endStr}`;

    // Build header in one shot
    const tableHead = document.querySelector('.calendar-table thead tr');
    let headerHTML = `<th class="time-column">Time</th>`;
    days.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const totalHours = worklogs
            .filter(w => w.log_date === dateStr)
            .reduce((sum, w) => sum + (parseFloat(w.hours) || 0), 0);

        const allocClass = getAllocationClass(totalHours);

        headerHTML += `
            <th class="day-column">
                <div class="day-header">
                    <div class="day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div class="day-allocation ${allocClass}">${totalHours}h / 8h</div>
                </div>
            </th>
        `;
    });
    tableHead.innerHTML = headerHTML;

    // Build body using DocumentFragment (much faster)
    const tableBody = document.getElementById('calendarBody');
    const row = document.createElement("tr");

    // Time column
    const timeCell = document.createElement("td");
    timeCell.className = "time-cell";
    timeCell.innerHTML = `
        <div class="time-label">Tasks</div>
        <div class="time-range">Daily Logs</div>
    `;
    row.appendChild(timeCell);

    // Task cells
    const colors = ['blue', 'orange', 'green', 'red'];

    days.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const tasks = worklogs.filter(w => w.log_date === dateStr);

        const td = document.createElement("td");
        td.className = "task-cell";

        if (tasks.length === 0) {
            td.classList.add("empty");
            td.textContent = "No tasks";
        } else {
            td.innerHTML = tasks.map((t, i) => `
                <div class="task-item ${t.color || colors[i % colors.length]}">
                    <div class="task-title">${t.work_type}</div>
                    <div class="task-project">${t.projects?.name || ''}</div>
                    <div class="task-hours">${t.hours}h</div>
                    <div class="task-desc">${t.work_description || ''}</div>
                </div>
            `).join('');
        }

        row.appendChild(td);
    });

    // Replace table body content in one operation
    tableBody.innerHTML = "";
    tableBody.appendChild(row);
}

// ============================================
// GET ALLOCATION CLASS (Same)
// ============================================
function getAllocationClass(hours) {
    if (hours >= 8) return 'full';
    if (hours >= 5) return 'partial';
    return 'under';
}

// ============================================
// LOAD DAILY SUMMARY (Now Cached + Optimized)
// ============================================
async function loadDailySummary() {
    const storedUser = localStorage.getItem("loggedUser");
    if (!storedUser) return;

    const user = JSON.parse(storedUser);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Use cache if available (<5 mins old)
    if (cache.today && Date.now() - cache.today.timestamp < 300000) {
        return renderDailySummary(cache.today.data);
    }

    const { data, error } = await supabase
        .from('worklogs')
        .select(`
            id,
            work_type,
            hours,
            work_description,
            status,
            projects ( name )
        `)
        .eq('user_id', user.id)
        .eq('log_date', todayStr)
        .order('id', { ascending: true });

    if (!error) {
        cache.today = { timestamp: Date.now(), data: data || [] };
        renderDailySummary(data);
    }
}

// ============================================
// RENDER DAILY SUMMARY (Optimized HTML)
// ============================================
function renderDailySummary(tasks = []) {
    const colors = ['blue', 'orange', 'green', 'red'];

    const totalHours = tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
    const availableHours = Math.max(8 - totalHours, 0);

    const summaryList = document.querySelector('.summary-list');
    if (summaryList) {
        summaryList.innerHTML =
            tasks.length === 0
                ? `<div class="summary-item">No tasks for today</div>`
                : tasks.map((task, i) => `
                    <div class="summary-item">
                        <span class="summary-bullet ${colors[i % colors.length]}"></span>
                        <span>${task.work_type} - ${task.hours}h${task.status === 'in-progress' ? ' (In Progress)' : ''}</span>
                    </div>
                `).join('');
    }

    const availableCount = document.querySelector('.summary-count.available');
    if (availableCount) availableCount.textContent = availableHours + 'h';

    const producedCountEl = document.querySelector('.summary-count');
    if (producedCountEl) producedCountEl.textContent = tasks.length;

    const allocationStatus = document.querySelector('.allocation-status');
    if (allocationStatus) {
        const pct = Math.round((totalHours / 8) * 100);
        allocationStatus.innerHTML = `Current Allocation: <strong>${totalHours}h / 8h (${pct}%)</strong>`;
    }
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    const prevWeekBtn = document.getElementById('prevWeek');
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', () => {
            currentReferenceDate.setDate(currentReferenceDate.getDate() - 7);
            loadCalendar(currentReferenceDate).finally(closeLoadingAlert);
        });
    }

    const nextWeekBtn = document.getElementById('nextWeek');
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', () => {
            currentReferenceDate.setDate(currentReferenceDate.getDate() + 7);
            loadCalendar(currentReferenceDate).finally(closeLoadingAlert);
        });
    }
}

// ============================================
// HANDLE LOGOUT
// ============================================
function handleLogout() {
    if (typeof Swal === 'undefined') {
        if (confirm('Are you sure?')) window.location.href = '/login/HTML_Files/login.html';
        return;
    }

    Swal.fire({
        title: 'Confirm Logout',
        text: 'Are you sure you want to logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#000000',
        cancelButtonColor: '#6C757D'
    }).then(result => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Logging out...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            setTimeout(() => {
                localStorage.removeItem("loggedUser");
                window.location.href = '/login/HTML_Files/login.html';
            }, 800);
        }
    });
}

// ============================================
// SHOW INFO MESSAGE
// ============================================
function showInfoMessage(message) {
    if (typeof Swal === 'undefined') {
        alert(message);
        return;
    }

    Swal.fire({
        icon: 'info',
        title: 'Info',
        text: message,
        confirmButtonColor: '#000000'
    });
}

// ============================================
// SHOW ERROR MESSAGE
// ============================================
function showErrorMessage(message) {
    if (typeof Swal === 'undefined') {
        alert('Error: ' + message);
        return;
    }

    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonColor: '#000000'
    });
}