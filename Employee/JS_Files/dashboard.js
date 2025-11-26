import { supabase } from "../../supabaseClient.js";

let currentReferenceDate = new Date();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing Dashboard');
    
    try {
        initializeDashboard();
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
});

// ============================================
// MAIN INITIALIZATION
// ============================================
function initializeDashboard() {
    // 1. Update header
    updateHeaderInfo();
    
    // 2. Update stats cards
    updateStats();
    
    // 3. Load calendar
    loadCalendar();
    
    // 4. Load daily summary
    loadDailySummary();
    
    // 5. Setup event listeners
    setupEventListeners();
}

// ============================================
// UPDATE HEADER WITH PROFILE PICTURE
// ============================================
async function updateHeaderInfo() {
    const headerName = document.getElementById('headerName');
    const headerAvatar = document.getElementById('headerAvatar');

    // Retrieve logged-in user info from localStorage
    const storedUser = localStorage.getItem("loggedUser");
    if (!storedUser) {
        console.warn("No user found in localStorage. Redirecting to login...");
        window.location.href = '/login/HTML_Files/login.html';
        return;
    }

    const user = JSON.parse(storedUser);

    // Display user name
    if (headerName) {
        headerName.textContent = user.name || "Unknown User";
    }

    // Fetch profile picture from database
    try {
        const { data: userDetails, error } = await supabase
            .from('user_details')
            .select('profile_pic')
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.warn('Error fetching user details:', error);
        }

        // Check if profile picture exists
        const profilePic = userDetails?.profile_pic;
        const hasValidProfilePic = profilePic && 
                                  profilePic.trim() !== '' && 
                                  profilePic !== 'null' && 
                                  profilePic !== 'undefined';

        // Display avatar
        if (headerAvatar) {
            if (hasValidProfilePic) {
                headerAvatar.src = profilePic;
                headerAvatar.style.objectFit = 'cover';
                console.log('[HEADER] Using profile picture from database:', profilePic);
            } else {
                // Fallback to UI Avatars
                const displayName = encodeURIComponent(user.name || "User");
                headerAvatar.src = `https://ui-avatars.com/api/?name=${displayName}&background=4A90E2&color=fff`;
                console.log('[HEADER] Using UI Avatars fallback');
            }

            // Add error handler for broken images
            headerAvatar.onerror = function() {
                const displayName = encodeURIComponent(user.name || "User");
                this.src = `https://ui-avatars.com/api/?name=${displayName}&background=4A90E2&color=fff`;
                console.log('[HEADER] Image load failed, using fallback');
            };
        }
    } catch (err) {
        console.error('[HEADER] Unexpected error fetching profile picture:', err);
        // Fallback to UI Avatars
        if (headerAvatar) {
            const displayName = encodeURIComponent(user.name || "User");
            headerAvatar.src = `https://ui-avatars.com/api/?name=${displayName}&background=4A90E2&color=fff`;
        }
    }

    console.log(`Logged in as: ${user.name} (${user.role})`);
}

// ============================================
// UPDATE STATS
// ============================================
function updateStats() {
    const stats = {
        activeAssignments: 2,
        workingHours: 6,
        completedTasks: 1,
        pendingTasks: 1
    };
    
    const elements = {
        activeAssignments: document.getElementById('activeAssignments'),
        workingHours: document.getElementById('workingHours'),
        completedTasks: document.getElementById('completedTasks'),
        pendingTasks: document.getElementById('pendingTasks')
    };
    
    if (elements.activeAssignments) {
        elements.activeAssignments.textContent = stats.activeAssignments;
    }
    
    if (elements.workingHours) {
        elements.workingHours.textContent = stats.workingHours + 'h';
    }
    
    if (elements.completedTasks) {
        elements.completedTasks.textContent = stats.completedTasks;
    }
    
    if (elements.pendingTasks) {
        elements.pendingTasks.textContent = stats.pendingTasks;
    }
}

// ============================================
// CALENDAR DATA
// ============================================
async function getCalendarData(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // 7-day range

    const storedUser = localStorage.getItem("loggedUser");
    if (!storedUser) {
        console.warn("No logged user found.");
        return [];
    }

    const user = JSON.parse(storedUser);

    // Format dates as YYYY-MM-DD for Supabase
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    console.log(`Fetching worklogs for ${user.name} between ${startStr} and ${endStr}`);

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

    if (error) {
        console.error('Error fetching worklogs:', error);
        return [];
    }

    return data || [];
}

// ============================================
// Get Monday of current week for a given date
// ============================================
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when Sunday
    return new Date(d.setDate(diff));
}

// ============================================
// LOAD CALENDAR
// ============================================
async function loadCalendar(referenceDate = new Date()) {
    console.log('Loading calendar...');

    // Compute current week's Monday dynamically
    const weekStart = getWeekStart(referenceDate);
    const worklogs = await getCalendarData(weekStart);

    // Prepare 5-day array (Mon-Fri)
    const days = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        days.push(date);
    }

    // Update week range in header
    const weekRangeEl = document.getElementById('weekRange');
    if (weekRangeEl) {
        const startStr = days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = days[4].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        weekRangeEl.textContent = `${startStr} - ${endStr}`;
    }

    // Table elements
    const tableHead = document.querySelector('.calendar-table thead tr');
    const tableBody = document.getElementById('calendarBody');
    if (!tableHead || !tableBody) return;

    // HEADER
    let headerHTML = '<th class="time-column">Time</th>';
    days.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const totalHours = worklogs
            .filter(w => w.log_date === dateStr)
            .reduce((sum, w) => sum + parseFloat(w.hours || 0), 0);

        const allocClass = getAllocationClass(totalHours);
        const allocText = `${totalHours}h / 8h`;

        headerHTML += `
            <th class="day-column">
                <div class="day-header">
                    <div class="day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div class="day-allocation ${allocClass}">${allocText}</div>
                </div>
            </th>`;
    });
    tableHead.innerHTML = headerHTML;

    // BODY
    let bodyHTML = `<tr>
        <td class="time-cell">
            <div class="time-label">Tasks</div>
            <div class="time-range">Daily Logs</div>
        </td>`;

    days.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const tasks = worklogs.filter(w => w.log_date === dateStr);

        if (tasks.length > 0) {
            const taskHTML = tasks.map((t, index) => {
                // Dynamic color fallback
                const colors = ['blue', 'orange', 'green', 'red'];
                const colorClass = t.color || colors[index % colors.length];
                return `
                    <div class="task-item ${colorClass}">
                        <div class="task-title">${t.work_type || 'Task'}</div>
                        <div class="task-project">${t.projects?.name || 'No Project'}</div>
                        <div class="task-hours">${t.hours}h</div>
                        <div class="task-desc">${t.work_description || ''}</div>
                    </div>
                `;
            }).join('');
            bodyHTML += `<td class="task-cell">${taskHTML}</td>`;
        } else {
            bodyHTML += `<td class="task-cell empty">No tasks</td>`;
        }
    });

    bodyHTML += '</tr>';
    tableBody.innerHTML = bodyHTML;

    console.log('Calendar loaded successfully.');
}

// ============================================
// GET ALLOCATION CLASS
// ============================================
function getAllocationClass(hours) {
    if (hours >= 8) {
        return 'full';
    } else if (hours >= 5) {
        return 'partial';
    } else {
        return 'under';
    }
}

// ============================================
// LOAD DAILY SUMMARY
// ============================================
async function loadDailySummary() {
    console.log('Loading daily summary...');

    const storedUser = localStorage.getItem("loggedUser");
    if (!storedUser) return;

    const user = JSON.parse(storedUser);

    // Get today's date in YYYY-MM-DD
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    try {
        const { data: todayTasks, error } = await supabase
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

        if (error) {
            console.error("Error fetching today's tasks:", error);
            return;
        }

        // Dynamic color assignment
        const colors = ['blue', 'orange', 'green', 'red'];

        // Calculate totals
        const totalHours = todayTasks?.reduce((sum, task) => sum + (parseFloat(task.hours) || 0), 0) || 0;
        const availableHours = Math.max(8 - totalHours, 0);
        const percentage = Math.round((totalHours / 8) * 100);

        // Update tasks list
        const summaryList = document.querySelector('.summary-list');
        if (summaryList) {
            if (!todayTasks || todayTasks.length === 0) {
                summaryList.innerHTML = `<div class="summary-item">No tasks for today</div>`;
            } else {
                let tasksHTML = '';
                todayTasks.forEach((task, index) => {
                    const colorClass = colors[index % colors.length];
                    const statusText = task.status === 'in-progress' ? ' (In Progress)' : '';
                    tasksHTML += `
                        <div class="summary-item">
                            <span class="summary-bullet ${colorClass}"></span>
                            <span>${task.work_type || 'Task'} - ${task.hours}h${statusText}</span>
                        </div>
                    `;
                });
                summaryList.innerHTML = tasksHTML;
            }
        }

        // Update Available Time Today card
        const availableCount = document.querySelector('.summary-count.available');
        if (availableCount) {
            availableCount.textContent = availableHours + 'h';
        }

        const availableInfo = document.querySelector('.available-info p');
        if (availableInfo) {
            availableInfo.textContent = `You have ${availableHours} hours of available capacity remaining for today.`;
        }

        // Update "Tasks Produced Today" count dynamically
        const producedCountEl = document.querySelector('.summary-count');
        if (producedCountEl) {
            producedCountEl.textContent = todayTasks?.length || 0;
        }

        // Update allocation status
        const allocationStatus = document.querySelector('.allocation-status');
        if (allocationStatus) {
            allocationStatus.innerHTML = `Current Allocation: <strong>${totalHours}h / 8h (${percentage}%)</strong>`;
        }

        console.log('Daily summary loaded successfully');

    } catch (err) {
        console.error("Unexpected error loading today's tasks:", err);
    }
}

// ============================================
// RENDER DAILY SUMMARY (Reusable)
// ============================================
function renderDailySummary(tasks) {
    const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
    const availableHours = 8 - totalHours;
    const percentage = Math.round((totalHours / 8) * 100);

    // Update tasks list
    const summaryList = document.querySelector('.summary-list');
    if (summaryList) {
        summaryList.innerHTML = tasks.map(task => {
            const statusText = task.status === 'in-progress' ? ' (In Progress)' : '';
            return `
                <div class="summary-item">
                    <span class="summary-bullet ${task.color}"></span>
                    <span>${task.title} - ${task.hours}h${statusText}</span>
                </div>
            `;
        }).join('');
    }

    // Update available hours
    const availableCount = document.querySelector('.summary-count.available');
    if (availableCount) {
        availableCount.textContent = availableHours + 'h';
    }

    // Update allocation status
    const allocationStatus = document.querySelector('.allocation-status');
    if (allocationStatus) {
        allocationStatus.innerHTML = `Current Allocation: <strong>${totalHours}h / 8h (${percentage}%)</strong>`;
    }

    console.log('Daily summary rendered successfully');
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    console.log('Setting up event listeners...');

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Previous week button
    const prevWeekBtn = document.getElementById('prevWeek');
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', function() {
            currentReferenceDate.setDate(currentReferenceDate.getDate() - 7);
            loadCalendar(currentReferenceDate);
        });
    }
    
    const nextWeekBtn = document.getElementById('nextWeek');
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', function() {
            currentReferenceDate.setDate(currentReferenceDate.getDate() + 7);
            loadCalendar(currentReferenceDate);
        });
    }
}

// ============================================
// HANDLE LOGOUT
// ============================================
function handleLogout() {
    if (typeof Swal === 'undefined') {
        const confirmed = confirm('Are you sure you want to logout?');
        if (confirmed) {
            window.location.href = '/login/HTML_Files/login.html';
        }
        return;
    }
    
    Swal.fire({
        title: 'Confirm Logout',
        text: 'Are you sure you want to logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#000000',
        cancelButtonColor: '#6C757D',
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'Cancel'
    }).then(function(result) {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Logging out...',
                allowOutsideClick: false,
                didOpen: function() {
                    Swal.showLoading();
                }
            });
            
            setTimeout(function() {
                localStorage.removeItem("loggedUser");
                window.location.href = '/login/HTML_Files/login.html';
            }, 1000);
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