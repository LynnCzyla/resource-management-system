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
// DASHBOARD APP
// ============================================

class DashboardApp {
    constructor() {
        this.dataService = new PMDataService();
    }

    async init() {
        this.setupEventListeners();
        await this.loadDashboard();
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        // View all team button
        const viewAllTeamBtn = document.getElementById('viewAllTeamBtn');
        if (viewAllTeamBtn) {
            viewAllTeamBtn.addEventListener('click', () => this.viewAllTeam());
        }

        // Logout modal buttons
        const cancelLogout = document.getElementById('cancelLogout');
        const confirmLogout = document.getElementById('confirmLogout');
        
        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => this.handleLogout());
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
            ModalManager.showLoading();
            
            // Load stats
            const stats = await this.dataService.getDashboardStats();
            this.updateStats(stats);

            // Load projects overview
            const projects = await this.dataService.getProjects();
            this.renderProjectsOverview(projects);

            // Load team members
            const team = await this.dataService.getTeamMembers();
            this.renderTeamGrid(team);

            ModalManager.hideLoading();
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error loading dashboard:', error);
            MessageManager.error('Failed to load dashboard data');
        }
    }

    updateStats(stats) {
        document.getElementById('activeProjects').textContent = stats.activeProjects;
        document.getElementById('pendingRequests').textContent = stats.pendingRequests;
        document.getElementById('teamMembers').textContent = stats.teamMembers;
        document.getElementById('overdueProjects').textContent = stats.overdueProjects;
    }

    renderProjectsOverview(projects) {
        const container = document.getElementById('projectsOverviewGrid');
        const activeProjects = projects.filter(p => p.status === 'active').slice(0, 3);
        
        if (activeProjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No Active Projects</h3>
                    <p>Create a new project to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activeProjects.map(proj => `
            <div class="project-overview-card">
                <div class="project-overview-header">
                    <h3>${proj.name}</h3>
                    <span class="project-status ${proj.status}">${formatStatus(proj.status)}</span>
                </div>
                <p class="project-meta">
                    <i class="fas fa-calendar"></i> Due: ${formatDate(proj.deadline)}
                </p>
            </div>
        `).join('');
    }

    renderTeamGrid(team) {
        const container = document.getElementById('teamGrid');
        
        if (team.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Team Members</h3>
                    <p>Assign team members to your projects</p>
                </div>
            `;
            return;
        }

        // Show first 4 team members
        const displayTeam = team.slice(0, 4);

        container.innerHTML = displayTeam.map(member => `
            <div class="team-member-card">
                <img src="${member.avatar}" alt="${member.name}" class="team-member-avatar">
                <h4>${member.name}</h4>
                <p>${member.role}</p>
            </div>
        `).join('');
    }

    viewAllTeam() {
        // Navigate to team page or show modal with all team members
        MessageManager.info('View all team functionality will be implemented');
    }

    openLogoutModal() {
        ModalManager.show('logoutModal');
    }

    async handleLogout() {
        ModalManager.hide('logoutModal');
        ModalManager.showLoading();
        
        // Simulate logout process
        setTimeout(() => {
            ModalManager.hideLoading();
            MessageManager.success('You have been logged out successfully.');
            setTimeout(() => {
                window.location.href = "/login/HTML_Files/login.html"; 
            }, 1000);
        }, 1000);
    }
}

// ============================================
// INITIALIZATION
// ============================================

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DashboardApp();
    app.init();
});