//PROJECT MANAGER (PM) My Projects.js 
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

class MessageManager {
    static show(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;

        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const icon = document.createElement('i');
        icon.className = `fas ${iconMap[type]}`;

        const text = document.createElement('span');
        text.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'message-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', () => messageBox.remove());

        messageBox.appendChild(icon);
        messageBox.appendChild(text);
        messageBox.appendChild(closeBtn);

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
// UTILITY FUNCTIONS
// ============================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatStatus(status) {
    const statusMap = {
        'active': 'Active',
        'ongoing': 'Active',
        'planning': 'Planning',
        'completed': 'Completed',
        'on-hold': 'On Hold',
        'pending': 'Pending Approval',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function calculateDurationDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// ============================================
// PM DATA SERVICE - SUPABASE INTEGRATION
// ============================================

class PMDataService {
    constructor() {
        this.currentPMId = null;
        this.currentPMEmail = null;
    }

    async initialize() {
        const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
        
        if (loggedUser.email) {
            this.currentPMEmail = loggedUser.email;
            
            const { data: userData, error } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('email', this.currentPMEmail)
                .eq('role', 'project_manager')
                .single();

            if (error) {
                console.error('[PM DATA SERVICE] Error fetching PM user:', error);
                throw error;
            }

            this.currentPMId = userData.id;
            console.log('[PM DATA SERVICE] Initialized for PM:', userData);
        } else {
            throw new Error('No logged in user found');
        }
    }

    async getProjects() {
        try {
            console.log('[PM DATA SERVICE] Fetching projects for PM:', this.currentPMId);

            // 1. Fetch APPROVED projects from projects table
            const { data: approvedProjects, error: projectsError } = await supabase
                .from('projects')
                .select(`
                    id,
                    name,
                    description,
                    status,
                    priority,
                    start_date,
                    end_date,
                    duration_days
                `)
                .eq('created_by', this.currentPMId)
                .not('status', 'in', '(completed,cancelled)')
                .order('created_at', { ascending: false });

            if (projectsError) throw projectsError;

            // 2. Fetch PENDING resource requests (projects awaiting RM approval)
            const { data: pendingRequests, error: requestsError } = await supabase
                .from('resource_requests')
                .select('*')
                .eq('requested_by', this.currentPMId)
                .eq('status', 'pending');

            if (requestsError) throw requestsError;

            // 3. Group pending requests by requestGroupId to reconstruct pending projects
            const pendingProjectsMap = {};
            
            pendingRequests?.forEach(req => {
                try {
                    const parsed = JSON.parse(req.notes);
                    if (parsed.projectName && parsed.requestGroupId) {
                        const groupKey = parsed.requestGroupId;
                        
                        if (!pendingProjectsMap[groupKey]) {
                            pendingProjectsMap[groupKey] = {
                                id: `pending_${groupKey}`, // Temporary ID for pending projects
                                name: parsed.projectName,
                                description: parsed.projectDescription || 'No description',
                                status: 'pending',
                                priority: parsed.priority || 'medium',
                                start_date: parsed.startDate,
                                end_date: parsed.endDate,
                                duration_days: parsed.durationDays,
                                isPending: true, // Flag to identify pending projects
                                requestCount: 0,
                                totalResources: 0
                            };
                        }
                        
                        pendingProjectsMap[groupKey].requestCount++;
                        pendingProjectsMap[groupKey].totalResources += parsed.resourceDetails?.quantity || 1;
                    }
                } catch (e) {
                    // Skip non-JSON notes
                }
            });

            const pendingProjects = Object.values(pendingProjectsMap);

            // 4. Process approved projects with team counts
            const projectsWithTeam = await Promise.all(
                approvedProjects.map(async (project) => {
                    // Get RM assignments
                    const { data: rmAssignments, error: rmError } = await supabase
                        .from('project_assignments')
                        .select('user_id')
                        .eq('project_id', project.id)
                        .eq('status', 'assigned');

                    if (rmError) {
                        console.error('Error fetching RM assignments:', rmError);
                    }

                    const rmCount = rmAssignments?.length || 0;

                    // Get unique PM allocations ONLY for users who are still assigned by RM
                    let pmCount = 0;
                    if (rmCount > 0) {
                        const assignedUserIds = rmAssignments.map(a => a.user_id);
                        
                        const { data: pmAssignments, error: pmError } = await supabase
                            .from('employee_assigned')
                            .select('user_id')
                            .eq('project_id', project.id)
                            .in('user_id', assignedUserIds);

                        if (pmError) {
                            console.error('Error fetching PM allocations:', pmError);
                        } else {
                            const uniquePmMembers = [...new Set((pmAssignments || []).map(a => a.user_id))];
                            pmCount = uniquePmMembers.length;
                        }
                    }

                    return { 
                        ...project, 
                        rmAssignedCount: rmCount,
                        pmAllocatedCount: pmCount,
                        teamSize: rmCount,
                        isPending: false
                    };
                })
            );

            // 5. Add pending project metadata
            const pendingProjectsWithMeta = pendingProjects.map(project => ({
                ...project,
                rmAssignedCount: 0,
                pmAllocatedCount: 0,
                teamSize: project.totalResources // Show expected team size
            }));

            // 6. Combine and return all projects
            const allProjects = [...pendingProjectsWithMeta, ...projectsWithTeam];

            console.log('[PM DATA SERVICE] Total projects:', allProjects.length, 
                        `(${pendingProjects.length} pending, ${projectsWithTeam.length} approved)`);
            
            return allProjects;
        } catch (error) {
            console.error('[PM DATA SERVICE] Error fetching projects:', error);
            return [];
        }
    }

    async getProjectRequirements(projectId) {
        try {
            // Handle pending projects (they don't have requirements yet)
            if (String(projectId).startsWith('pending_')) {
                return 0;
            }

            const { data, error } = await supabase
                .from('project_requirements')
                .select('quantity_needed')
                .eq('project_id', projectId);

            if (error) throw error;

            const totalNeeded = data?.reduce((sum, req) => sum + (req.quantity_needed || 0), 0) || 0;
            return totalNeeded;
        } catch (error) {
            console.error('[PM DATA SERVICE] Error fetching project requirements:', error);
            return 0;
        }
    }

    async getAssignedEmployeesForProject(projectId) {
        try {
            // Pending projects don't have assigned employees yet
            if (String(projectId).startsWith('pending_')) {
                return [];
            }

            console.log('[PM DATA SERVICE] Fetching assigned employees for project:', projectId);

            const { data: assignments, error } = await supabase
                .from('project_assignments')
                .select(`
                    user_id,
                    role_in_project,
                    assigned_hours,
                    assignment_type,
                    allocation_percent,
                    users (
                        id,
                        name,
                        email,
                        user_details (
                            job_title,
                            status,
                            skills
                        )
                    )
                `)
                .eq('project_id', projectId)
                .eq('status', 'assigned');

            if (error) throw error;

            // Get PM allocations
            const { data: pmAllocations, error: allocError } = await supabase
                .from('employee_assigned')
                .select('user_id, assigned_hours_per_day')
                .eq('project_id', projectId);

            if (allocError) throw allocError;

            // Sum up allocated hours per day
            const allocatedHoursPerDay = {};
            pmAllocations?.forEach(alloc => {
                allocatedHoursPerDay[alloc.user_id] = (allocatedHoursPerDay[alloc.user_id] || 0) + parseFloat(alloc.assigned_hours_per_day);
            });

            const uniqueEmployees = {};
            assignments?.forEach(assignment => {
                const user = assignment.users;
                if (user && !uniqueEmployees[user.id]) {
                    const weeklyHours = assignment.assigned_hours || 40;
                    const assignmentType = assignment.assignment_type || 'Full-Time';
                    const skills = user.user_details?.[0]?.skills || [];
                    
                    let maxHoursPerDay;
                    if (assignmentType === 'Full-Time') {
                        maxHoursPerDay = 8;
                    } else if (assignmentType === 'Part-Time') {
                        maxHoursPerDay = 4;
                    } else {
                        maxHoursPerDay = Math.min(8, Math.floor(weeklyHours / 5));
                    }

                    const allocatedPerDay = allocatedHoursPerDay[user.id] || 0;
                    const availablePerDay = Math.max(maxHoursPerDay - allocatedPerDay, 0);

                    uniqueEmployees[user.id] = {
                        id: user.id,
                        name: user.name,
                        role: user.user_details?.[0]?.job_title || assignment.role_in_project || 'Team Member',
                        email: user.email,
                        status: user.user_details?.[0]?.status || 'Available',
                        weeklyHours: weeklyHours,
                        assignmentType: assignmentType,
                        maxHoursPerDay: maxHoursPerDay,
                        allocatedHoursPerDay: allocatedPerDay,
                        availableHoursPerDay: availablePerDay,
                        skills: skills,
                        allocationPercent: assignment.allocation_percent || 100
                    };
                }
            });

            return Object.values(uniqueEmployees);
        } catch (error) {
            console.error('[PM DATA SERVICE] Error fetching assigned employees:', error);
            return [];
        }
    }

    async allocateHours(allocationData) {
        try {
            console.log('[PM DATA SERVICE] Allocating hours:', allocationData);

            const { error: assignError } = await supabase
                .from('employee_assigned')
                .insert({
                    user_id: parseInt(allocationData.employeeId),
                    project_id: parseInt(allocationData.projectId),
                    assigned_hours_per_day: parseFloat(allocationData.hoursPerDay),
                    start_date: allocationData.startDate,
                    end_date: allocationData.endDate,
                    description: allocationData.taskDescription || 'Assigned work',
                    created_by: this.currentPMId
                });

            if (assignError) throw assignError;

            const { data: updatedProject, error: statusError } = await supabase
                .from('projects')
                .update({ status: 'active' })
                .eq('id', parseInt(allocationData.projectId))
                .select('id, status')
                .single();

            if (statusError) throw statusError;

            console.log('[PM DATA SERVICE] Hours allocated successfully. Project status updated to:', updatedProject.status);
            return { success: true, updatedStatus: updatedProject.status };
        } catch (error) {
            console.error('[PM DATA SERVICE] Error allocating hours:', error);
            throw error;
        }
    }
}

// ============================================
// MY PROJECTS APP
// ============================================

class MyProjectsApp {
    constructor() {
        this.dataService = new PMDataService();
        this.allProjects = [];
        this.assignedEmployees = [];
        this.debouncedSearch = debounce(() => this.filterProjects(), 300);
        this.currentProjectId = null;
        this.currentProjectRequiredCount = 0;
    }

    async init() {
        try {
            ModalManager.showLoading();
            
            await this.dataService.initialize();
            
            await updateUserNameDisplayEnhanced();
            
            this.setupEventListeners();
            await this.loadProjects();
            
            ModalManager.hideLoading();
        } catch (error) {
            ModalManager.hideLoading();
            console.error('[MY PROJECTS APP] Initialization error:', error);
            MessageManager.error('Failed to initialize. Please login again.');
            setTimeout(() => {
                window.location.href = "/login/HTML_Files/login.html";
            }, 2000);
        }
    }

    setupEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        const searchInput = document.getElementById('projectSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.debouncedSearch());
        }

        const statusFilter = document.getElementById('projectStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterProjects());
        }

        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-allocate')) {
                const card = e.target.closest('.project-card');
                this.openAllocateModal(card);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-view')) {
                const card = e.target.closest('.project-card');
                this.viewProject(card);
            }
        });

        const closeAllocateModal = document.getElementById('closeAllocateModal');
        const cancelAllocate = document.getElementById('cancelAllocate');
        const allocateForm = document.getElementById('allocateForm');

        if (closeAllocateModal) {
            closeAllocateModal.addEventListener('click', () => ModalManager.hide('allocateHoursModal'));
        }
        if (cancelAllocate) {
            cancelAllocate.addEventListener('click', () => ModalManager.hide('allocateHoursModal'));
        }
        if (allocateForm) {
            allocateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitAllocation();
            });
        }

        const employeeSelect = document.getElementById('employeeSelect');
        if (employeeSelect) {
            employeeSelect.addEventListener('change', (e) => {
                this.updateAvailability(e.target.value);
            });
        }

        const closeViewBtn = document.getElementById('closeViewProjectModal');
        const closeProjectBtn = document.getElementById('closeProjectBtn');
        
        if (closeViewBtn) {
            closeViewBtn.addEventListener('click', () => ModalManager.hide('viewProjectModal'));
        }
        if (closeProjectBtn) {
            closeProjectBtn.addEventListener('click', () => ModalManager.hide('viewProjectModal'));
        }

        const cancelLogout = document.getElementById('cancelLogout');
        const confirmLogout = document.getElementById('confirmLogout');
        
        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => this.handleLogout());
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

    async loadProjects() {
        try {
            console.log('[MY PROJECTS APP] Loading projects...');
            this.allProjects = await this.dataService.getProjects();
            this.renderProjects(this.allProjects);
        } catch (error) {
            console.error('[MY PROJECTS APP] Error loading projects:', error);
            MessageManager.error('Failed to load projects');
        }
    }

    async loadAssignedEmployees(projectId) {
        try {
            console.log('[MY PROJECTS APP] Loading assigned employees for project:', projectId);
            
            this.currentProjectRequiredCount = await this.dataService.getProjectRequirements(projectId);
            this.assignedEmployees = await this.dataService.getAssignedEmployeesForProject(projectId);
            
            this.populateEmployeeDropdown();
            this.showAssignmentNotification();
        } catch (error) {
            console.error('[MY PROJECTS APP] Error loading assigned employees:', error);
            this.assignedEmployees = [];
            this.populateEmployeeDropdown();
        }
    }

    showAssignmentNotification() {
        const notificationDiv = document.getElementById('assignmentNotification');
        if (!notificationDiv) return;

        const assignedCount = this.assignedEmployees.length;
        const requiredCount = this.currentProjectRequiredCount;

        // Handle pending projects
        if (String(this.currentProjectId).startsWith('pending_')) {
            notificationDiv.style.display = 'block';
            notificationDiv.className = 'assignment-notification warning';
            notificationDiv.innerHTML = `
                <i class="fas fa-hourglass-half"></i>
                <span>⏳ This project is pending Resource Manager approval. You cannot allocate hours yet.</span>
            `;
            return;
        }

        if (requiredCount === 0) {
            notificationDiv.style.display = 'none';
            return;
        }

        notificationDiv.style.display = 'block';
        
        let icon, colorClass, message;
        
        if (assignedCount === 0) {
            icon = 'fa-exclamation-circle';
            colorClass = 'warning';
            message = `⚠️ No employees assigned yet. Resource Manager needs to assign ${requiredCount} employee(s).`;
        } else if (assignedCount < requiredCount) {
            icon = 'fa-info-circle';
            colorClass = 'info';
            message = `ℹ️ ${assignedCount}/${requiredCount} employees assigned by Resource Manager. Waiting for ${requiredCount - assignedCount} more.`;
        } else {
            icon = 'fa-check-circle';
            colorClass = 'success';
            message = `✓ All ${assignedCount}/${requiredCount} employees assigned by Resource Manager. You can now allocate hours.`;
        }

        notificationDiv.className = `assignment-notification ${colorClass}`;
        notificationDiv.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
    }

    populateEmployeeDropdown() {
        const employeeSelect = document.getElementById('employeeSelect');
        if (!employeeSelect) return;

        employeeSelect.innerHTML = '<option value="">Select Team Member</option>';
        
        if (this.assignedEmployees.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No employees assigned by Resource Manager yet";
            option.disabled = true;
            employeeSelect.appendChild(option);
            return;
        }

        const availableEmployees = this.assignedEmployees.filter(e => e.availableHoursPerDay > 0);
        const unavailableEmployees = this.assignedEmployees.filter(e => e.availableHoursPerDay <= 0);

        if (availableEmployees.length > 0) {
            availableEmployees
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(employee => {
                    const option = this.createEmployeeOption(employee, false);
                    employeeSelect.appendChild(option);
                });
        }

        if (availableEmployees.length > 0 && unavailableEmployees.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '--- Fully Allocated ---';
            employeeSelect.appendChild(separator);
        }

        unavailableEmployees
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(employee => {
                const option = this.createEmployeeOption(employee, true);
                employeeSelect.appendChild(option);
            });
    }

    createEmployeeOption(employee, isUnavailable) {
        const option = document.createElement('option');
        option.value = employee.id;
        
        const availText = isUnavailable ? 'Fully Allocated' : `${employee.availableHoursPerDay}h/day available`;
        option.textContent = `${employee.name} - ${employee.role} (${availText})`;
        
        if (isUnavailable) {
            option.disabled = true;
            option.style.color = '#999';
        }
        
        option.dataset.employeeId = employee.id;
        option.dataset.name = employee.name;
        option.dataset.role = employee.role;
        option.dataset.maxHoursPerDay = employee.maxHoursPerDay;
        option.dataset.availableHoursPerDay = employee.availableHoursPerDay;
        option.dataset.allocatedHoursPerDay = employee.allocatedHoursPerDay;
        option.dataset.weeklyHours = employee.weeklyHours;
        option.dataset.assignmentType = employee.assignmentType;
        option.dataset.allocationPercent = employee.allocationPercent;
        option.dataset.skills = JSON.stringify(employee.skills);
        
        return option;
    }

    renderProjects(projects) {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        grid.innerHTML = '';

        if (projects.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No Projects Found</h3>
                    <p>Start by creating a new project</p>
                </div>
            `;
            return;
        }

        projects.forEach(project => {
            const card = this.createProjectCard(project);
            grid.appendChild(card);
        });
    }

    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.id = project.id;
        card.dataset.status = project.status;
        card.dataset.isPending = project.isPending || false;
        card.dataset.rmAssignedCount = project.rmAssignedCount;
        card.dataset.pmAllocatedCount = project.pmAllocatedCount;

        const statusClass = project.status === 'active' || project.status === 'ongoing' ? 'active' : project.status;

        let statusBadge = `<span class="project-status ${statusClass}">${formatStatus(project.status)}</span>`;
        
        // Only show allocated badge if pmAllocatedCount > 0 AND not pending
        if (!project.isPending && project.pmAllocatedCount > 0) {
            statusBadge += `<span class="pm-indicator" title="You have allocated hours to ${project.pmAllocatedCount} team member(s)">
                <i class="fas fa-user-check"></i> ${project.pmAllocatedCount} allocated
            </span>`;
        }

        // Show pending indicator
        if (project.isPending) {
            statusBadge += `<span class="pending-indicator" title="Awaiting Resource Manager approval">
                <i class="fas fa-clock"></i> ${project.requestCount} resource request(s)
            </span>`;
        }

        card.innerHTML = `
            <div class="project-card-header">
                <div>
                    <h3>${project.name}</h3>
                    <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px; flex-wrap: wrap;">
                        ${statusBadge}
                    </div>
                </div>
            </div>
            <div class="project-card-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(project.end_date || project.start_date)}</span>
                <span><i class="fas fa-users"></i> ${project.isPending ? `${project.teamSize} requested` : `${project.rmAssignedCount} assigned by RM`}</span>
            </div>
            <p class="project-card-description">${project.description || 'No description provided'}</p>
            <div class="project-card-actions">
                <button class="btn-view">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn-allocate" ${project.isPending ? 'disabled title="Cannot allocate hours until RM approves"' : ''}>
                    <i class="fas fa-clock"></i> ${project.isPending ? 'Pending Approval' : 'Allocate Hours'}
                </button>
            </div>
        `;

        return card;
    }

    filterProjects() {
        const searchTerm = document.getElementById('projectSearch').value.toLowerCase().trim();
        const status = document.getElementById('projectStatusFilter').value;

        let filteredProjects = this.allProjects;

        if (searchTerm) {
            filteredProjects = filteredProjects.filter(project => 
                project.name.toLowerCase().includes(searchTerm) ||
                (project.description && project.description.toLowerCase().includes(searchTerm))
            );
        }

        if (status) {
            const statusToMatch = status === 'active' ? ['ongoing', 'active'] : [status];
            filteredProjects = filteredProjects.filter(project => statusToMatch.includes(project.status));
        }

        this.renderProjects(filteredProjects);
    }

    async openAllocateModal(card) {
        const projectId = card.dataset.id;
        const isPending = card.dataset.isPending === 'true';
        const projectName = card.querySelector('h3').textContent;
        
        // Prevent opening modal for pending projects
        if (isPending) {
            MessageManager.warning('Cannot allocate hours to pending projects. Wait for Resource Manager approval.');
            return;
        }
        
        this.currentProjectId = projectId;

        document.getElementById('modalProjectName').textContent = projectName;
        
        const form = document.getElementById('allocateForm');
        if (form) form.reset();
        
        const availDisplay = document.getElementById('availabilityDisplay');
        if (availDisplay) availDisplay.style.display = 'none';

        ModalManager.showLoading();
        await this.loadAssignedEmployees(projectId);
        
        // Auto-fill end date with project end date
        const project = this.allProjects.find(p => p.id === projectId);
        if (project && project.end_date) {
            const endDateInput = document.getElementById('endDate');
            if (endDateInput) {
                endDateInput.value = project.end_date;
            }
        }
        
        ModalManager.hideLoading();

        ModalManager.show('allocateHoursModal');
    }

    updateAvailability(employeeId) {
        const availDisplay = document.getElementById('availabilityDisplay');
        const hoursPerDayInput = document.getElementById('hoursPerDay');
        
        if (!availDisplay) return;

        if (employeeId) {
            const employee = this.assignedEmployees.find(e => e.id === parseInt(employeeId));
            
            if (employee) {
                const isAvailable = employee.availableHoursPerDay > 0;
                
                if (hoursPerDayInput) {
                    hoursPerDayInput.max = employee.availableHoursPerDay;
                    hoursPerDayInput.value = Math.min(hoursPerDayInput.value || employee.availableHoursPerDay, employee.availableHoursPerDay);
                }
                
                availDisplay.style.display = 'block';
                
                const badge = availDisplay.querySelector('.availability-badge');
                if (badge) {
                    badge.className = `availability-badge ${isAvailable ? 'available' : 'busy'}`;
                    badge.innerHTML = `<i class="fas fa-${isAvailable ? 'check' : 'times'}-circle"></i> ${isAvailable ? 'Available' : 'Fully Allocated'}`;
                }
                
                const assignmentInfo = availDisplay.querySelector('.assignment-info');
                if (assignmentInfo) {
                    assignmentInfo.innerHTML = `
                        <div class="info-item">
                            <span class="info-label">Assignment Type:</span>
                            <span class="info-value"><strong>${employee.assignmentType}</strong> (${employee.weeklyHours}h/week)</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Max Hours Per Day:</span>
                            <span class="info-value"><strong>${employee.maxHoursPerDay}h/day</strong></span>
                        </div>
                    `;
                }

                const utilizationInfo = availDisplay.querySelector('.utilization-info');
                if (utilizationInfo) {
                    const utilizationPercent = employee.maxHoursPerDay > 0 
                        ? Math.round((employee.allocatedHoursPerDay / employee.maxHoursPerDay) * 100) 
                        : 0;
                    
                    utilizationInfo.innerHTML = `
                        <div class="info-item">
                            <span class="info-label">Current Utilization:</span>
                            <span class="info-value">${utilizationPercent}% (${employee.allocatedHoursPerDay}h/${employee.maxHoursPerDay}h per day)</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Available Hours:</span>
                            <span class="info-value ${employee.availableHoursPerDay > 0 ? 'success' : ''}">${employee.availableHoursPerDay}h/day remaining</span>
                        </div>
                    `;
                }

                const skillsInfo = availDisplay.querySelector('.skills-info');
                if (skillsInfo && employee.skills && employee.skills.length > 0) {
                    const skillsHTML = employee.skills.map(skill => 
                        `<span class="skill-tag">${skill}</span>`
                    ).join('');
                    skillsInfo.innerHTML = `
                        <div class="info-item">
                            <span class="info-label">Skills:</span>
                            <div class="skills-display">${skillsHTML}</div>
                        </div>
                    `;
                } else if (skillsInfo) {
                    skillsInfo.innerHTML = `
                        <div class="info-item">
                            <span class="info-label">Skills:</span>
                            <span class="info-value">No skills listed</span>
                        </div>
                    `;
                }
            }
        } else {
            availDisplay.style.display = 'none';
            if (hoursPerDayInput) {
                hoursPerDayInput.max = 8;
            }
        }
    }

    async submitAllocation() {
        const employeeId = document.getElementById('employeeSelect').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const hoursPerDay = parseFloat(document.getElementById('hoursPerDay').value);
        const taskDescription = document.getElementById('taskDescription').value;

        if (!employeeId) {
            MessageManager.error('Please select an employee');
            return;
        }

        if (!startDate || !endDate) {
            MessageManager.error('Please select start and end dates');
            return;
        }

        const employee = this.assignedEmployees.find(e => e.id === parseInt(employeeId));
        if (!employee) {
            MessageManager.error('Invalid employee selection');
            return;
        }

        if (hoursPerDay <= 0 || hoursPerDay > employee.availableHoursPerDay) {
            MessageManager.error(`Hours per day must be between 0 and ${employee.availableHoursPerDay} (employee's available hours)`);
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            MessageManager.error('End date must be after start date');
            return;
        }

        try {
            ModalManager.hide('allocateHoursModal');
            ModalManager.showLoading();

            const data = {
                projectId: this.currentProjectId,
                employeeId: employeeId,
                startDate: startDate,
                endDate: endDate,
                hoursPerDay: hoursPerDay,
                taskDescription: taskDescription
            };

            const result = await this.dataService.allocateHours(data);
            await this.loadProjects();

            ModalManager.hideLoading();
            MessageManager.success(`Hours allocated successfully! Project is now ${result.updatedStatus.toUpperCase()}.`);
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error allocating hours:', error);
            MessageManager.error('Failed to allocate hours: ' + error.message);
        }
    }

    viewProject(card) {
        const projectId = card.dataset.id;
        const isPending = card.dataset.isPending === 'true';
        const project = this.allProjects.find(p => p.id === projectId);
        
        if (!project) return;

        const statusClass = project.status === 'ongoing' || project.status === 'active' ? 'active' : project.status;

        document.getElementById('viewProjectName').textContent = project.name;
        
        const statusElem = document.getElementById('viewProjectStatus');
        statusElem.textContent = formatStatus(project.status);
        statusElem.className = `project-status ${statusClass}`;
        
        document.getElementById('viewProjectDescription').textContent = project.description || 'No description provided';
        document.getElementById('viewProjectDeadline').textContent = formatDate(project.end_date || project.start_date);
        
        // Show appropriate team size info
        if (isPending) {
            document.getElementById('viewProjectTeamSize').textContent = `${project.teamSize} resources requested`;
        } else {
            document.getElementById('viewProjectTeamSize').textContent = `${project.teamSize} members`;
        }
        
        document.getElementById('viewProjectBudget').textContent = project.duration_days ? `${project.duration_days} days` : 'Not specified';

        ModalManager.show('viewProjectModal');
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
// INITIALIZATION
// ============================================

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MyProjectsApp();
    app.init();
    
    // Make it globally accessible for newproject-modal.js
    window.app = app;
});