// PROJECT MANAGER (PM) projecttrack.js 
import { supabase } from "../../supabaseClient.js";

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
// PROJECT TRACKING DATA SERVICE
// ============================================

class ProjectTrackingService {
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
                console.error('[PROJECT TRACKING] Error fetching PM user:', error);
                throw error;
            }

            this.currentPMId = userData.id;
            console.log('[PROJECT TRACKING] Initialized for PM:', userData);
        } else {
            throw new Error('No logged in user found');
        }
    }

    async getActiveProjects() {
        try {
            console.log('[PROJECT TRACKING] Fetching active projects for PM:', this.currentPMId);

            const { data: projects, error } = await supabase
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
                .in('status', ['pending', 'ongoing', 'active'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get team members for each project
            const projectsWithTeams = await Promise.all(
                projects.map(async (project) => {
                    const teamMembers = await this.getProjectTeamMembers(project.id);
                    return {
                        ...project,
                        teamMembers,
                        teamSize: teamMembers.length
                    };
                })
            );

            console.log('[PROJECT TRACKING] Active projects fetched:', projectsWithTeams.length);
            return projectsWithTeams;
        } catch (error) {
            console.error('[PROJECT TRACKING] Error fetching active projects:', error);
            return [];
        }
    }

    async getProjectHistory() {
        try {
            console.log('[PROJECT TRACKING] Fetching project history for PM:', this.currentPMId);

            const { data: projects, error } = await supabase
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
                .in('status', ['completed', 'cancelled'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log('[PROJECT TRACKING] History projects fetched:', projects.length);
            return projects || [];
        } catch (error) {
            console.error('[PROJECT TRACKING] Error fetching project history:', error);
            return [];
        }
    }

    async getProjectTeamMembers(projectId) {
        try {
            const { data: assignments, error } = await supabase
                .from('project_assignments')
                .select(`
                    user_id,
                    role_in_project,
                    assignment_type,
                    users (
                        id,
                        name,
                        email,
                        user_details (
                            job_title
                        )
                    )
                `)
                .eq('project_id', projectId)
                .eq('status', 'assigned');

            if (error) throw error;

            return assignments.map(assignment => ({
                userId: assignment.users.id,
                name: assignment.users.name,
                email: assignment.users.email,
                role: assignment.users.user_details?.[0]?.job_title || assignment.role_in_project || 'Team Member',
                assignmentType: assignment.assignment_type || 'Full-Time',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(assignment.users.name)}&background=4A90E2&color=fff`
            }));
        } catch (error) {
            console.error('[PROJECT TRACKING] Error fetching team members:', error);
            return [];
        }
    }

    async removeTeamMember(projectId, userId) {
        try {
            console.log('[PROJECT TRACKING] ===== REMOVING TEAM MEMBER =====');
            console.log('[PROJECT TRACKING] Project ID:', projectId, 'User ID:', userId);

            // FIXED: Get ALL assignments for this user and project (may be multiple) - NO .single()!
            const { data: assignments, error: fetchError } = await supabase
                .from('project_assignments')
                .select('assigned_hours')
                .eq('project_id', projectId)
                .eq('user_id', userId);

            if (fetchError) {
                console.error('[PROJECT TRACKING] Error fetching assignments:', fetchError);
                throw fetchError;
            }

            // Calculate total hours to restore (in case there are multiple records)
            const totalAssignedHours = assignments?.reduce((sum, a) => sum + (a.assigned_hours || 0), 0) || 40;
            console.log(`[PROJECT TRACKING] Found ${assignments?.length || 0} assignment(s), total hours to restore: ${totalAssignedHours}h`);

            // Step 1: Delete ALL PM allocations for this user on this project
            console.log('[PROJECT TRACKING] Step 1: Deleting PM allocations...');
            const { error: deleteAllocError } = await supabase
                .from('employee_assigned')
                .delete()
                .eq('project_id', projectId)
                .eq('user_id', userId);

            if (deleteAllocError) {
                console.error('[PROJECT TRACKING] Error deleting PM allocations:', deleteAllocError);
                // Continue even if no allocations exist
            } else {
                console.log('[PROJECT TRACKING] Deleted all PM allocations for this user');
            }

            // Step 2: Update ALL assignment statuses to removed
            console.log('[PROJECT TRACKING] Step 2: Updating assignment status...');
            const { error: updateError } = await supabase
                .from('project_assignments')
                .update({ status: 'removed' })
                .eq('project_id', projectId)
                .eq('user_id', userId);

            if (updateError) {
                console.error('[PROJECT TRACKING] Error updating assignments:', updateError);
                throw updateError;
            }

            console.log('[PROJECT TRACKING] All assignments updated to "removed"');

            // Step 3: Get current available hours
            console.log('[PROJECT TRACKING] Step 3: Restoring user hours...');
            const { data: userDetail, error: detailError } = await supabase
                .from('user_details')
                .select('total_available_hours')
                .eq('user_id', userId)
                .single();

            if (detailError) {
                console.error('[PROJECT TRACKING] Error fetching user details:', detailError);
                throw detailError;
            }

            const currentAvailable = userDetail?.total_available_hours || 0;
            const newAvailable = Math.min(currentAvailable + totalAssignedHours, 40);

            console.log(`[PROJECT TRACKING] Current: ${currentAvailable}h, Restoring: ${totalAssignedHours}h, New: ${newAvailable}h`);

            // Step 4: Update user_details: restore hours and set to Available
            const { error: statusError } = await supabase
                .from('user_details')
                .update({ 
                    status: 'Available',
                    total_available_hours: newAvailable
                })
                .eq('user_id', userId);

            if (statusError) {
                console.error('[PROJECT TRACKING] Error updating user status:', statusError);
                throw statusError;
            }

            console.log('[PROJECT TRACKING] ===== REMOVE TEAM MEMBER SUCCESS =====');
            console.log(`[PROJECT TRACKING] Restored ${totalAssignedHours}h. User now has ${newAvailable}h available`);
            return { success: true };
        } catch (error) {
            console.error('[PROJECT TRACKING] ===== REMOVE TEAM MEMBER FAILED =====');
            console.error('[PROJECT TRACKING] Error:', error);
            throw error;
        }
    }

    async completeProject(projectId) {
        try {
            console.log('[PROJECT TRACKING] ===== STARTING COMPLETE PROJECT =====');
            console.log('[PROJECT TRACKING] Project ID:', projectId);

            // Get ALL assignments for this project with assigned hours
            console.log('[PROJECT TRACKING] Step 1: Fetching assignments...');
            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select('user_id, status, assigned_hours')
                .eq('project_id', projectId);

            if (assignError) {
                console.error('[PROJECT TRACKING] Error fetching assignments:', assignError);
                throw assignError;
            }

            console.log('[PROJECT TRACKING] Step 1 Complete. Assignments:', assignments);

            // Filter for assigned users in JavaScript
            const assignedUsers = assignments?.filter(a => a.status === 'assigned') || [];
            console.log('[PROJECT TRACKING] Assigned users:', assignedUsers);

            // Delete ALL PM allocations for this project
            console.log('[PROJECT TRACKING] Step 1.5: Deleting PM allocations...');
            const { error: deleteAllocError } = await supabase
                .from('employee_assigned')
                .delete()
                .eq('project_id', projectId);

            if (deleteAllocError) {
                console.error('[PROJECT TRACKING] Error deleting PM allocations:', deleteAllocError);
                // Continue even if no allocations exist
            } else {
                console.log('[PROJECT TRACKING] Deleted all PM allocations for this project');
            }

            // Get today's date in YYYY-MM-DD format
            const today = new Date();
            const endDate = today.toISOString().split('T')[0];
            console.log('[PROJECT TRACKING] Setting end_date to:', endDate);

            // Update project status to completed AND set end_date
            console.log('[PROJECT TRACKING] Step 2: Updating project status and end_date...');
            const { error: projectError } = await supabase
                .from('projects')
                .update({ 
                    status: 'completed',
                    end_date: endDate
                })
                .eq('id', projectId);

            if (projectError) {
                console.error('[PROJECT TRACKING] Error updating project:', projectError);
                throw projectError;
            }

            console.log('[PROJECT TRACKING] Step 2 Complete. Project status and end_date updated');

            // Update assignment status
            console.log('[PROJECT TRACKING] Step 3: Updating assignments...');
            const { error: updateAssignError } = await supabase
                .from('project_assignments')
                .update({ status: 'completed' })
                .eq('project_id', projectId)
                .eq('status', 'assigned');

            if (updateAssignError) {
                console.error('[PROJECT TRACKING] Error updating assignments:', updateAssignError);
                throw updateAssignError;
            }

            console.log('[PROJECT TRACKING] Step 3 Complete. Assignments updated');

            // Update user statuses AND restore hours
            if (assignedUsers && assignedUsers.length > 0) {
                console.log('[PROJECT TRACKING] Step 4: Updating user availability and restoring hours...');
                
                for (const assignment of assignedUsers) {
                    const userId = assignment.user_id;
                    const hoursToRestore = assignment.assigned_hours || 40;
                    
                    console.log(`[PROJECT TRACKING] Restoring ${hoursToRestore}h for user:`, userId);
                    
                    // Get current available hours
                    const { data: userDetail, error: fetchError } = await supabase
                        .from('user_details')
                        .select('total_available_hours')
                        .eq('user_id', userId)
                        .single();

                    if (fetchError) {
                        console.error(`[PROJECT TRACKING] Error fetching user ${userId}:`, fetchError);
                        continue;
                    }

                    const currentAvailable = userDetail?.total_available_hours || 0;
                    const newAvailable = Math.min(currentAvailable + hoursToRestore, 40);

                    // Update status and hours
                    const { error: statusError } = await supabase
                        .from('user_details')
                        .update({ 
                            status: 'Available',
                            total_available_hours: newAvailable
                        })
                        .eq('user_id', userId);

                    if (statusError) {
                        console.error(`[PROJECT TRACKING] Error updating user ${userId}:`, statusError);
                    } else {
                        console.log(`[PROJECT TRACKING] User ${userId} updated: ${newAvailable}h available`);
                    }
                }
            }

            console.log('[PROJECT TRACKING] ===== COMPLETE PROJECT SUCCESS =====');
            return { success: true };
        } catch (error) {
            console.error('[PROJECT TRACKING] ===== COMPLETE PROJECT FAILED =====');
            console.error('[PROJECT TRACKING] Error:', error);
            throw error;
        }
    }

    async dropProject(projectId) {
        try {
            console.log('[PROJECT TRACKING] Dropping project:', projectId);

            // Get ALL assignments for this project with assigned hours
            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select('user_id, status, assigned_hours')
                .eq('project_id', projectId);

            if (assignError) {
                console.error('[PROJECT TRACKING] Error fetching assignments:', assignError);
                throw assignError;
            }

            // Filter for assigned users in JavaScript
            const assignedUsers = assignments?.filter(a => a.status === 'assigned') || [];
            console.log('[PROJECT TRACKING] Found assigned users:', assignedUsers);

            // Delete ALL PM allocations for this project
            console.log('[PROJECT TRACKING] Deleting PM allocations...');
            const { error: deleteAllocError } = await supabase
                .from('employee_assigned')
                .delete()
                .eq('project_id', projectId);

            if (deleteAllocError) {
                console.error('[PROJECT TRACKING] Error deleting PM allocations:', deleteAllocError);
                // Continue even if no allocations exist
            } else {
                console.log('[PROJECT TRACKING] Deleted all PM allocations for this project');
            }

            // Update project status to cancelled
            const { error: projectError } = await supabase
                .from('projects')
                .update({ status: 'cancelled' })
                .eq('id', projectId);

            if (projectError) {
                console.error('[PROJECT TRACKING] Error updating project status:', projectError);
                throw projectError;
            }

            console.log('[PROJECT TRACKING] Project status updated to cancelled');

            // Update assignment status to removed
            const { error: updateAssignError } = await supabase
                .from('project_assignments')
                .update({ status: 'removed' })
                .eq('project_id', projectId)
                .eq('status', 'assigned');

            if (updateAssignError) {
                console.error('[PROJECT TRACKING] Error updating assignments:', updateAssignError);
                throw updateAssignError;
            }

            console.log('[PROJECT TRACKING] Assignment statuses updated to removed');

            // Update user_details status to Available AND restore hours for assigned users
            if (assignedUsers && assignedUsers.length > 0) {
                console.log('[PROJECT TRACKING] Updating availability and restoring hours for users');
                
                for (const assignment of assignedUsers) {
                    const userId = assignment.user_id;
                    const hoursToRestore = assignment.assigned_hours || 40;
                    
                    console.log(`[PROJECT TRACKING] Restoring ${hoursToRestore}h for user:`, userId);

                    // Get current available hours
                    const { data: userDetail, error: fetchError } = await supabase
                        .from('user_details')
                        .select('total_available_hours')
                        .eq('user_id', userId)
                        .single();

                    if (fetchError) {
                        console.error(`[PROJECT TRACKING] Error fetching user ${userId}:`, fetchError);
                        continue;
                    }

                    const currentAvailable = userDetail?.total_available_hours || 0;
                    const newAvailable = Math.min(currentAvailable + hoursToRestore, 40);

                    // Update status and hours
                    const { error: statusError } = await supabase
                        .from('user_details')
                        .update({ 
                            status: 'Available',
                            total_available_hours: newAvailable
                        })
                        .eq('user_id', userId);

                    if (statusError) {
                        console.error(`[PROJECT TRACKING] Error updating user ${userId}:`, statusError);
                    } else {
                        console.log(`[PROJECT TRACKING] Successfully updated user ${userId}: ${newAvailable}h available`);
                    }
                }
            }

            console.log('[PROJECT TRACKING] Project dropped successfully');
            return { success: true };
        } catch (error) {
            console.error('[PROJECT TRACKING] Error dropping project:', error);
            throw error;
        }
    }

    async getStats() {
        try {
            const { count: activeCount, error: activeError } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', this.currentPMId)
                .in('status', ['pending', 'ongoing', 'active']);

            if (activeError) throw activeError;

            const { count: completedCount, error: completedError } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', this.currentPMId)
                .eq('status', 'completed');

            if (completedError) throw completedError;

            const { data: projects, error: projError } = await supabase
                .from('projects')
                .select('id')
                .eq('created_by', this.currentPMId)
                .in('status', ['pending', 'ongoing', 'active']);

            if (projError) throw projError;

            const projectIds = projects?.map(p => p.id) || [];

            let uniqueMembers = [];
            if (projectIds.length > 0) {
                const { data: assignments, error: assignError } = await supabase
                    .from('project_assignments')
                    .select('user_id')
                    .in('project_id', projectIds)
                    .eq('status', 'assigned');

                if (assignError) throw assignError;

                uniqueMembers = [...new Set(assignments?.map(a => a.user_id) || [])];
            }

            const { count: highCount, error: highError } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', this.currentPMId)
                .eq('priority', 'high')
                .in('status', ['pending', 'ongoing', 'active']);

            if (highError) throw highError;

            return {
                activeProjects: activeCount || 0,
                completedProjects: completedCount || 0,
                totalMembers: uniqueMembers.length,
                highPriority: highCount || 0
            };
        } catch (error) {
            console.error('[PROJECT TRACKING] Error fetching stats:', error);
            return {
                activeProjects: 0,
                completedProjects: 0,
                totalMembers: 0,
                highPriority: 0
            };
        }
    }
}

// ============================================
// PROJECT TRACKING APP
// ============================================

class ProjectTrackingApp {
    constructor() {
        this.dataService = new ProjectTrackingService();
        this.activeProjects = [];
        this.projectHistory = [];
        this.selectedProject = null;
        this.selectedEmployee = null;
    }

    async init() {
        try {
            ModalManager.showLoading();
            
            await this.dataService.initialize();

            this.setupEventListeners();
            await this.loadDashboard();
            
            ModalManager.hideLoading();
        } catch (error) {
            ModalManager.hideLoading();
            console.error('[PROJECT TRACKING APP] Initialization error:', error);
            MessageManager.error('Failed to initialize. Please login again.');
            setTimeout(() => {
                window.location.href = "/login/HTML_Files/login.html";
            }, 2000);
        }
    }

    setupEventListeners() {
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        const cancelLogout = document.getElementById('cancelLogout');
        const confirmLogout = document.getElementById('confirmLogout');
        
        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => this.handleLogout());
        }

        // History toggle
        const historyToggleBtn = document.getElementById('historyToggleBtn');
        if (historyToggleBtn) {
            historyToggleBtn.addEventListener('click', () => this.toggleHistory());
        }

        // Remove employee modal
        const closeRemoveModal = document.getElementById('closeRemoveModal');
        const cancelRemove = document.getElementById('cancelRemove');
        const confirmRemove = document.getElementById('confirmRemove');

        if (closeRemoveModal) {
            closeRemoveModal.addEventListener('click', () => ModalManager.hide('removeEmployeeModal'));
        }
        if (cancelRemove) {
            cancelRemove.addEventListener('click', () => ModalManager.hide('removeEmployeeModal'));
        }
        if (confirmRemove) {
            confirmRemove.addEventListener('click', () => this.confirmRemoveEmployee());
        }

        // Complete project modal
        const closeCompleteModal = document.getElementById('closeCompleteModal');
        const cancelComplete = document.getElementById('cancelComplete');
        const confirmComplete = document.getElementById('confirmComplete');

        if (closeCompleteModal) {
            closeCompleteModal.addEventListener('click', () => ModalManager.hide('completeProjectModal'));
        }
        if (cancelComplete) {
            cancelComplete.addEventListener('click', () => ModalManager.hide('completeProjectModal'));
        }
        if (confirmComplete) {
            confirmComplete.addEventListener('click', () => this.confirmCompleteProject());
        }

        // Drop project modal
        const closeDropModal = document.getElementById('closeDropModal');
        const cancelDrop = document.getElementById('cancelDrop');
        const confirmDrop = document.getElementById('confirmDrop');

        if (closeDropModal) {
            closeDropModal.addEventListener('click', () => ModalManager.hide('dropProjectModal'));
        }
        if (cancelDrop) {
            cancelDrop.addEventListener('click', () => ModalManager.hide('dropProjectModal'));
        }
        if (confirmDrop) {
            confirmDrop.addEventListener('click', () => this.confirmDropProject());
        }

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    async loadDashboard() {
        try {
            // Load stats
            const stats = await this.dataService.getStats();
            this.updateStats(stats);

            // Load active projects
            this.activeProjects = await this.dataService.getActiveProjects();
            this.renderActiveProjects();

            // Load project history
            this.projectHistory = await this.dataService.getProjectHistory();

        } catch (error) {
            console.error('[PROJECT TRACKING APP] Error loading dashboard:', error);
            MessageManager.error('Failed to load dashboard data');
        }
    }

    updateStats(stats) {
        const elements = {
            activeProjectsCount: document.getElementById('activeProjectsCount'),
            completedProjectsCount: document.getElementById('completedProjectsCount'),
            totalMembersCount: document.getElementById('totalMembersCount'),
            highPriorityCount: document.getElementById('highPriorityCount')
        };

        if (elements.activeProjectsCount) elements.activeProjectsCount.textContent = stats.activeProjects;
        if (elements.completedProjectsCount) elements.completedProjectsCount.textContent = stats.completedProjects;
        if (elements.totalMembersCount) elements.totalMembersCount.textContent = stats.totalMembers;
        if (elements.highPriorityCount) elements.highPriorityCount.textContent = stats.highPriority;
    }

    renderActiveProjects() {
        const container = document.getElementById('activeProjectsList');
        if (!container) return;

        if (this.activeProjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>No active projects found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        this.activeProjects.forEach(project => {
            const projectCard = this.createProjectCard(project);
            container.appendChild(projectCard);
        });
    }

    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';

        const priorityClass = `priority-${project.priority}`;
        const statusClass = `status-${project.status}`;

        card.innerHTML = `
            <div class="project-header">
                <div class="project-title-section">
                    <div class="project-title-row">
                        <h3>${project.name}</h3>
                        <span class="badge ${priorityClass}">${project.priority}</span>
                        <span class="badge ${statusClass}">${project.status}</span>
                    </div>
                    <p class="project-description">${project.description || 'No description'}</p>
                    <div class="project-meta">
                        <span><i class="fas fa-calendar"></i> ${project.start_date} to ${project.end_date || 'TBD'}</span>
                        <span><i class="fas fa-users"></i> Team Size: ${project.teamSize}</span>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn-complete" data-project-id="${project.id}">
                        <i class="fas fa-check-circle"></i> Complete
                    </button>
                    <button class="btn-drop" data-project-id="${project.id}">
                        <i class="fas fa-times-circle"></i> Drop
                    </button>
                    <button class="btn-toggle" data-project-id="${project.id}">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
            </div>
            <div class="team-members" id="team-${project.id}">
                <div class="team-members-header">Team Members</div>
                ${this.renderTeamMembers(project)}
            </div>
        `;

        // Add event listeners
        const completeBtn = card.querySelector('.btn-complete');
        const dropBtn = card.querySelector('.btn-drop');
        const toggleBtn = card.querySelector('.btn-toggle');

        completeBtn.addEventListener('click', () => this.openCompleteModal(project));
        dropBtn.addEventListener('click', () => this.openDropModal(project));
        toggleBtn.addEventListener('click', (e) => this.toggleTeamMembers(e.target.closest('.btn-toggle'), project.id));

        return card;
    }

    renderTeamMembers(project) {
        if (project.teamMembers.length === 0) {
            return '<p style="color: #6C757D; font-size: 14px;">No team members assigned yet</p>';
        }

        return project.teamMembers.map(member => `
            <div class="team-member-card">
                <div class="team-member-info">
                    <img src="${member.avatar}" alt="${member.name}" class="member-avatar">
                    <div class="member-details">
                        <h4>${member.name}</h4>
                        <p>${member.role}</p>
                    </div>
                </div>
                <span class="member-type">${member.assignmentType}</span>
                <button class="btn-remove" data-project-id="${project.id}" data-user-id="${member.userId}" data-member-name="${member.name}">
                    <i class="fas fa-user-minus"></i> Remove
                </button>
            </div>
        `).join('');
    }

    toggleTeamMembers(button, projectId) {
        const teamSection = document.getElementById(`team-${projectId}`);
        if (teamSection) {
            teamSection.classList.toggle('show');
            button.classList.toggle('expanded');
        }
    }

    toggleHistory() {
        const historySection = document.getElementById('projectHistorySection');
        const toggleBtn = document.getElementById('historyToggleBtn');

        if (historySection.style.display === 'none') {
            historySection.style.display = 'block';
            toggleBtn.classList.add('expanded');
            this.renderProjectHistory();
        } else {
            historySection.style.display = 'none';
            toggleBtn.classList.remove('expanded');
        }
    }

    renderProjectHistory() {
        const container = document.getElementById('projectHistoryList');
        if (!container) return;

        if (this.projectHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No project history</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        this.projectHistory.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';

            const priorityClass = `priority-${project.priority}`;
            const statusClass = `status-${project.status}`;

            card.innerHTML = `
                <div class="project-header">
                    <div class="project-title-section">
                        <div class="project-title-row">
                            <h3>${project.name}</h3>
                            <span class="badge ${priorityClass}">${project.priority}</span>
                            <span class="badge ${statusClass}">${project.status}</span>
                        </div>
                        <p class="project-description">${project.description || 'No description'}</p>
                        <div class="project-meta">
                            <span><i class="fas fa-calendar"></i> ${project.start_date} to ${project.end_date || 'TBD'}</span>
                            <span><i class="fas fa-flag-checkered"></i> Status: ${project.status.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    openCompleteModal(project) {
        this.selectedProject = project;
        document.getElementById('completeProjectName').textContent = project.name;
        ModalManager.show('completeProjectModal');
    }

    openDropModal(project) {
        this.selectedProject = project;
        document.getElementById('dropProjectName').textContent = project.name;
        ModalManager.show('dropProjectModal');
    }

    async confirmCompleteProject() {
    if (!this.selectedProject) {
        console.error('[PROJECT TRACKING] No project selected');
        MessageManager.error('No project selected');
        return;
    }

    try {
        console.log('[PROJECT TRACKING] Starting complete project for:', this.selectedProject.id);
        
        ModalManager.hide('completeProjectModal');
        ModalManager.showLoading();

        const result = await this.dataService.completeProject(this.selectedProject.id);
        
        console.log('[PROJECT TRACKING] Complete project result:', result);

        if (result.success) {
            // Reload all data
            await this.loadDashboard();
            
            // FORCE show history section and refresh it
            const historySection = document.getElementById('projectHistorySection');
            const toggleBtn = document.getElementById('historyToggleBtn');
            
            if (historySection) {
                historySection.style.display = 'block';
                if (toggleBtn) {
                    toggleBtn.classList.add('expanded');
                }
                // Force refresh history
                this.renderProjectHistory();
            }
            
            ModalManager.hideLoading();
            MessageManager.success('Project completed successfully!');
        } else {
            throw new Error('Complete project returned unsuccessful result');
        }
        
    } catch (error) {
        ModalManager.hideLoading();
        console.error('[PROJECT TRACKING] Error completing project:', error);
        console.error('[PROJECT TRACKING] Error stack:', error.stack);
        MessageManager.error('Failed to complete project: ' + (error.message || 'Unknown error'));
    }
}

        

    async confirmDropProject() {
        if (!this.selectedProject) return;

        try {
            ModalManager.hide('dropProjectModal');
            ModalManager.showLoading();

            await this.dataService.dropProject(this.selectedProject.id);

            // Reload all data
            await this.loadDashboard();
            
            // FORCE show history section and refresh it
            const historySection = document.getElementById('projectHistorySection');
            const toggleBtn = document.getElementById('historyToggleBtn');
            
            if (historySection) {
                historySection.style.display = 'block';
                if (toggleBtn) {
                    toggleBtn.classList.add('expanded');
                }
                // Force refresh history
                this.renderProjectHistory();
            }
            
            ModalManager.hideLoading();
            MessageManager.success('Project dropped successfully!');
            
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error dropping project:', error);
            MessageManager.error('Failed to drop project: ' + error.message);
        }
    }

    async confirmRemoveEmployee() {
        if (!this.selectedProject || !this.selectedEmployee) return;

        try {
            ModalManager.hide('removeEmployeeModal');
            ModalManager.showLoading();

            await this.dataService.removeTeamMember(this.selectedProject.id, this.selectedEmployee.userId);

            await this.loadDashboard();
            
            ModalManager.hideLoading();
            MessageManager.success('Team member removed successfully!');
        } catch (error) {
            ModalManager.hideLoading();
            MessageManager.error('Failed to remove team member');
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
// INITIALIZATION
// ============================================

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new ProjectTrackingApp();
    app.init();

    // Delegate event listener for remove buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove')) {
            const btn = e.target.closest('.btn-remove');
            const projectId = parseInt(btn.dataset.projectId);
            const userId = parseInt(btn.dataset.userId);
            const memberName = btn.dataset.memberName;

            const project = app.activeProjects.find(p => p.id === projectId);
            const employee = project?.teamMembers.find(m => m.userId === userId);

            if (project && employee) {
                app.selectedProject = project;
                app.selectedEmployee = employee;
                document.getElementById('removeEmployeeName').textContent = memberName;
                document.getElementById('removeProjectName').textContent = project.name;
                ModalManager.show('removeEmployeeModal');
            }
        }
    });
});