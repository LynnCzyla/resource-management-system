// RESOURCE MANAGEMENT (RM) dashboard.js
import { supabase } from "../../supabaseClient.js";

async function updateUserNameDisplayEnhanced() {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.querySelector('.user-avatar');
    
    if (!userNameElement) {
        console.warn('[USER DISPLAY] userName element not found');
        return;
    }

    try {
        const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
        let displayName = '';
        
        if (loggedUser.name) {
            displayName = loggedUser.name;
            userNameElement.textContent = displayName;
            console.log('[USER DISPLAY] User name updated to:', displayName);
        } else if (loggedUser.email) {
            try {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('name')
                    .eq('email', loggedUser.email)
                    .single();
                
                if (!error && userData && userData.name) {
                    displayName = userData.name;
                    userNameElement.textContent = displayName;
                    loggedUser.name = userData.name;
                    localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
                    console.log('[USER DISPLAY] User name fetched from Supabase:', displayName);
                } else {
                    displayName = loggedUser.email.split('@')[0];
                    userNameElement.textContent = displayName;
                }
            } catch (dbError) {
                console.error('[USER DISPLAY] Error fetching from Supabase:', dbError);
                displayName = loggedUser.email.split('@')[0];
                userNameElement.textContent = displayName;
            }
        } else {
            displayName = 'Project Manager';
            userNameElement.textContent = displayName;
            console.warn('[USER DISPLAY] No user information found');
        }
        
        // Update avatar with user initials
        if (userAvatarElement && displayName) {
            const initials = displayName.split(' ')
                .map(word => word.charAt(0).toUpperCase())
                .join('')
                .substring(0, 2);
            
            userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=000&color=fff`;
            userAvatarElement.alt = initials;
            console.log('[USER DISPLAY] Avatar updated with initials:', initials);
        }
    } catch (error) {
        console.error('[USER DISPLAY] Error updating user name:', error);
        userNameElement.textContent = 'Project Manager';
    }
}
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
// DASHBOARD APP FOR LOGOUT
// ============================================

class DashboardApp {
    setupLogoutListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        const cancelLogoutBtn = document.getElementById('cancelLogout');
        const confirmLogoutBtn = document.getElementById('confirmLogout');

        if (cancelLogoutBtn) {
            cancelLogoutBtn.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogoutBtn) {
            confirmLogoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        this.setupWorklogModalListeners();
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

    openLogoutModal() {
        ModalManager.show('logoutModal');
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

        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        messageBox.innerHTML = `
            <i class="fas ${iconMap[type]}"></i>
            <span>${message}</span>
            <button class="message-close"><i class="fas fa-times"></i></button>
        `;

        const closeBtn = messageBox.querySelector('.message-close');
        closeBtn.addEventListener('click', () => messageBox.remove());

        container.appendChild(messageBox);

        setTimeout(() => {
            messageBox.remove();
        }, 5000);
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }

    static warning(message) {
        this.show(message, 'warning');
    }

    static info(message) {
        this.show(message, 'info');
    }
}

// ============================================
// PROJECT TIMELINE SERVICE - WITH PROFILE PICTURES
// ============================================

class ProjectTimelineService {
    async getAllProjectsWithResources(selectedDate = new Date()) {
        try {
            console.log('[PROJECT TIMELINE] Starting data fetch...');
            const dateStr = selectedDate.toISOString().split('T')[0];
            console.log('[PROJECT TIMELINE] Selected date:', dateStr);
            
            const { data: projects, error: projectError } = await supabase
                .from('projects')
                .select(`
                    *,
                    created_by_user:users!projects_created_by_fkey(
                        id, 
                        name, 
                        email,
                        user_details(profile_pic)
                    )
                `)
                .in('status', ['pending', 'ongoing']);

            if (projectError) throw projectError;
            console.log('[PROJECT TIMELINE] Projects fetched:', projects?.length || 0);

            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select(`
                    id,
                    project_id,
                    user_id,
                    role_in_project,
                    status,
                    assigned_hours,
                    allocation_percent,
                    assignment_type
                `)
                .eq('status', 'assigned');

            if (assignError) throw assignError;
            console.log('[PROJECT TIMELINE] Assignments fetched:', assignments?.length || 0);

            const userIds = [...new Set(assignments?.map(a => a.user_id) || [])];
            
            const { data: users, error: userError } = await supabase
                .from('users')
                .select(`
                    id, 
                    name, 
                    email,
                    user_details(status, total_available_hours, profile_pic)
                `)
                .in('id', userIds);
                
            if (userError) console.error('[PROJECT TIMELINE] User fetch error:', userError);
            console.log('[PROJECT TIMELINE] Users fetched:', users?.length || 0);

            const { data: worklogs, error: worklogError } = await supabase
                .from('worklogs')
                .select('user_id, project_id, log_date, hours, work_type, work_description, status');

            if (worklogError) throw worklogError;
            console.log('[PROJECT TIMELINE] Worklogs fetched:', worklogs?.length || 0);

            const processedProjects = this.processProjectData(
                projects || [], 
                assignments || [], 
                users || [],
                worklogs || [], 
                selectedDate
            );
            
            console.log('[PROJECT TIMELINE] Processed projects:', processedProjects.length);
            return processedProjects;

        } catch (error) {
            console.error('[PROJECT TIMELINE] Error in getAllProjectsWithResources:', error);
            return [];
        }
    }

    processProjectData(projects, assignments, users, worklogs, selectedDate) {
        console.log('[PROJECT TIMELINE] Processing project data...');
        
        const userMap = {};
        users.forEach(user => {
            const userDetails = user.user_details?.[0];
            const profilePic = userDetails?.profile_pic;
            const hasValidProfilePic = profilePic && 
                                      profilePic.trim() !== '' && 
                                      profilePic !== 'null' && 
                                      profilePic !== 'undefined';
            
            userMap[user.id] = {
                ...user,
                status: userDetails?.status || 'Available',
                total_available_hours: userDetails?.total_available_hours || 40,
                avatar: hasValidProfilePic
                    ? profilePic
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4A90E2&color=fff`
            };
        });

        const userTotalAssignedHours = {};
        assignments.forEach(assignment => {
            if (!userTotalAssignedHours[assignment.user_id]) {
                userTotalAssignedHours[assignment.user_id] = 0;
            }
            userTotalAssignedHours[assignment.user_id] += parseInt(assignment.assigned_hours || 0);
        });
        
        return projects.map(project => {
            const projectAssignments = assignments.filter(a => a.project_id === project.id);
            const projectWorklogs = worklogs.filter(w => w.project_id === project.id);
            const projectManager = project.created_by_user || null;

            // Get PM profile picture
            let pmAvatar;
            if (projectManager) {
                const pmDetails = projectManager.user_details?.[0];
                const pmProfilePic = pmDetails?.profile_pic;
                const hasValidPMPic = pmProfilePic && 
                                     pmProfilePic.trim() !== '' && 
                                     pmProfilePic !== 'null' && 
                                     pmProfilePic !== 'undefined';
                
                pmAvatar = hasValidPMPic
                    ? pmProfilePic
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(projectManager.name)}&background=9013FE&color=fff`;
            }

            const teamMembers = projectAssignments.map(assignment => {
                const user = userMap[assignment.user_id];
                const memberWorklogs = projectWorklogs.filter(w => w.user_id === assignment.user_id);
                
                const totalAssignedHours = userTotalAssignedHours[assignment.user_id] || 0;
                const totalAvailableHours = user?.total_available_hours || 40;
                
                return {
                    userId: assignment.user_id,
                    name: user?.name || 'Unknown',
                    email: user?.email || '',
                    role: assignment.role_in_project || 'Team Member',
                    assignedHours: totalAssignedHours,
                    totalAvailableHours: totalAvailableHours,
                    assignmentType: assignment.assignment_type || 'Full-Time',
                    avatar: user?.avatar || `https://ui-avatars.com/api/?name=User&background=4A90E2&color=fff`,
                    dailyHours: this.calculateDailyHours(memberWorklogs),
                    dailyWorklogs: this.organizeDailyWorklogs(memberWorklogs),
                    totalHours: memberWorklogs.reduce((sum, w) => sum + parseFloat(w.hours || 0), 0)
                };
            });

            return {
                id: project.id,
                name: project.name,
                description: project.description,
                startDate: new Date(project.start_date),
                endDate: project.end_date ? new Date(project.end_date) : null,
                duration: project.duration_days || this.calculateDuration(project.start_date, project.end_date),
                status: project.status,
                priority: project.priority,
                projectManager: projectManager ? {
                    id: projectManager.id,
                    name: projectManager.name,
                    email: projectManager.email,
                    avatar: pmAvatar
                } : null,
                teamMembers,
                totalTeamSize: teamMembers.length
            };
        });
    }

    calculateDailyHours(worklogs) {
        const dailyHours = {};
        
        worklogs.forEach(log => {
            const logDate = new Date(log.log_date).toISOString().split('T')[0];
            if (!dailyHours[logDate]) {
                dailyHours[logDate] = 0;
            }
            dailyHours[logDate] += parseFloat(log.hours || 0);
        });

        return dailyHours;
    }

    organizeDailyWorklogs(worklogs) {
        const dailyWorklogs = {};
        
        worklogs.forEach(log => {
            const logDate = new Date(log.log_date).toISOString().split('T')[0];
            if (!dailyWorklogs[logDate]) {
                dailyWorklogs[logDate] = [];
            }
            dailyWorklogs[logDate].push({
                hours: parseFloat(log.hours || 0),
                workType: log.work_type || 'General',
                description: log.work_description || 'No description',
                status: log.status || 'in progress'
            });
        });

        return dailyWorklogs;
    }

    calculateDuration(startDate, endDate) {
        if (!endDate) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

    async getStats(selectedDate = new Date()) {
        try {
            const { count: totalEmployees, error: empError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'employee');

            if (empError) throw empError;

            const { count: activeProjects, error: projError } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'ongoing']);

            if (projError) throw projError;

            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select('user_id, assigned_hours')
                .eq('status', 'assigned');

            if (assignError) throw assignError;

            const userAssignedHours = {};
            assignments?.forEach(assignment => {
                if (!userAssignedHours[assignment.user_id]) {
                    userAssignedHours[assignment.user_id] = 0;
                }
                userAssignedHours[assignment.user_id] += parseInt(assignment.assigned_hours || 0);
            });

            let available = 0;
            let partial = 0;
            let busy = 0;

            const { data: allEmployees, error: allEmpError } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'employee');

            if (allEmpError) throw allEmpError;

            allEmployees?.forEach(emp => {
                const assignedHours = userAssignedHours[emp.id] || 0;
                
                if (assignedHours === 0 || assignedHours <= 20) {
                    available++;
                } else if (assignedHours >= 40) {
                    busy++;
                } else {
                    partial++;
                }
            });

            return {
                totalEmployees: totalEmployees || 0,
                activeProjects: activeProjects || 0,
                available,
                partial,
                full: busy
            };

        } catch (error) {
            console.error('[STATS] Error fetching stats:', error);
            return {
                totalEmployees: 0,
                activeProjects: 0,
                available: 0,
                partial: 0,
                full: 0
            };
        }
    }
}

// ============================================
// PROJECT TIMELINE UI RENDERER
// ============================================

class ProjectTimelineRenderer {
    constructor(timelineService) {
        this.timelineService = timelineService;
        this.projects = [];
        this.filteredProjects = [];
        this.currentPeriod = 'week';
        this.selectedDate = new Date();
        this.searchQuery = '';
    }

    async loadProjects() {
        try {
            console.log('[RENDERER] Loading projects...');
            ModalManager.showLoading();
            
            this.projects = await this.timelineService.getAllProjectsWithResources(this.selectedDate);
            this.filteredProjects = [...this.projects];
            
            console.log('[RENDERER] Projects loaded:', this.projects.length);
            
            ModalManager.hideLoading();
            
            await updateUserNameDisplayEnhanced();
            await this.updateStats();
            this.renderProjectTimeline();
            
        } catch (error) {
            console.error('[RENDERER] Error loading projects:', error);
            ModalManager.hideLoading();
            MessageManager.error('Failed to load project data');
        }
    }

    async updateStats() {
        try {
            const stats = await this.timelineService.getStats(this.selectedDate);
            
            const elements = {
                totalEmployees: document.getElementById('totalEmployees'),
                totalProjects: document.getElementById('totalProjects'),
                availableEmployees: document.getElementById('availableEmployees'),
                partialEmployees: document.getElementById('partialEmployees'),
                fullyAllocated: document.getElementById('fullyAllocated')
            };

            if (elements.totalEmployees) elements.totalEmployees.textContent = stats.totalEmployees;
            if (elements.totalProjects) elements.totalProjects.textContent = stats.activeProjects;
            if (elements.availableEmployees) elements.availableEmployees.textContent = stats.available;
            if (elements.partialEmployees) elements.partialEmployees.textContent = stats.partial;
            if (elements.fullyAllocated) elements.fullyAllocated.textContent = stats.full;

            console.log('[RENDERER] Stats updated:', stats);
        } catch (error) {
            console.error('[RENDERER] Error updating stats:', error);
        }
    }

    filterProjects() {
        this.filteredProjects = this.projects.filter(project => {
            const matchesSearch = project.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                                project.teamMembers.some(member => 
                                    member.name.toLowerCase().includes(this.searchQuery.toLowerCase())
                                ) ||
                                (project.projectManager && project.projectManager.name.toLowerCase().includes(this.searchQuery.toLowerCase()));
            return matchesSearch;
        });
        this.renderProjectTimeline();
    }

    renderProjectTimeline() {
        console.log('[RENDERER] Rendering timeline...');
        const timelineRows = document.getElementById('timelineRows');
        const timelineDates = document.getElementById('timelineDates');

        if (!timelineRows || !timelineDates) {
            console.error('[RENDERER] Timeline containers not found!');
            return;
        }

        timelineRows.innerHTML = '';
        timelineDates.innerHTML = '';

        this.renderDateHeaders(timelineDates);

        if (this.filteredProjects.length === 0) {
            timelineRows.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #6c757d; grid-column: 1 / -1;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p style="font-size: 16px;">No projects found</p>
                    <p style="font-size: 14px;">Create projects or adjust your filters</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();
        this.filteredProjects.forEach(project => {
            const projectRow = this.createProjectRow(project);
            fragment.appendChild(projectRow);
        });

        timelineRows.appendChild(fragment);
        console.log('[RENDERER] Timeline rendered successfully');
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
                cell.innerHTML = `
                    <div style="font-weight: 600; font-size: 14px;">${date.getDate()}</div>
                `;
            }
            
            container.appendChild(cell);
        });
    }

    createProjectRow(project) {
        const rowContainer = document.createElement('div');
        rowContainer.className = 'project-row-container';

        const projectHeader = this.createProjectHeader(project);
        rowContainer.appendChild(projectHeader);

        const teamRows = document.createElement('div');
        teamRows.className = 'team-member-rows';
        teamRows.style.display = 'none';

        if (project.projectManager) {
            const managerRow = this.createProjectManagerRow(project.projectManager, project);
            teamRows.appendChild(managerRow);
        }

        project.teamMembers.forEach(member => {
            const memberRow = this.createTeamMemberRow(member, project);
            teamRows.appendChild(memberRow);
        });

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
            const cell = document.createElement('div');
            cell.className = 'workload-cell';
            row.appendChild(cell);
        });

        return row;
    }

    createProjectManagerRow(manager, project) {
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
        const totalAvailableHours = member.totalAvailableHours || 40;
        const availabilityStatus = this.getAvailabilityStatus(assignedHours, totalAvailableHours);

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
            const dateStr = date.toISOString().split('T')[0];
            const hours = member.dailyHours[dateStr] || 0;
            const worklogs = member.dailyWorklogs[dateStr] || [];
            
            const cell = this.createHoursCell(hours, worklogs, member, dateStr, project);
            row.appendChild(cell);
        });

        return row;
    }

    createHoursCell(hours, worklogs, member, dateStr, project) {
        const cell = document.createElement('div');
        cell.className = 'workload-cell';
        
        if (hours > 0) {
            cell.style.cursor = 'pointer';
            
            const hoursDisplay = document.createElement('div');
            hoursDisplay.style.cssText = `
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                background: ${this.getHoursBackgroundColor(hours)};
                color: ${this.getHoursTextColor(hours)};
                display: inline-block;
                transition: all 0.2s ease;
            `;
            hoursDisplay.textContent = `${hours.toFixed(1)}h`;
            
            hoursDisplay.addEventListener('mouseenter', () => {
                hoursDisplay.style.transform = 'scale(1.05)';
                hoursDisplay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            });
            
            hoursDisplay.addEventListener('mouseleave', () => {
                hoursDisplay.style.transform = 'scale(1)';
                hoursDisplay.style.boxShadow = 'none';
            });
            
            cell.appendChild(hoursDisplay);

            cell.addEventListener('click', () => {
                this.showWorklogModal(member, dateStr, worklogs, project);
            });
        } else {
            cell.innerHTML = '<span style="color: #dee2e6; font-size: 18px;">—</span>';
        }

        return cell;
    }

    showWorklogModal(member, dateStr, worklogs, project) {
        const modal = document.getElementById('worklogModal');
        if (!modal) {
            console.error('Worklog modal not found');
            return;
        }

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
            totalItem.innerHTML = `
                <strong>Total Hours:</strong> ${totalHours.toFixed(1)}h
            `;
            worklogList.appendChild(totalItem);
        }

        ModalManager.show('worklogModal');
    }

    getAvailabilityStatus(assignedHours, totalAvailableHours) {
        const standardWorkweek = 40;
        
        if (assignedHours >= 40) {
            return { 
                text: 'Busy', 
                color: '#c62828', 
                bg: '#ffebee'
            };
        } else if (assignedHours >= 21 && assignedHours < 40) {
            return { 
                text: 'Partial', 
                color: '#f57c00', 
                bg: '#fff3e0'
            };
        } else {
            return { 
                text: 'Available', 
                color: '#2e7d32', 
                bg: '#e8f5e9'
            };
        }
    }

    getHoursBackgroundColor(hours) {
        if (hours >= 0 && hours <= 4) return '#e8f5e9';
        if (hours > 4 && hours < 8) return '#fff3e0';
        if (hours === 8) return '#e3f2fd';
        return '#ffebee';
    }

    getHoursTextColor(hours) {
        if (hours >= 0 && hours <= 4) return '#2e7d32';
        if (hours > 4 && hours < 8) return '#f57c00';
        if (hours === 8) return '#1976d2';
        return '#c62828';
    }

    getStatusBadge(status) {
        const statusConfig = {
            'pending': { color: '#F5A623', bg: '#FFF4E6', text: 'Pending' },
            'ongoing': { color: '#4A90E2', bg: '#E3F2FD', text: 'Ongoing' },
            'completed': { color: '#7ED321', bg: '#E8F5E9', text: 'Completed' },
            'on-hold': { color: '#9B9B9B', bg: '#F5F5F5', text: 'On Hold' },
            'cancelled': { color: '#E74C3C', bg: '#FFEBEE', text: 'Cancelled' }
        };
        
        const config = statusConfig[status] || statusConfig['pending'];
        return `<span style="background: ${config.bg}; color: ${config.color}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${config.text}</span>`;
    }

    getPriorityBadge(priority) {
        const priorityConfig = {
            'low': { color: '#7ED321', bg: '#E8F5E9', text: 'Low' },
            'medium': { color: '#F5A623', bg: '#FFF4E6', text: 'Medium' },
            'high': { color: '#E74C3C', bg: '#FFEBEE', text: 'High' }
        };
        
        const config = priorityConfig[priority] || priorityConfig['medium'];
        return `<span style="background: ${config.bg}; color: ${config.color}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${config.text}</span>`;
    }

    getWorklogStatusBadge(status) {
        const statusConfig = {
            'in progress': { color: '#4A90E2', bg: '#E3F2FD', text: 'In Progress' },
            'completed': { color: '#7ED321', bg: '#E8F5E9', text: 'Completed' },
            'pending': { color: '#F5A623', bg: '#FFF4E6', text: 'Pending' },
            'blocked': { color: '#E74C3C', bg: '#FFEBEE', text: 'Blocked' }
        };
        
        const config = statusConfig[status] || statusConfig['in progress'];
        return `<span style="background: ${config.bg}; color: ${config.color}; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${config.text}</span>`;
    }
}

// ============================================
// INITIALIZATION
// ============================================

function initializeProjectTimeline() {
    console.log('[INIT] Initializing project timeline...');
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
        dateInput.value = new Date().toISOString().split('T')[0];
        dateInput.addEventListener('change', (e) => {
            renderer.selectedDate = new Date(e.target.value);
            renderer.loadProjects();
        });
    }

    const searchInput = document.getElementById('employeeSearch');
    if (searchInput) {
        searchInput.placeholder = 'Search project, team member, or project manager...';
        const debouncedSearch = debounce((value) => {
            renderer.searchQuery = value;
            renderer.filterProjects();
        }, 300);
        searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
    }

    return renderer;
}

let app;
let projectRenderer;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[INIT] DOM loaded, starting initialization...');
    
    try {
        app = new DashboardApp();
        projectRenderer = initializeProjectTimeline();
        app.setupLogoutListeners();
        
        console.log('[INIT] Dashboard initialized successfully');
    } catch (error) {
        console.error('[INIT] Error initializing dashboard:', error);
        MessageManager.error('Failed to initialize dashboard: ' + error.message);
    }
});