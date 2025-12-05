// PROJECT MANAGER (PM) projecttrack.js - OPTIMIZED
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
    static iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    static show(message, type = 'info') {
        let container = document.getElementById('messageContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'messageContainer';
            document.body.appendChild(container);
        }

        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;
        messageBox.innerHTML = `
            <i class="fas ${this.iconMap[type]}"></i>
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
// PROJECT TRACKING DATA SERVICE
// ============================================

class ProjectTrackingService {
    constructor() {
        this.currentPMId = null;
        this.currentPMEmail = null;
    }

    async initialize() {
        const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
        
        if (!loggedUser.email) {
            throw new Error('No logged in user found');
        }

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
    }

    async getActiveProjects() {
        try {
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

            const projectsWithTeams = await Promise.all(
                projects.map(async (project) => ({
                    ...project,
                    teamMembers: await this.getProjectTeamMembers(project.id),
                    teamSize: (await this.getProjectTeamMembers(project.id)).length
                }))
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

    async updateUserAvailability(userId, hoursToRestore) {
        const { data: userDetail, error: fetchError } = await supabase
            .from('user_details')
            .select('total_available_hours')
            .eq('user_id', userId)
            .single();

        if (fetchError) throw fetchError;

        const currentAvailable = userDetail?.total_available_hours || 0;
        const newAvailable = Math.min(currentAvailable + hoursToRestore, 40);

        const { error: statusError } = await supabase
            .from('user_details')
            .update({ 
                status: 'Available',
                total_available_hours: newAvailable
            })
            .eq('user_id', userId);

        if (statusError) throw statusError;

        console.log(`[PROJECT TRACKING] User ${userId} updated: ${newAvailable}h available`);
        return newAvailable;
    }

    async removeTeamMember(projectId, userId) {
        try {
            console.log('[PROJECT TRACKING] Removing team member - Project:', projectId, 'User:', userId);

            const { data: assignments, error: fetchError } = await supabase
                .from('project_assignments')
                .select('assigned_hours')
                .eq('project_id', projectId)
                .eq('user_id', userId);

            if (fetchError) throw fetchError;

            const totalAssignedHours = assignments?.reduce((sum, a) => sum + (a.assigned_hours || 0), 0) || 40;

            // Delete PM allocations
            await supabase
                .from('employee_assigned')
                .delete()
                .eq('project_id', projectId)
                .eq('user_id', userId);

            // Update assignment status
            const { error: updateError } = await supabase
                .from('project_assignments')
                .update({ status: 'removed' })
                .eq('project_id', projectId)
                .eq('user_id', userId);

            if (updateError) throw updateError;

            // Restore user hours
            await this.updateUserAvailability(userId, totalAssignedHours);

            console.log('[PROJECT TRACKING] Team member removed successfully');
            return { success: true };
        } catch (error) {
            console.error('[PROJECT TRACKING] Error removing team member:', error);
            throw error;
        }
    }

    async completeProject(projectId) {
        try {
            console.log('[PROJECT TRACKING] Completing project:', projectId);

            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select('user_id, status, assigned_hours')
                .eq('project_id', projectId);

            if (assignError) throw assignError;

            const assignedUsers = assignments?.filter(a => a.status === 'assigned') || [];

            // Delete PM allocations
            await supabase
                .from('employee_assigned')
                .delete()
                .eq('project_id', projectId);

            // Update project status and end date
            const endDate = new Date().toISOString().split('T')[0];
            const { error: projectError } = await supabase
                .from('projects')
                .update({ 
                    status: 'completed',
                    end_date: endDate
                })
                .eq('id', projectId);

            if (projectError) throw projectError;

            // Update assignments
            const { error: updateAssignError } = await supabase
                .from('project_assignments')
                .update({ status: 'completed' })
                .eq('project_id', projectId)
                .eq('status', 'assigned');

            if (updateAssignError) throw updateAssignError;

            // Restore user hours
            for (const assignment of assignedUsers) {
                try {
                    await this.updateUserAvailability(assignment.user_id, assignment.assigned_hours || 40);
                } catch (error) {
                    console.error(`[PROJECT TRACKING] Error updating user ${assignment.user_id}:`, error);
                }
            }

            console.log('[PROJECT TRACKING] Project completed successfully');
            return { success: true };
        } catch (error) {
            console.error('[PROJECT TRACKING] Error completing project:', error);
            throw error;
        }
    }

    async dropProject(projectId) {
        try {
            console.log('[PROJECT TRACKING] Dropping project:', projectId);

            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select('user_id, status, assigned_hours')
                .eq('project_id', projectId);

            if (assignError) throw assignError;

            const assignedUsers = assignments?.filter(a => a.status === 'assigned') || [];

            // Delete PM allocations
            await supabase
                .from('employee_assigned')
                .delete()
                .eq('project_id', projectId);

            // Update project status
            const { error: projectError } = await supabase
                .from('projects')
                .update({ status: 'cancelled' })
                .eq('id', projectId);

            if (projectError) throw projectError;

            // Update assignments
            const { error: updateAssignError } = await supabase
                .from('project_assignments')
                .update({ status: 'removed' })
                .eq('project_id', projectId)
                .eq('status', 'assigned');

            if (updateAssignError) throw updateAssignError;

            // Restore user hours
            for (const assignment of assignedUsers) {
                try {
                    await this.updateUserAvailability(assignment.user_id, assignment.assigned_hours || 40);
                } catch (error) {
                    console.error(`[PROJECT TRACKING] Error updating user ${assignment.user_id}:`, error);
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
            const [activeCount, completedCount, projects, highCount] = await Promise.all([
                supabase.from('projects').select('*', { count: 'exact', head: true })
                    .eq('created_by', this.currentPMId)
                    .in('status', ['pending', 'ongoing', 'active']),
                supabase.from('projects').select('*', { count: 'exact', head: true })
                    .eq('created_by', this.currentPMId)
                    .eq('status', 'completed'),
                supabase.from('projects').select('id')
                    .eq('created_by', this.currentPMId)
                    .in('status', ['pending', 'ongoing', 'active']),
                supabase.from('projects').select('*', { count: 'exact', head: true })
                    .eq('created_by', this.currentPMId)
                    .eq('priority', 'high')
                    .in('status', ['pending', 'ongoing', 'active'])
            ]);

            const projectIds = projects.data?.map(p => p.id) || [];
            let uniqueMembers = [];

            if (projectIds.length > 0) {
                const { data: assignments } = await supabase
                    .from('project_assignments')
                    .select('user_id')
                    .in('project_id', projectIds)
                    .eq('status', 'assigned');

                uniqueMembers = [...new Set(assignments?.map(a => a.user_id) || [])];
            }

            return {
                activeProjects: activeCount.count || 0,
                completedProjects: completedCount.count || 0,
                totalMembers: uniqueMembers.length,
                highPriority: highCount.count || 0
            };
        } catch (error) {
            console.error('[PROJECT TRACKING] Error fetching stats:', error);
            return { activeProjects: 0, completedProjects: 0, totalMembers: 0, highPriority: 0 };
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
            setTimeout(() => window.location.href = "/login/HTML_Files/login.html", 2000);
        }
    }

    setupEventListeners() {
        const handlers = {
            logoutBtn: () => this.openLogoutModal(),
            cancelLogout: () => ModalManager.hide('logoutModal'),
            confirmLogout: () => this.handleLogout(),
            historyToggleBtn: () => this.toggleHistory(),
            closeRemoveModal: () => ModalManager.hide('removeEmployeeModal'),
            cancelRemove: () => ModalManager.hide('removeEmployeeModal'),
            confirmRemove: () => this.confirmRemoveEmployee(),
            closeCompleteModal: () => ModalManager.hide('completeProjectModal'),
            cancelComplete: () => ModalManager.hide('completeProjectModal'),
            confirmComplete: () => this.confirmCompleteProject(),
            closeDropModal: () => ModalManager.hide('dropProjectModal'),
            cancelDrop: () => ModalManager.hide('dropProjectModal'),
            confirmDrop: () => this.confirmDropProject()
        };

        Object.entries(handlers).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener('click', handler);
        });

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
            const stats = await this.dataService.getStats();
            this.updateStats(stats);
            this.activeProjects = await this.dataService.getActiveProjects();
            this.renderActiveProjects();
            this.projectHistory = await this.dataService.getProjectHistory();
        } catch (error) {
            console.error('[PROJECT TRACKING APP] Error loading dashboard:', error);
            MessageManager.error('Failed to load dashboard data');
        }
    }

    updateStats(stats) {
        const statsMap = {
            activeProjectsCount: stats.activeProjects,
            completedProjectsCount: stats.completedProjects,
            totalMembersCount: stats.totalMembers,
            highPriorityCount: stats.highPriority
        };

        Object.entries(statsMap).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
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
            container.appendChild(this.createProjectCard(project));
        });
    }

    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="project-header">
                <div class="project-title-section">
                    <div class="project-title-row">
                        <h3>${project.name}</h3>
                        <span class="badge priority-${project.priority}">${project.priority}</span>
                        <span class="badge status-${project.status}">${project.status}</span>
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

        card.querySelector('.btn-complete').addEventListener('click', () => this.openCompleteModal(project));
        card.querySelector('.btn-drop').addEventListener('click', () => this.openDropModal(project));
        card.querySelector('.btn-toggle').addEventListener('click', (e) => 
            this.toggleTeamMembers(e.target.closest('.btn-toggle'), project.id)
        );

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

        container.innerHTML = this.projectHistory.map(project => `
            <div class="project-card">
                <div class="project-header">
                    <div class="project-title-section">
                        <div class="project-title-row">
                            <h3>${project.name}</h3>
                            <span class="badge priority-${project.priority}">${project.priority}</span>
                            <span class="badge status-${project.status}">${project.status}</span>
                        </div>
                        <p class="project-description">${project.description || 'No description'}</p>
                        <div class="project-meta">
                            <span><i class="fas fa-calendar"></i> ${project.start_date} to ${project.end_date || 'TBD'}</span>
                            <span><i class="fas fa-flag-checkered"></i> Status: ${project.status.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
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
        if (!this.selectedProject) return;

        try {
            ModalManager.hide('completeProjectModal');
            ModalManager.showLoading();

            await this.dataService.completeProject(this.selectedProject.id);
            await this.loadDashboard();
            
            const historySection = document.getElementById('projectHistorySection');
            const toggleBtn = document.getElementById('historyToggleBtn');
            
            if (historySection) {
                historySection.style.display = 'block';
                toggleBtn?.classList.add('expanded');
                this.renderProjectHistory();
            }
            
            ModalManager.hideLoading();
            MessageManager.success('Project completed successfully!');
        } catch (error) {
            ModalManager.hideLoading();
            MessageManager.error('Failed to complete project: ' + (error.message || 'Unknown error'));
        }
    }

    async confirmDropProject() {
        if (!this.selectedProject) return;

        try {
            ModalManager.hide('dropProjectModal');
            ModalManager.showLoading();

            await this.dataService.dropProject(this.selectedProject.id);
            await this.loadDashboard();
            
            const historySection = document.getElementById('projectHistorySection');
            const toggleBtn = document.getElementById('historyToggleBtn');
            
            if (historySection) {
                historySection.style.display = 'block';
                toggleBtn?.classList.add('expanded');
                this.renderProjectHistory();
            }
            
            ModalManager.hideLoading();
            MessageManager.success('Project dropped successfully!');
        } catch (error) {
            ModalManager.hideLoading();
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
        setTimeout(() => window.location.href = "/login/HTML_Files/login.html", 500);
    }
}

// ============================================
// INITIALIZATION
// ============================================

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new ProjectTrackingApp();
    app.init();

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-remove');
        if (!btn) return;

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
    });
});