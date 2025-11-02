// dashboard.js - Complete version with Today's Worklogs
import { supabase } from "../../supabaseClient.js";

// ============================================
// UTILITY FUNCTIONS
// ============================================

function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ============================================
// MODAL UTILITIES
// ============================================

class ModalManager {
    static show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    static showLoading() {
        this.show('loadingOverlay');
    }

    static hideLoading() {
        this.hide('loadingOverlay');
    }
}

// ============================================
// MESSAGE UTILITIES
// ============================================

function showSuccessMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box success';
    messageBox.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
    messageBox.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 3000;
        min-width: 300px;
        padding: 16px;
        background: #7ED321;
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    document.body.appendChild(messageBox);
    setTimeout(() => messageBox.remove(), 3000);
}

function showErrorMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box error';
    messageBox.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
    messageBox.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 3000;
        min-width: 300px;
        padding: 16px;
        background: #E74C3C;
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    document.body.appendChild(messageBox);
    setTimeout(() => messageBox.remove(), 3000);
}

// ============================================
// DATA SERVICE (Supabase Integration)
// ============================================

class DataService {
    // Correct way to declare
    async generateActiveProjects(userId, selectedDate = new Date()) {
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
    
            const { data, error } = await supabase
                .from('project_assignments')
                .select(`
                    id,
                    project_id,
                    status,
                    assigned_at,
                    role_in_project,
                    projects (
                        id,
                        name,
                        start_date,
                        end_date
                    )
                `)
                .eq('user_id', userId)
                .in('status', ['assigned', 'completed']);
    
            if (error) {
                console.error('Error fetching active projects:', error);
                return [];
            }
    
            // Fetch all worklogs for the user
            const { data: worklogsData, error: worklogsError } = await supabase
                .from('worklogs')
                .select('log_date, hours, project_id')
                .eq('user_id', userId);
    
            if (worklogsError) {
                console.error('Error fetching worklogs for projects:', worklogsError);
            }
    
            const worklogs = Array.isArray(worklogsData) ? worklogsData : [];
    
            return data.map(pa => {
                const projectHours = worklogs
                    .filter(w => w.project_id === pa.project_id)
                    .filter(w => new Date(w.log_date).toISOString().split('T')[0] === dateStr)
                    .reduce((sum, w) => sum + (parseFloat(w.hours) || 0), 0);
    
                return {
                    id: pa.project_id,
                    name: pa.projects?.name || 'Unknown Project',
                    status: pa.status,
                    role: pa.role_in_project || 'Member',
                    hours: projectHours
                };
            });
    
        } catch (err) {
            console.error('Unexpected error in generateActiveProjects:', err);
            return [];
        }
    }
    
    // Fetch all employees and their worklogs
    async getAllEmployees(selectedDate = new Date()) {
        try {
            console.log('Fetching employees from database...');

            const { data, error } = await supabase
                .from('user_details')
                .select(`
                    employee_id,
                    job_title,
                    department,
                    status,
                    experience_level,
                    skills,
                    user_id,
                    users:user_id (
                        id,
                        name,
                        email,
                        role
                    )
                `);

            if (error) throw error;
            if (!data || data.length === 0) return [];

            // Filter only employees & project managers
            const filteredData = data.filter(emp => {
                const role = emp.users?.role || '';
                return role === 'employee';
            });

            console.log('Filtered employees:', filteredData.length);

            // Transform employees with workload & worklogs
            const employees = await Promise.all(
                filteredData.map(emp => this.transformEmployee(emp, selectedDate))
            );

            return employees.filter(emp => emp !== null);
        } catch (err) {
            console.error('Error in getAllEmployees:', err);
            return [];
        }
    }

    

    // Transform single employee
    async transformEmployee(emp, selectedDate = new Date()) {
        // Ensure we have a valid userId
        const userId = emp.userId || emp.users?.id;
        if (!userId) {
            console.warn('No user_id found for employee:', emp);
            return null; // skip this employee
        }
    
        const name = emp.name || emp.users?.name || 'Unknown';
        console.log(`Fetching worklogs for userId: ${userId} employee: ${name}`);
    
        // Fetch worklogs safely
        let worklogs = [];
        try {
            const { data: worklogsData, error } = await supabase
                .from('worklogs')
                .select('log_date, hours, work_type, work_description, status') 
                .eq('user_id', Number(userId))
                .order('log_date', { ascending: true });
    
            if (error) {
                console.error(`Error fetching worklogs for ${name}:`, error);
            }
    
            worklogs = Array.isArray(worklogsData) ? worklogsData : [];
        } catch (err) {
            console.error(`Unexpected error fetching worklogs for ${name}:`, err);
        }
    
        // Calculate workload safely
        const workload = await this.calculateWorkload(userId, selectedDate);
        const status = getWorkloadStatus(workload.today);
    
        return {
            id: emp.id || emp.employee_id,
            userId: userId,
            name: name,
            role: emp.role || emp.job_title || 'No role',
            email: emp.email || emp.users?.email || 'No email',
            skills: Array.isArray(emp.skills) ? emp.skills : [],
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4A90E2&color=fff`,
            workload: workload,
            worklogs: worklogs,
            status: status,
            userRole: emp.userRole || emp.users?.role || 'employee'
        };
    }
    
    
    

    // Calculate workload from worklogs array
    // --- REPLACE DataService.calculateWorkload WITH THIS ---
async calculateWorkload(userId, selectedDate = new Date()) {
    try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        console.log(`[DEBUG] Calculating workload for userId=${userId} on date=${dateStr}`);

        const { data: worklogsData, error } = await supabase
            .from('worklogs')
            .select('log_date, hours')
            .eq('user_id', userId);

        if (error) {
            console.error('[DEBUG] Supabase error:', error);
            return { today: 0, week: Array(5).fill(0), month: Array(30).fill(0) };
        }

        const worklogs = Array.isArray(worklogsData) ? worklogsData : [];
        console.log('[DEBUG] Retrieved worklogs:', worklogs);

        // --- TODAY ---
        const todayLogs = worklogs.filter(w => {
            // normalize to YYYY-MM-DD string
            const logDateStr = new Date(w.log_date).toISOString().split('T')[0];
            return logDateStr === dateStr;
        });
        console.log('[DEBUG] Today logs:', todayLogs);
        const todayHours = todayLogs.reduce((sum, w) => sum + (parseFloat(w.hours) || 0), 0);
        console.log('[DEBUG] Today hours total:', todayHours);

        // --- WEEK (Mon-Fri) using UTC-normalized days to avoid timezone drift ---
        const weekHours = Array(5).fill(0);
        const selectedDay = new Date(selectedDate);

        // compute monday (local) but we'll convert to UTC midnight numbers for math
        const diffToMonday = (selectedDay.getDay() + 6) % 7; // Monday => 0
        const monday = new Date(selectedDay);
        monday.setDate(selectedDay.getDate() - diffToMonday);

        // UTC midnight numeric values
        const msPerDay = 24 * 60 * 60 * 1000;
        const mondayUTC = Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate());

        console.log('[DEBUG] Week base (monday):', monday.toISOString().split('T')[0], 'mondayUTC:', mondayUTC);

        worklogs.forEach(w => {
            const logDate = new Date(w.log_date);
            const logUTC = Date.UTC(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());

            const dayDiff = Math.floor((logUTC - mondayUTC) / msPerDay); // integer day difference
            // only map Mon(0) .. Fri(4)
            if (dayDiff >= 0 && dayDiff < 5) {
                const h = parseFloat(w.hours) || 0;
                weekHours[dayDiff] += h;
                console.log(`[DEBUG] Mapping log ${logDate.toISOString().split('T')[0]} -> week index ${dayDiff} (+${h}h)`);
            }
        });
        console.log('[DEBUG] Week hours:', weekHours);

        // --- MONTH ---
            // --- MONTH (Grouped by Week) ---
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

        // Get all weeks within the month (max 5)
        const monthWeeks = [];
        let weekStart = new Date(monthStart);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // align to Monday

        while (weekStart <= monthEnd) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            monthWeeks.push({ start: new Date(weekStart), end: new Date(weekEnd), hours: 0 });
            weekStart.setDate(weekStart.getDate() + 7);
        }

        // Aggregate hours into weeks
        worklogs.forEach(w => {
            const logDate = new Date(w.log_date);
            if (
                logDate.getFullYear() === selectedDate.getFullYear() &&
                logDate.getMonth() === selectedDate.getMonth()
            ) {
                monthWeeks.forEach(week => {
                    if (logDate >= week.start && logDate <= week.end) {
                        week.hours += parseFloat(w.hours) || 0;
                    }
                });
            }
        });

        // Convert to array of weekly totals
        const monthHours = monthWeeks.map(w => w.hours);

        console.log("[DEBUG] Month grouped weeks:", monthWeeks);


        return {
            today: todayHours,
            week: weekHours,
            month: monthHours
        };

    } catch (err) {
        console.error('[DEBUG] Error calculating workload:', err);
        return { today: 0, week: Array(5).fill(0), month: Array(30).fill(0) };
    }
}

    
    
}

// ============================================
// WORKLOAD CALCULATIONS
// ============================================

function calculateWorkloadStats(employees, period = 'today') {
    const stats = {
        total: employees.length,
        available: 0,
        partial: 0,
        fullyAllocated: 0,
        overtime: 0,
        totalHours: 0,
        belowTarget: 0,
        atTarget: 0,
        overTarget: 0
    };

    employees.forEach(emp => {
        let hours = 0;
        if (period === 'today') {
            hours = emp.workload.today;
        } else if (period === 'week') {
            hours = emp.workload.week.reduce((a, b) => a + b, 0) / emp.workload.week.length;
        } else if (period === 'month') {
            hours = emp.workload.month.reduce((a, b) => a + b, 0) / emp.workload.month.length;
        }

        stats.totalHours += hours;
        
        if (hours < 4) stats.available++;
        else if (hours >= 4 && hours < 8) stats.partial++;
        else if (hours === 8) stats.fullyAllocated++;
        else if (hours > 8) stats.overtime++;

        if (hours < 8) stats.belowTarget++;
        else if (hours === 8) stats.atTarget++;
        else stats.overTarget++;
    });

    stats.avgHours = employees.length > 0 ? (stats.totalHours / employees.length).toFixed(1) : 0;
    return stats;
}

function getWorkloadStatus(hours) {
    if (hours < 4) return 'available';
    if (hours >= 4 && hours < 8) return 'partial';
    if (hours === 8) return 'full';
    return 'over';
}

function getStatusLabel(hours) {
    const status = getWorkloadStatus(hours);
    switch(status) {
        case 'available': return 'Available';
        case 'partial': return 'Partial';
        case 'full': return 'Fully Allocated';
        case 'over': return 'Overtime';
        default: return 'Unknown';
    }
}

function getStatusColor(hours) {
    const status = getWorkloadStatus(hours);
    switch(status) {
        case 'available': return '#27AE60';  // green
        case 'partial': return '#F1C40F';    // yellow
        case 'full': return '#3498DB';       // blue
        case 'over': return '#E74C3C';       // red
        default: return '#95A5A6';           // gray
    }
}

// ============================================
// UI MANAGER
// ============================================

class UIManager {
    constructor(dataService) {
        this.dataService = dataService;
        this.employees = [];
        this.filteredEmployees = [];
        this.currentPeriod = 'today';
        this.selectedDate = new Date();
        this.searchQuery = '';
    }

    async loadEmployees() {
        try {
            ModalManager.showLoading();
            this.employees = await Promise.all(
                (await this.dataService.getAllEmployees()).map(emp => 
                    this.dataService.transformEmployee(emp, this.selectedDate)
                )
            );
            this.filteredEmployees = [...this.employees];
            ModalManager.hideLoading();
            this.renderDashboard(this.currentPeriod);
        } catch (error) {
            ModalManager.hideLoading();
            showErrorMessage('Failed to load employee data');
        }
    }
    

    filterEmployees() {
        this.filteredEmployees = this.employees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                                emp.role.toLowerCase().includes(this.searchQuery.toLowerCase());
            return matchesSearch;
        });
        
        this.renderDashboard(this.currentPeriod);
    }

    setSearchQuery(query) {
        this.searchQuery = query;
        this.filterEmployees();
    }

    async setSelectedDate(date) {
        this.selectedDate = new Date(date);
        console.log('[DEBUG] Selected date changed to:', this.selectedDate.toISOString().split('T')[0]);
    
        // Recalculate workloads for all employees
        await Promise.all(
            this.employees.map(async emp => {
                console.log(`[DEBUG] Recalculating workload for: ${emp.name} (userId=${emp.userId})`);
                emp.workload = await this.dataService.calculateWorkload(emp.userId, this.selectedDate);
                console.log(`[DEBUG] New workload for ${emp.name}:`, emp.workload);
                emp.status = getWorkloadStatus(emp.workload.today);
            })
        );
    
        // Refresh filtered list and render dashboard
        this.filteredEmployees = [...this.employees];
        console.log('[DEBUG] Filtered employees ready for rendering:', this.filteredEmployees.map(e => e.name));
        this.renderDashboard(this.currentPeriod);
    }
    
    

    renderDashboard(period = 'today') {
        this.currentPeriod = period;
        const stats = calculateWorkloadStats(this.filteredEmployees, period);
        
        console.log('Dashboard stats:', stats);
        
        this.updateStatsCard('totalEmployees', stats.total);
        this.updateStatsCard('availableEmployees', stats.available);
        this.updateStatsCard('partialEmployees', stats.partial);
        this.updateStatsCard('fullyAllocated', stats.fullyAllocated);
        this.updateStatsCard('avgHours', stats.avgHours + 'h');
        this.updateStatsCard('belowTarget', stats.belowTarget);
        this.updateStatsCard('atTarget', stats.atTarget);
        this.updateStatsCard('overTarget', stats.overTarget);

        this.renderTimeline(period);
    }

    updateStatsCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    renderTimeline(period = 'today') {
        const timelineRows = document.getElementById('timelineRows');
        const timelineDates = document.getElementById('timelineDates');

        if (!timelineRows || !timelineDates) {
            console.error('Timeline containers not found');
            return;
        }

        console.log('Rendering timeline for period:', period);
        console.log('Employees to render:', this.filteredEmployees.length);

        timelineRows.innerHTML = '';
        timelineDates.innerHTML = '';

        this.renderTimelineDates(period, timelineDates);
        
        const rowsFragment = document.createDocumentFragment();
        this.filteredEmployees.forEach(emp => {
            const row = this.createEmployeeRow(emp, period);
            rowsFragment.appendChild(row);
        });

        timelineRows.appendChild(rowsFragment);
    }

    renderTimelineDates(period, container) {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'timeline-date-cell';
        dateHeader.textContent = 'Employee';
        container.appendChild(dateHeader);
    
        if (period === 'today') {
            const cell = document.createElement('div');
            cell.className = 'timeline-date-cell';
            cell.textContent = this.selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            container.appendChild(cell);
        } else if (period === 'week') {
            const selectedDay = new Date(this.selectedDate);
            const diffToMonday = (selectedDay.getDay() + 6) % 7;
            const monday = new Date(selectedDay);
            monday.setDate(selectedDay.getDate() - diffToMonday);
    
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
            for (let i = 0; i < 5; i++) {
                const cellDate = new Date(monday);
                cellDate.setDate(monday.getDate() + i);
    
                const cell = document.createElement('div');
                cell.className = 'timeline-date-cell';
                cell.textContent = `${days[i]} ${cellDate.getDate()}/${cellDate.getMonth() + 1}`;
                container.appendChild(cell);
            }
        } else if (period === 'month') {
            for (let i = 1; i <= 5; i++) { // usually 4–5 weeks
                const cell = document.createElement('div');
                cell.className = 'timeline-date-cell';
                cell.textContent = `Week ${i}`;
                container.appendChild(cell);
            }
        }        
    }
    

    createEmployeeRow(emp, period) {
        const row = document.createElement('div');
        row.className = 'timeline-row';
    
        // -----------------------------
        // Employee Cell
        // -----------------------------
        const employeeCell = document.createElement('div');
        employeeCell.className = 'employee-cell';
        
        if (period === 'today') {
            employeeCell.style.cursor = 'pointer';
            employeeCell.onclick = () => openViewEmployeeModal(emp.id);
        } else {
            employeeCell.style.cursor = 'default';
            employeeCell.title = "Modal view only available for today";
        }
    
        const img = document.createElement('img');
        img.src = emp.avatar;
        img.alt = emp.name;
    
        const infoDiv = document.createElement('div');
        infoDiv.className = 'employee-cell-info';
    
        const h4 = document.createElement('h4');
        h4.textContent = emp.name;
    
        const p = document.createElement('p');
        p.textContent = emp.role;
    
        const statusSpan = document.createElement('span');
        statusSpan.textContent = getStatusLabel(emp.workload.today);
        statusSpan.style.color = getStatusColor(emp.workload.today);
        statusSpan.style.fontWeight = 'bold';
        statusSpan.style.marginLeft = '6px';
    
        infoDiv.appendChild(h4);
        infoDiv.appendChild(p);
        employeeCell.appendChild(img);
        employeeCell.appendChild(infoDiv);
        row.appendChild(employeeCell);
    
        // -----------------------------
        // Workload Cell
        // -----------------------------
        if (period === 'week') {
            emp.workload.week.forEach(hours => {
                const cell = this.createWorkloadCell(hours);
                row.appendChild(cell);
            });
        } else if (period === 'month') {
            emp.workload.month.forEach(hours => {
                const cell = this.createWorkloadCell(hours);
                row.appendChild(cell);
            });
        } else {
            const cell = this.createWorkloadCell(emp.workload.today);
            row.appendChild(cell);
        }
    
        return row;
    }
    
    
   // --- REPLACE UIManager.createWorkloadCell WITH THIS ---
createWorkloadCell(hours) {
    const cell = document.createElement('div');
    cell.className = 'workload-cell';
    
    const bar = document.createElement('div');
    bar.className = 'workload-bar';
    
    const fill = document.createElement('div');
    const hrs = parseFloat(hours) || 0; 
    const status = getWorkloadStatus(hrs);
    const percentage = Math.min((hrs / 8) * 100, 125);
    fill.className = `workload-fill ${status}`;
    fill.style.width = `${percentage}%`;
    
    const label = document.createElement('span');
    label.className = 'workload-label';
    label.textContent = `${hrs.toFixed(1)}h`;
    
    fill.appendChild(label);
    bar.appendChild(fill);
    cell.appendChild(bar);
    
    return cell;
}

}

// ============================================
// FILTER AND SEARCH FUNCTIONS
// ============================================

function setupDateFilter() {
    const dateInput = document.getElementById('dateFilter');
    if (!dateInput) return;

    // Set default value to today
    dateInput.value = new Date().toISOString().split('T')[0];

    // Add event listener
    dateInput.addEventListener('change', (e) => {
        if (app && app.uiManager) {
            app.uiManager.setSelectedDate(e.target.value);
        }
    });
}

function setupSearchBox() {
    const searchInput = document.getElementById('employeeSearch');
    if (!searchInput) return;

    // Add event listener with debounce
    const debouncedSearch = debounce((value) => {
        if (app && app.uiManager) {
            app.uiManager.setSearchQuery(value);
        }
    }, 300);

    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
}

// ============================================
// EMPLOYEE ACTIVITY MODAL
// ============================================

async function generateEmployeeActivityData(employee, selectedDate) {
    const dateStr = selectedDate.toISOString().split('T')[0];

    const todayLogs = employee.worklogs?.filter(w => {
        const logDateStr = new Date(w.log_date).toISOString().split('T')[0];
        return logDateStr === dateStr;
    }) || [];

    const totalHours = todayLogs.reduce((sum, w) => sum + parseFloat(w.hours || 0), 0);

    // --- Compute Completed vs In Progress ---
    const completedCount = todayLogs.filter(
        w => (w.status || '').toLowerCase().replace(/\s+/g, '_') === 'completed'
    ).length;
    
    const inProgressCount = todayLogs.filter(
        w => (w.status || '').toLowerCase().replace(/\s+/g, '_') === 'in_progress'
    ).length;
    

     const activeProjects = await app.dataService.generateActiveProjects(employee.userId, selectedDate);

    return {
        summary: {
            totalHours,
            activeProjects: activeProjects.length,
            completedTasks: completedCount,
            inProgressTasks: inProgressCount
        },
        schedule: todayLogs.map(w => ({
            time: '', 
            title: w.work_type,
            description: `${w.work_description} - ${w.hours}h`,
            status: w.status || 'pending',
            duration: parseFloat(w.hours)
        })),
        projects: activeProjects
    };
}


function formatTime(hours) {
    const hour24 = Math.floor(hours);
    const minutes = Math.round((hours - hour24) * 60);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
    
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

async function openViewEmployeeModal(employeeId) {
    const employee = app.uiManager.employees.find(e => e.id === employeeId);
    if (!employee) return console.error('Employee not found:', employeeId);

    // Ensure worklogs array exists
    if (!Array.isArray(employee.worklogs)) {
        employee.worklogs = [];
    }

    // Await async activity data
    const activityData = await generateEmployeeActivityData(employee, app.uiManager.selectedDate);

    const statusLabel = document.getElementById('viewEmpStatus');
        if(statusLabel) {
            statusLabel.textContent = getStatusLabel(employee.workload.today);
            statusLabel.style.color = getStatusColor(employee.workload.today);
            statusLabel.style.fontWeight = 'bold';
        }

    // Set employee info
    document.getElementById('viewEmpName').textContent = employee.name || 'Unknown';
    document.getElementById('viewEmpRole').textContent = employee.role || 'No role';
    document.getElementById('viewEmpAvatar').src = employee.avatar || 'https://ui-avatars.com/api/?name=Unknown&background=4A90E2&color=fff';

    document.getElementById('viewEmpStatus').textContent = employee.status || 'No status';

    // Safely set task numbers and hours
    document.getElementById('tasksCompleted').textContent = activityData.summary?.completedTasks || 0;
    document.getElementById('tasksInProgress').textContent = activityData.summary?.inProgressTasks || 0;
    document.getElementById('totalHoursToday').textContent = (activityData.summary?.totalHours || 0) + 'h';
    document.getElementById('activeProjects').textContent = activityData.summary?.activeProjects || 0;

    // Render timeline and active projects
    renderDailySchedule(activityData.schedule || []);
    renderActiveProjects(activityData.projects || []);

    // Show modal
    ModalManager.show('viewEmployeeModal');
}



function renderDailySchedule(schedule) {
    const container = document.getElementById('dailyTimeline');
    if (!container) return;

    if (schedule.length === 0) {
        container.innerHTML = '<p style="color: #6C757D; text-align: center; padding: 20px;">No scheduled activities for today</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    schedule.forEach(item => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';

        timelineItem.innerHTML = `
            <div class="timeline-dot ${item.status}"></div>
            <div class="timeline-time">${item.time}</div>
            <div class="timeline-title">${item.title}</div>
            <div class="timeline-description">${item.description}</div>
            <span class="timeline-status ${item.status}">
                ${item.status === 'completed' ? 'Completed' : 'In Progress'}
            </span>
        `;

        fragment.appendChild(timelineItem);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderActiveProjects(projects) {
    const container = document.getElementById('activeProjectsList');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card-mini';
        card.innerHTML = `
            <div class="project-card-info">
                <h4>${project.name}</h4>
                <p>${project.status} • ${project.hours}h today</p>
            </div>
        `;
        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

// ============================================
// DASHBOARD APP
// ============================================

class DashboardApp {
    constructor() {
        this.dataService = new DataService();
        this.uiManager = new UIManager(this.dataService);
    }

    async init() {
        console.log('Initializing dashboard...');
        this.setupEventListeners();
        await this.uiManager.loadEmployees();
        
        // Setup date filter and search from HTML
        setupDateFilter();
        setupSearchBox();
    }

    setupEventListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.uiManager.renderDashboard(btn.dataset.period);
            });
        });

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    window.location.href = "/login/HTML_Files/login.html";
                }
            });
        }

        const closeViewBtn = document.getElementById('closeViewEmployee');
        const closeModalBtn = document.getElementById('closeViewModalBtn');
        
        if (closeViewBtn) {
            closeViewBtn.addEventListener('click', () => ModalManager.hide('viewEmployeeModal'));
        }
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => ModalManager.hide('viewEmployeeModal'));
        }

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================

let app;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');
    app = new DashboardApp();
    await app.init();
});

window.openViewEmployeeModal = openViewEmployeeModal;