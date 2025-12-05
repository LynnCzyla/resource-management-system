// RESOURCE MANAGEMENT (RM) dashboard.js - OPTIMIZED
import { supabase } from "../../supabaseClient.js";

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================
const CONFIG = {
    DEBOUNCE_DELAY: 300,
    STANDARD_WORKWEEK: 40,
    AVATAR_BASE_URL: 'https://ui-avatars.com/api/',
    STATUS_COLORS: {
        pending: { color: '#F5A623', bg: '#FFF4E6', text: 'Pending' },
        ongoing: { color: '#4A90E2', bg: '#E3F2FD', text: 'Ongoing' },
        completed: { color: '#7ED321', bg: '#E8F5E9', text: 'Completed' },
        'on-hold': { color: '#9B9B9B', bg: '#F5F5F5', text: 'On Hold' },
        cancelled: { color: '#E74C3C', bg: '#FFEBEE', text: 'Cancelled' }
    },
    PRIORITY_COLORS: {
        low: { color: '#7ED321', bg: '#E8F5E9', text: 'Low' },
        medium: { color: '#F5A623', bg: '#FFF4E6', text: 'Medium' },
        high: { color: '#E74C3C', bg: '#FFEBEE', text: 'High' }
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
    debounce(func, delay = CONFIG.DEBOUNCE_DELAY) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    parseUser() {
        try {
            return JSON.parse(localStorage.getItem('loggedUser') || '{}');
        } catch {
            return {};
        }
    },

    getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    },

    formatDate(date) {
        return date.toISOString().split('T')[0];
    },

    isValidProfilePic(pic) {
        return pic && pic.trim() && pic !== 'null' && pic !== 'undefined';
    },

    generateAvatar(name, background = '000', color = 'fff') {
        return `${CONFIG.AVATAR_BASE_URL}?name=${encodeURIComponent(name)}&background=${background}&color=${color}`;
    }
};

// ============================================
// USER DISPLAY MANAGER
// ============================================
const UserDisplay = {
    async update() {
        const userNameElement = document.getElementById('userName');
        const userAvatarElement = document.querySelector('.user-avatar');
        
        if (!userNameElement) {
            console.warn('[USER] User name element not found');
            return;
        }

        try {
            const loggedUser = Utils.parseUser();
            let displayName = 'Project Manager';

            if (loggedUser.name) {
                displayName = loggedUser.name;
                userNameElement.textContent = displayName;
            } else if (loggedUser.email) {
                displayName = await this.fetchUserName(loggedUser.email) || 
                             loggedUser.email.split('@')[0];
                userNameElement.textContent = displayName;
            }

            userNameElement.textContent = displayName;
            
            if (userAvatarElement) {
                this.updateAvatar(userAvatarElement, displayName);
            }

        } catch (error) {
            console.error('[USER] Error:', error);
            userNameElement.textContent = 'Project Manager';
        }
    },

    async fetchUserName(email) {
        try {
            const { data: userData, error } = await supabase
                .from('users')
                .select('name')
                .eq('email', email)
                .single();

            if (!error && userData?.name) {
                const loggedUser = Utils.parseUser();
                loggedUser.name = userData.name;
                localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
                return userData.name;
            }
        } catch (error) {
            console.error('[USER] Fetch error:', error);
        }
        return null;
    },

    updateAvatar(element, name) {
        const initials = Utils.getInitials(name);
        element.src = Utils.generateAvatar(name);
        element.alt = initials;
    }
};

// ============================================
// MODAL MANAGER
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
// MESSAGE MANAGER
// ============================================
class MessageManager {
    static show(message, type = 'info') {
        let container = document.getElementById('messageContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'messageContainer';
            document.body.appendChild(container);
        }

        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        messageBox.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
            <button class="message-close"><i class="fas fa-times"></i></button>
        `;

        messageBox.querySelector('.message-close').addEventListener('click', () => messageBox.remove());
        container.appendChild(messageBox);

        setTimeout(() => messageBox.remove(), 5000);
    }

    static success(message) { this.show(message, 'success'); }
    static error(message) { this.show(message, 'error'); }
    static warning(message) { this.show(message, 'warning'); }
    static info(message) { this.show(message, 'info'); }
}

// ============================================
// DASHBOARD APP
// ============================================
class DashboardApp {
    constructor() {
        this.setupLogoutListeners();
        this.setupWorklogModalListeners();
    }

    setupLogoutListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => ModalManager.show('logoutModal'));
        }

        const cancelLogoutBtn = document.getElementById('cancelLogout');
        const confirmLogoutBtn = document.getElementById('confirmLogout');

        if (cancelLogoutBtn) {
            cancelLogoutBtn.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogoutBtn) {
            confirmLogoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    setupWorklogModalListeners() {
        const closeWorklogModal = document.getElementById('closeWorklogModal');
        if (closeWorklogModal) {
            closeWorklogModal.addEventListener('click', () => ModalManager.hide('worklogModal'));
        }
        
        const worklogModal = document.getElementById('worklogModal');
        if (worklogModal) {
            worklogModal.addEventListener('click', (e) => {
                if (e.target === worklogModal) {
                    ModalManager.hide('worklogModal');
                }
            });
        }
    }

    handleLogout() {
        localStorage.removeItem('loggedUser');
        sessionStorage.clear();
        ModalManager.hide('logoutModal');
        ModalManager.showLoading();
        
        setTimeout(() => {
            window.location.href = "/login/HTML_Files/login.html";
        }, 500);
    }
}

// ============================================
// PROJECT TIMELINE SERVICE
// ============================================
class ProjectTimelineService {
    async getAllProjectsWithResources(selectedDate = new Date()) {
        try {
            console.log('[TIMELINE] Fetching data...');
            ModalManager.showLoading();

            const [projects, assignments, worklogs] = await Promise.all([
                this.fetchProjects(),
                this.fetchAssignments(),
                this.fetchWorklogs()
            ]);

            const userIds = [...new Set(assignments.map(a => a.user_id))];
            const users = await this.fetchUsers(userIds);

            ModalManager.hideLoading();
            return this.processProjectData(projects, assignments, users, worklogs, selectedDate);

        } catch (error) {
            console.error('[TIMELINE] Error:', error);
            ModalManager.hideLoading();
            return [];
        }
    }

    async fetchProjects() {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                created_by_user:users!projects_created_by_fkey(
                    id, name, email,
                    user_details(profile_pic)
                )
            `)
            .in('status', ['pending', 'ongoing']);

        if (error) throw error;
        return data || [];
    }

    async fetchAssignments() {
        const { data, error } = await supabase
            .from('project_assignments')
            .select('id, project_id, user_id, role_in_project, assigned_hours')
            .eq('status', 'assigned');

        if (error) throw error;
        return data || [];
    }

    async fetchUsers(userIds) {
        if (userIds.length === 0) return [];

        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, user_details(status, total_available_hours, profile_pic)')
            .in('id', userIds);

        if (error) console.error('[TIMELINE] User fetch error:', error);
        return data || [];
    }

    async fetchWorklogs() {
        const { data, error } = await supabase
            .from('worklogs')
            .select('user_id, project_id, log_date, hours, work_type, work_description, status');

        if (error) throw error;
        return data || [];
    }

    processProjectData(projects, assignments, users, worklogs, selectedDate) {
        const userMap = this.createUserMap(users);
        const userTotalAssignedHours = this.calculateUserAssignedHours(assignments);

        return projects.map(project => {
            const projectAssignments = assignments.filter(a => a.project_id === project.id);
            const projectWorklogs = worklogs.filter(w => w.project_id === project.id);
            const projectManager = project.created_by_user;

            return {
                id: project.id,
                name: project.name,
                description: project.description,
                startDate: new Date(project.start_date),
                endDate: project.end_date ? new Date(project.end_date) : null,
                status: project.status,
                priority: project.priority,
                projectManager: projectManager ? this.processProjectManager(projectManager) : null,
                teamMembers: this.processTeamMembers(projectAssignments, userMap, projectWorklogs, userTotalAssignedHours),
                totalTeamSize: projectAssignments.length
            };
        });
    }

    createUserMap(users) {
        const map = {};
        users.forEach(user => {
            const details = user.user_details?.[0];
            const profilePic = details?.profile_pic;
            
            map[user.id] = {
                ...user,
                status: details?.status || 'Available',
                total_available_hours: details?.total_available_hours || CONFIG.STANDARD_WORKWEEK,
                avatar: Utils.isValidProfilePic(profilePic)
                    ? profilePic
                    : Utils.generateAvatar(user.name, '4A90E2', 'fff')
            };
        });
        return map;
    }

    calculateUserAssignedHours(assignments) {
        const hours = {};
        assignments.forEach(assignment => {
            hours[assignment.user_id] = (hours[assignment.user_id] || 0) + 
                                       parseInt(assignment.assigned_hours || 0);
        });
        return hours;
    }

    processProjectManager(manager) {
        const details = manager.user_details?.[0];
        const profilePic = details?.profile_pic;
        
        return {
            id: manager.id,
            name: manager.name,
            email: manager.email,
            avatar: Utils.isValidProfilePic(profilePic)
                ? profilePic
                : Utils.generateAvatar(manager.name, '9013FE', 'fff')
        };
    }

    processTeamMembers(assignments, userMap, worklogs, userTotalAssignedHours) {
        return assignments.map(assignment => {
            const user = userMap[assignment.user_id];
            const memberWorklogs = worklogs.filter(w => w.user_id === assignment.user_id);
            const assignedHours = userTotalAssignedHours[assignment.user_id] || 0;
            const totalAvailableHours = user?.total_available_hours || CONFIG.STANDARD_WORKWEEK;

            return {
                userId: assignment.user_id,
                name: user?.name || 'Unknown',
                email: user?.email || '',
                role: assignment.role_in_project || 'Team Member',
                assignedHours,
                totalAvailableHours,
                avatar: user?.avatar || Utils.generateAvatar('User', '4A90E2', 'fff'),
                dailyHours: this.calculateDailyHours(memberWorklogs),
                dailyWorklogs: this.organizeDailyWorklogs(memberWorklogs),
                totalHours: memberWorklogs.reduce((sum, w) => sum + parseFloat(w.hours || 0), 0)
            };
        });
    }

    calculateDailyHours(worklogs) {
        const dailyHours = {};
        worklogs.forEach(log => {
            const dateStr = Utils.formatDate(new Date(log.log_date));
            dailyHours[dateStr] = (dailyHours[dateStr] || 0) + parseFloat(log.hours || 0);
        });
        return dailyHours;
    }

    organizeDailyWorklogs(worklogs) {
        const dailyWorklogs = {};
        worklogs.forEach(log => {
            const dateStr = Utils.formatDate(new Date(log.log_date));
            if (!dailyWorklogs[dateStr]) dailyWorklogs[dateStr] = [];
            dailyWorklogs[dateStr].push({
                hours: parseFloat(log.hours || 0),
                workType: log.work_type || 'General',
                description: log.work_description || 'No description',
                status: log.status || 'in progress'
            });
        });
        return dailyWorklogs;
    }

    async getStats(selectedDate = new Date()) {
        try {
            const [totalEmployees, activeProjects, assignments] = await Promise.all([
                this.getEmployeeCount(),
                this.getActiveProjectCount(),
                this.getAssignments()
            ]);

            return this.calculateAvailabilityStats(totalEmployees, assignments);

        } catch (error) {
            console.error('[STATS] Error:', error);
            return this.getDefaultStats();
        }
    }

    async getEmployeeCount() {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'employee');
        return error ? 0 : count;
    }

    async getActiveProjectCount() {
        const { count, error } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'ongoing']);
        return error ? 0 : count;
    }

    async getAssignments() {
        const { data, error } = await supabase
            .from('project_assignments')
            .select('user_id, assigned_hours')
            .eq('status', 'assigned');
        return error ? [] : data || [];
    }

    calculateAvailabilityStats(totalEmployees, assignments) {
        const userAssignedHours = {};
        assignments.forEach(assignment => {
            userAssignedHours[assignment.user_id] = 
                (userAssignedHours[assignment.user_id] || 0) + 
                parseInt(assignment.assigned_hours || 0);
        });

        let available = 0, partial = 0, busy = 0;

        Object.values(userAssignedHours).forEach(hours => {
            if (hours === 0 || hours <= 20) available++;
            else if (hours >= 40) busy++;
            else partial++;
        });

        return {
            totalEmployees,
            activeProjects: assignments.length > 0 ? Math.ceil(assignments.length / 3) : 0,
            available,
            partial,
            full: busy
        };
    }

    getDefaultStats() {
        return {
            totalEmployees: 0,
            activeProjects: 0,
            available: 0,
            partial: 0,
            full: 0
        };
    }

    getDateRange(period, selectedDate) {
        const dates = [];
        const start = new Date(selectedDate);

        if (period === 'week') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);

            for (let i = 0; i < 7; i++) {
                const date = new Date(start);
                date.setDate(start.getDate() + i);
                dates.push(date);
            }
        } else if (period === 'month') {
            const year = start.getFullYear();
            const month = start.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let i = 1; i <= daysInMonth; i++) {
                dates.push(new Date(year, month, i));
            }
        } else {
            dates.push(new Date(selectedDate));
        }

        return dates;
    }
}

// ============================================
// PROJECT TIMELINE RENDERER
// ============================================
class ProjectTimelineRenderer {
    constructor(timelineService) {
        this.timelineService = timelineService;
        this.projects = [];
        this.filteredProjects = [];
        this.currentPeriod = 'week';
        this.selectedDate = new Date();
        this.searchQuery = '';
        this.cache = new Map();
    }

    async loadProjects() {
        try {
            this.projects = await this.timelineService.getAllProjectsWithResources(this.selectedDate);
            this.filteredProjects = [...this.projects];
            
            await Promise.all([
                UserDisplay.update(),
                this.updateStats(),
                this.renderProjectTimeline()
            ]);

        } catch (error) {
            console.error('[RENDERER] Error:', error);
            MessageManager.error('Failed to load project data');
        }
    }

    async updateStats() {
        try {
            const stats = await this.timelineService.getStats(this.selectedDate);
            const elements = {
                totalEmployees: 'totalEmployees',
                totalProjects: 'totalProjects',
                availableEmployees: 'availableEmployees',
                partialEmployees: 'partialEmployees',
                fullyAllocated: 'fullyAllocated'
            };

            Object.entries(elements).forEach(([key, id]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = stats[key];
            });

        } catch (error) {
            console.error('[RENDERER] Stats error:', error);
        }
    }

    filterProjects() {
        const query = this.searchQuery.toLowerCase();
        this.filteredProjects = this.projects.filter(project => 
            project.name.toLowerCase().includes(query) ||
            project.teamMembers.some(member => member.name.toLowerCase().includes(query)) ||
            (project.projectManager && project.projectManager.name.toLowerCase().includes(query))
        );
        this.renderProjectTimeline();
    }

    renderProjectTimeline() {
        const timelineRows = document.getElementById('timelineRows');
        const timelineDates = document.getElementById('timelineDates');

        if (!timelineRows || !timelineDates) {
            console.error('[RENDERER] Containers not found!');
            return;
        }

        timelineRows.innerHTML = '';
        timelineDates.innerHTML = '';

        if (this.filteredProjects.length === 0) {
            timelineRows.innerHTML = this.getNoProjectsHTML();
            return;
        }

        this.renderDateHeaders(timelineDates);
        
        const fragment = document.createDocumentFragment();
        this.filteredProjects.forEach(project => {
            fragment.appendChild(this.createProjectRow(project));
        });
        
        timelineRows.appendChild(fragment);
    }

    renderDateHeaders(container) {
        const dateRange = this.timelineService.getDateRange(this.currentPeriod, this.selectedDate);
        
        const headerCell = document.createElement('div');
        headerCell.className = 'timeline-date-cell header-cell';
        headerCell.textContent = 'Project / Team Member';
        container.appendChild(headerCell);

        dateRange.forEach(date => {
            const cell = document.createElement('div');
            cell.className = 'timeline-date-cell';
            
            if (this.currentPeriod === 'today') {
                cell.innerHTML = `
                    <div style="font-weight: 600; font-size: 14px;">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div style="font-size: 12px; color: #6c757d;">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                `;
            } else if (this.currentPeriod === 'week') {
                cell.innerHTML = `
                    <div style="font-weight: 600; font-size: 14px;">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div style="font-size: 12px; color: #6c757d;">${date.getDate()}</div>
                `;
            } else {
                cell.innerHTML = `<div style="font-weight: 600; font-size: 14px;">${date.getDate()}</div>`;
            }
            
            container.appendChild(cell);
        });
    }

    createProjectRow(project) {
        const rowContainer = document.createElement('div');
        rowContainer.className = 'project-row-container';

        const projectHeader = this.createProjectHeader(project);
        const teamRows = document.createElement('div');
        teamRows.className = 'team-member-rows';
        teamRows.style.display = 'none';

        if (project.projectManager) {
            teamRows.appendChild(this.createProjectManagerRow(project.projectManager));
        }

        project.teamMembers.forEach(member => {
            teamRows.appendChild(this.createTeamMemberRow(member, project));
        });

        rowContainer.appendChild(projectHeader);
        rowContainer.appendChild(teamRows);

        projectHeader.addEventListener('click', () => {
            const isExpanded = teamRows.style.display !== 'none';
            teamRows.style.display = isExpanded ? 'none' : 'block';
            projectHeader.classList.toggle('expanded', !isExpanded);
            
            const icon = projectHeader.querySelector('i.fa-chevron-right');
            if (icon) {
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
            }
        });

        return rowContainer;
    }

    createProjectHeader(project) {
        const dateRange = this.timelineService.getDateRange(this.currentPeriod, this.selectedDate);
        const row = document.createElement('div');
        row.className = 'timeline-row project-header-row';

        const projectCell = document.createElement('div');
        projectCell.className = 'employee-cell';
        
        const statusBadge = this.getStatusBadge(project.status);
        const priorityBadge = this.getPriorityBadge(project.priority);
        
        projectCell.innerHTML = `
            <i class="fas fa-chevron-right" style="margin-right: 8px; transition: transform 0.3s; font-size: 12px; color: #6c757d;"></i>
            <div class="employee-cell-info">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">${project.name}</h4>
                    ${statusBadge}
                    ${priorityBadge}
                </div>
                <p style="margin: 0; font-size: 13px; color: #6c757d;">
                    <i class="fas fa-users" style="margin-right: 4px;"></i>${project.teamMembers.length} team members
                    ${project.projectManager ? `• <i class="fas fa-user-tie" style="margin-left: 8px; margin-right: 4px;"></i>${project.projectManager.name}` : ''}
                </p>
            </div>
        `;
        row.appendChild(projectCell);

        dateRange.forEach(() => {
            row.appendChild(document.createElement('div')).className = 'workload-cell';
        });

        return row;
    }

    createProjectManagerRow(manager) {
        const dateRange = this.timelineService.getDateRange(this.currentPeriod, this.selectedDate);
        const row = document.createElement('div');
        row.className = 'timeline-row team-member-row manager-row';

        const memberCell = document.createElement('div');
        memberCell.className = 'employee-cell';
        memberCell.innerHTML = `
            <img src="${manager.avatar}" alt="${manager.name}" style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid #9013FE; object-fit: cover;">
            <div class="employee-cell-info">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <h4 style="margin: 0; font-size: 14px; font-weight: 600;">${manager.name}</h4>
                    <span style="background: #9013FE; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">PM</span>
                </div>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #6c757d;">Project Manager</p>
            </div>
        `;
        row.appendChild(memberCell);

        dateRange.forEach(() => {
            const cell = document.createElement('div');
            cell.className = 'workload-cell';
            cell.innerHTML = '<span style="color: #ccc;">—</span>';
            row.appendChild(cell);
        });

        return row;
    }

    createTeamMemberRow(member, project) {
        const dateRange = this.timelineService.getDateRange(this.currentPeriod, this.selectedDate);
        const row = document.createElement('div');
        row.className = 'timeline-row team-member-row';

        const assignedHours = member.assignedHours || 0;
        const availabilityStatus = this.getAvailabilityStatus(assignedHours);

        const memberCell = document.createElement('div');
        memberCell.className = 'employee-cell';
        memberCell.innerHTML = `
            <img src="${member.avatar}" alt="${member.name}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
            <div class="employee-cell-info">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <h4 style="margin: 0; font-size: 14px; font-weight: 500;">${member.name}</h4>
                    <span style="background: ${availabilityStatus.bg}; color: ${availabilityStatus.color}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${availabilityStatus.text} ${assignedHours}h/40h
                    </span>
                </div>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #6c757d;">${member.role}</p>
            </div>
        `;
        row.appendChild(memberCell);

        dateRange.forEach(date => {
            const dateStr = Utils.formatDate(date);
            const hours = member.dailyHours[dateStr] || 0;
            const worklogs = member.dailyWorklogs[dateStr] || [];
            
            row.appendChild(this.createHoursCell(hours, worklogs, member, dateStr, project));
        });

        return row;
    }

    createHoursCell(hours, worklogs, member, dateStr, project) {
        const cell = document.createElement('div');
        cell.className = 'workload-cell';
        
        if (worklogs.length > 0) {
            cell.style.cursor = 'pointer';
            const display = this.createHoursDisplay(hours, worklogs);
            cell.appendChild(display);
            
            cell.addEventListener('click', () => {
                this.showWorklogModal(member, dateStr, worklogs, project);
            });
        }
        
        return cell;
    }

    createHoursDisplay(hours, worklogs) {
        const workTypes = worklogs.map(log => log.workType.toLowerCase());
        const isAbsent = workTypes.includes('absent');
        const isLeave = workTypes.includes('leave');
        const isHoliday = workTypes.includes('holiday');

        const display = document.createElement('div');
        
        if (isAbsent) {
            display.style.cssText = `
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                background: #f5f5f5;
                color: #757575;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                transition: all 0.2s ease;
            `;
            display.innerHTML = `
                <div style="font-size: 16px; color: #9e9e9e;">---</div>
                <div style="font-size: 11px; font-weight: 600; color: #757575;">Absent</div>
            `;
        } else if (isHoliday || isLeave) {
            const type = isHoliday ? 'Holiday' : 'Leave';
            display.style.cssText = `
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                background: #e8f5e9;
                color: #2e7d32;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                transition: all 0.2s ease;
            `;
            display.innerHTML = `
                <div style="font-size: 16px;">8h</div>
                <div style="font-size: 11px; font-weight: 600; color: #1b5e20;">${type}</div>
            `;
        } else if (hours > 8) {
            display.style.cssText = `
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                background: #ffebee;
                color: #c62828;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                transition: all 0.2s ease;
            `;
            const overtimeHours = hours - 8;
            display.innerHTML = `
                <div style="font-size: 16px;">${hours.toFixed(1)}h</div>
                <div style="font-size: 11px; font-weight: 600; color: #b71c1c;">+${overtimeHours.toFixed(1)}h OT</div>
            `;
        } else if (hours > 0) {
            display.style.cssText = `
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 600;
                background: #e3f2fd;
                color: #1976d2;
                display: inline-block;
                transition: all 0.2s ease;
            `;
            display.textContent = hours === 8 ? '8h' : `${hours.toFixed(1)}h`;
        }
        
        return display;
    }

    showWorklogModal(member, dateStr, worklogs, project) {
        const modal = document.getElementById('worklogModal');
        if (!modal) return;

        const employeeName = document.getElementById('worklogEmployeeName');
        const workDate = document.getElementById('worklogDate');
        const projectName = document.getElementById('worklogProjectName');
        const worklogList = document.getElementById('worklogList');

        if (employeeName) employeeName.textContent = member.name;
        if (workDate) {
            const date = new Date(dateStr);
            workDate.textContent = date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
        if (projectName) projectName.textContent = project.name;

        if (worklogList) {
            worklogList.innerHTML = '';
            
            worklogs.forEach((log, index) => {
                const logItem = document.createElement('div');
                logItem.className = 'worklog-item';
                
                const statusBadge = this.getWorklogStatusBadge(log.status);
                
                logItem.innerHTML = `
                    <div class="worklog-header">
                        <div class="worklog-hours">${log.hours.toFixed(1)}h</div>
                        <div class="worklog-type">${log.workType}</div>
                        ${statusBadge}
                    </div>
                    <div class="worklog-description">${log.description}</div>
                `;
                
                worklogList.appendChild(logItem);
            });

            const totalHours = worklogs.reduce((sum, log) => sum + log.hours, 0);
            const totalItem = document.createElement('div');
            totalItem.className = 'worklog-total';
            totalItem.innerHTML = `<strong>Total Hours:</strong> ${totalHours.toFixed(1)}h`;
            worklogList.appendChild(totalItem);
        }

        ModalManager.show('worklogModal');
    }

    getAvailabilityStatus(assignedHours) {
        if (assignedHours >= 40) {
            return { text: 'Busy', color: '#c62828', bg: '#ffebee' };
        } else if (assignedHours >= 21) {
            return { text: 'Partial', color: '#f57c00', bg: '#fff3e0' };
        } else {
            return { text: 'Available', color: '#2e7d32', bg: '#e8f5e9' };
        }
    }

    getStatusBadge(status) {
        const config = CONFIG.STATUS_COLORS[status] || CONFIG.STATUS_COLORS.pending;
        return `<span style="background: ${config.bg}; color: ${config.color}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${config.text}</span>`;
    }

    getPriorityBadge(priority) {
        const config = CONFIG.PRIORITY_COLORS[priority] || CONFIG.PRIORITY_COLORS.medium;
        return `<span style="background: ${config.bg}; color: ${config.color}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${config.text}</span>`;
    }

    getWorklogStatusBadge(status) {
        const config = {
            'in progress': { color: '#4A90E2', bg: '#E3F2FD', text: 'In Progress' },
            completed: { color: '#7ED321', bg: '#E8F5E9', text: 'Completed' },
            pending: { color: '#F5A623', bg: '#FFF4E6', text: 'Pending' },
            blocked: { color: '#E74C3C', bg: '#FFEBEE', text: 'Blocked' }
        };
        
        const cfg = config[status] || config['in progress'];
        return `<span style="background: ${cfg.bg}; color: ${cfg.color}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${cfg.text}</span>`;
    }

    getNoProjectsHTML() {
        return `
            <div style="padding: 40px; text-align: center; color: #6c757d; grid-column: 1 / -1;">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p style="font-size: 16px;">No projects found</p>
                <p style="font-size: 14px;">Create projects or adjust your filters</p>
            </div>
        `;
    }
}

// ============================================
// INITIALIZATION
// ============================================
function initializeProjectTimeline() {
    const timelineService = new ProjectTimelineService();
    const renderer = new ProjectTimelineRenderer(timelineService);
    
    renderer.loadProjects();

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderer.currentPeriod = btn.dataset.period;
            renderer.renderProjectTimeline();
        });
    });

    const dateInput = document.getElementById('dateFilter');
    if (dateInput) {
        dateInput.value = Utils.formatDate(new Date());
        dateInput.addEventListener('change', (e) => {
            renderer.selectedDate = new Date(e.target.value);
            renderer.loadProjects();
        });
    }

    const searchInput = document.getElementById('employeeSearch');
    if (searchInput) {
        searchInput.placeholder = 'Search project, team member, or project manager...';
        const debouncedSearch = Utils.debounce((value) => {
            renderer.searchQuery = value;
            renderer.filterProjects();
        });
        searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
    }

    return renderer;
}

// ============================================
// MAIN ENTRY POINT
// ============================================
let app;
let projectRenderer;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[MAIN] Initializing dashboard...');
    
    try {
        app = new DashboardApp();
        projectRenderer = initializeProjectTimeline();
        
        console.log('[MAIN] Dashboard initialized successfully');
    } catch (error) {
        console.error('[MAIN] Error:', error);
        MessageManager.error('Failed to initialize dashboard');
    }
});