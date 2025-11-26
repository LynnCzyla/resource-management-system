// ============================================
// Employee Dashboard - Calendar View
// No Chart.js Dependencies
// ============================================

console.log('Dashboard script loaded');

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
// UPDATE HEADER
// ============================================
function updateHeaderInfo() {
    const headerName = document.getElementById('headerName');
    const headerAvatar = document.getElementById('headerAvatar');
    
    if (headerName) {
        headerName.textContent = 'John Doe';
    }
    
    if (headerAvatar) {
        headerAvatar.src = 'https://ui-avatars.com/api/?name=John+Doe&background=4A90E2&color=fff';
    }
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
function getCalendarData() {
    return [
        {
            dayName: 'Monday',
            dateString: 'Nov 3',
            totalHours: 8,
            morning: { 
                title: 'Website Redesign', 
                project: 'Project Alpha', 
                hours: 4, 
                color: 'blue' 
            },
            afternoon: { 
                title: 'API Integration', 
                project: 'Project Beta', 
                hours: 4, 
                color: 'orange' 
            }
        },
        {
            dayName: 'Tuesday',
            dateString: 'Nov 4',
            totalHours: 7,
            morning: { 
                title: 'UI Components', 
                project: 'Project Alpha', 
                hours: 4, 
                color: 'blue' 
            },
            afternoon: { 
                title: 'Backend Setup', 
                project: 'Project Beta', 
                hours: 3, 
                color: 'orange' 
            }
        },
        {
            dayName: 'Wednesday',
            dateString: 'Nov 5',
            totalHours: 6,
            morning: { 
                title: 'Database Design', 
                project: 'Project Beta', 
                hours: 3, 
                color: 'orange' 
            },
            afternoon: { 
                title: 'API Testing', 
                project: 'Project Beta', 
                hours: 3, 
                color: 'orange' 
            }
        },
        {
            dayName: 'Thursday',
            dateString: 'Nov 6',
            totalHours: 8,
            morning: { 
                title: 'Code Review', 
                project: 'Project Alpha', 
                hours: 4, 
                color: 'blue' 
            },
            afternoon: { 
                title: 'Documentation', 
                project: 'Project Beta', 
                hours: 4, 
                color: 'orange' 
            }
        },
        {
            dayName: 'Friday',
            dateString: 'Nov 7',
            totalHours: 5,
            morning: { 
                title: 'Testing Phase', 
                project: 'Project Alpha', 
                hours: 3, 
                color: 'green' 
            },
            afternoon: { 
                title: 'Client Meeting', 
                project: 'General', 
                hours: 2, 
                color: 'red' 
            }
        }
    ];
}

// ============================================
// LOAD CALENDAR
// ============================================
function loadCalendar() {
    console.log('Loading calendar...');
    
    const calendarData = getCalendarData();
    
    // Update week range
    const weekRangeEl = document.getElementById('weekRange');
    if (weekRangeEl) {
        weekRangeEl.textContent = 'Nov 3 - Nov 7, 2025';
    }
    
    // Get table elements
    const tableHead = document.querySelector('.calendar-table thead tr');
    const tableBody = document.getElementById('calendarBody');
    
    if (!tableHead) {
        console.error('Calendar table header not found');
        return;
    }
    
    if (!tableBody) {
        console.error('Calendar table body not found');
        return;
    }
    
    // Build table header
    let headerHTML = '<th class="time-column">Time</th>';
    
    calendarData.forEach(function(day) {
        const allocClass = getAllocationClass(day.totalHours);
        headerHTML += `
            <th class="day-column">
                <div class="day-header">
                    <div class="day-name">${day.dayName}</div>
                    <div class="day-date">${day.dateString}</div>
                    <div class="day-allocation ${allocClass}">${day.totalHours}h / 8h</div>
                </div>
            </th>
        `;
    });
    
    tableHead.innerHTML = headerHTML;
    
    // Build morning row
    let morningRow = `
        <tr>
            <td class="time-cell">
                <div class="time-label">Morning</div>
                <div class="time-range">8:00 AM - 12:00 PM</div>
            </td>
    `;
    
    calendarData.forEach(function(day) {
        if (day.morning) {
            morningRow += `
                <td class="task-cell">
                    <div class="task-item ${day.morning.color}">
                        <div class="task-title">${day.morning.title}</div>
                        <div class="task-project">${day.morning.project}</div>
                        <div class="task-hours">${day.morning.hours}h</div>
                    </div>
                </td>
            `;
        } else {
            morningRow += '<td class="task-cell"></td>';
        }
    });
    
    morningRow += '</tr>';
    
    // Build afternoon row
    let afternoonRow = `
        <tr>
            <td class="time-cell">
                <div class="time-label">Afternoon</div>
                <div class="time-range">1:00 PM - 5:00 PM</div>
            </td>
    `;
    
    calendarData.forEach(function(day) {
        if (day.afternoon) {
            afternoonRow += `
                <td class="task-cell">
                    <div class="task-item ${day.afternoon.color}">
                        <div class="task-title">${day.afternoon.title}</div>
                        <div class="task-project">${day.afternoon.project}</div>
                        <div class="task-hours">${day.afternoon.hours}h</div>
                    </div>
                </td>
            `;
        } else {
            afternoonRow += '<td class="task-cell"></td>';
        }
    });
    
    afternoonRow += '</tr>';
    
    // Set table body HTML
    tableBody.innerHTML = morningRow + afternoonRow;
    
    console.log('Calendar loaded successfully');
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
function loadDailySummary() {
    console.log('Loading daily summary...');
    
    const todayTasks = [
        { 
            title: 'Website Redesign', 
            hours: 4, 
            color: 'blue', 
            status: 'completed' 
        },
        { 
            title: 'API Integration', 
            hours: 2, 
            color: 'orange', 
            status: 'in-progress' 
        }
    ];
    
    const totalHours = todayTasks.reduce(function(sum, task) {
        return sum + task.hours;
    }, 0);
    
    const availableHours = 8 - totalHours;
    const percentage = Math.round((totalHours / 8) * 100);
    
    // Update tasks list
    const summaryList = document.querySelector('.summary-list');
    if (summaryList) {
        let tasksHTML = '';
        
        todayTasks.forEach(function(task) {
            const statusText = task.status === 'in-progress' ? ' (In Progress)' : '';
            tasksHTML += `
                <div class="summary-item">
                    <span class="summary-bullet ${task.color}"></span>
                    <span>${task.title} - ${task.hours}h${statusText}</span>
                </div>
            `;
        });
        
        summaryList.innerHTML = tasksHTML;
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
    
    console.log('Daily summary loaded successfully');
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Previous week button
    const prevWeekBtn = document.getElementById('prevWeek');
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', function() {
            showInfoMessage('Previous week navigation coming soon!');
        });
    }
    
    // Next week button
    const nextWeekBtn = document.getElementById('nextWeek');
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', function() {
            showInfoMessage('Next week navigation coming soon!');
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