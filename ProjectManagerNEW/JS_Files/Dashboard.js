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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatStatus(status) {
    const statusMap = {
        'active': 'Active',
        'planning': 'Planning',
        'completed': 'Completed',
        'on-hold': 'On Hold'
    };
    return statusMap[status] || status;
}

// ============================================
// MOCK DATA SERVICE
// ============================================

class PMDataService {
    constructor() {
        this.currentPMId = 'PM001';
    }

    async getDashboardStats() {
        return {
            activeProjects: 2,
            teamMembers: 4,
            totalHours: 136,
            teamUtilization: 85
        };
    }

    async getProjects() {
        return [
            {
                id: 'PROJ001',
                name: 'Customer Portal Redesign',
                status: 'active',
                deadline: '2025-12-15'
            },
            {
                id: 'PROJ002',
                name: 'API Integration',
                status: 'active',
                deadline: '2025-11-10'
            }
        ];
    }

    async getTeamMembers() {
        return [
            {
                id: 'EMP001',
                name: 'John Doe',
                role: 'Senior Developer',
                avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=4A90E2&color=fff'
            },
            {
                id: 'EMP002',
                name: 'Jane Smith',
                role: 'UI/UX Designer',
                avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=7ED321&color=fff'
            },
            {
                id: 'EMP003',
                name: 'Mike Johnson',
                role: 'Backend Developer',
                avatar: 'https://ui-avatars.com/api/?name=Mike+Johnson&background=F5A623&color=fff'
            },
            {
                id: 'EMP004',
                name: 'David Brown',
                role: 'DevOps Engineer',
                avatar: 'https://ui-avatars.com/api/?name=David+Brown&background=D0021B&color=fff'
            }
        ];
    }

    async getWeeklyAllocation(weekStart) {
        // Mock weekly allocation data
        return [
            {
                employee: 'John Doe',
                mon: 8, tue: 8, wed: 6, thu: 8, fri: 4
            },
            {
                employee: 'Jane Smith',
                mon: 8, tue: 0, wed: 0, thu: 8, fri: 8
            },
            {
                employee: 'Mike Johnson',
                mon: 8, tue: 8, wed: 8, thu: 8, fri: 8
            },
            {
                employee: 'David Brown',
                mon: 8, tue: 8, wed: 8, thu: 8, fri: 6
            }
        ];
    }

    async saveHourAllocation(data) {
        console.log('Saving hour allocation:', data);
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
    }
}

// ============================================
// DASHBOARD APP
// ============================================

class DashboardApp {
    constructor() {
        this.dataService = new PMDataService();
        this.currentWeek = '2025-11-10';
        this.selectedCell = null;
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

        // Logout modal buttons
        const cancelLogout = document.getElementById('cancelLogout');
        const confirmLogout = document.getElementById('confirmLogout');
        
        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => this.handleLogout());
        }

        // Week navigation
        const prevWeek = document.getElementById('prevWeek');
        const nextWeek = document.getElementById('nextWeek');
        const weekSelect = document.getElementById('weekSelect');

        if (prevWeek) {
            prevWeek.addEventListener('click', () => this.changeWeek(-1));
        }
        if (nextWeek) {
            nextWeek.addEventListener('click', () => this.changeWeek(1));
        }
        if (weekSelect) {
            weekSelect.addEventListener('change', (e) => {
                this.currentWeek = e.target.value;
                this.loadWeeklyAllocation();
            });
        }

        // Hour cell clicks
        document.addEventListener('click', (e) => {
            const cell = e.target.closest('.hours-cell');
            if (cell) {
                this.openAllocateModal(cell);
            }
        });

        // Allocate hours modal
        const closeAllocateModal = document.getElementById('closeAllocateModal');
        const cancelAllocate = document.getElementById('cancelAllocate');
        const allocateForm = document.getElementById('allocateHoursForm');

        if (closeAllocateModal) {
            closeAllocateModal.addEventListener('click', () => ModalManager.hide('allocateHoursModal'));
        }
        if (cancelAllocate) {
            cancelAllocate.addEventListener('click', () => ModalManager.hide('allocateHoursModal'));
        }
        if (allocateForm) {
            allocateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAllocation();
            });
        }

        // View allocation buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-view-allocation')) {
                MessageManager.info('Project team allocation view will be implemented');
            }
        });

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

            // Load weekly allocation
            await this.loadWeeklyAllocation();

            ModalManager.hideLoading();
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error loading dashboard:', error);
            MessageManager.error('Failed to load dashboard data');
        }
    }

    updateStats(stats) {
        const elements = {
            activeProjects: document.getElementById('activeProjects'),
            teamMembers: document.getElementById('teamMembers'),
            totalHours: document.getElementById('totalHours'),
            teamUtilization: document.getElementById('teamUtilization')
        };

        if (elements.activeProjects) elements.activeProjects.textContent = stats.activeProjects;
        if (elements.teamMembers) elements.teamMembers.textContent = stats.teamMembers;
        if (elements.totalHours) elements.totalHours.textContent = stats.totalHours + 'h';
        if (elements.teamUtilization) elements.teamUtilization.textContent = stats.teamUtilization + '%';
    }

    renderProjectsOverview(projects) {
        const container = document.getElementById('projectsOverviewGrid');
        if (!container) return;

        const activeProjects = projects.filter(p => p.status === 'active');
        
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

        // Keep existing HTML structure from the page
    }

    async loadWeeklyAllocation() {
        try {
            const allocation = await this.dataService.getWeeklyAllocation(this.currentWeek);
            // Allocation table is already in HTML, this would update it dynamically if needed
            // For now, keeping the static HTML data
        } catch (error) {
            console.error('Error loading weekly allocation:', error);
        }
    }

    changeWeek(direction) {
        const weekSelect = document.getElementById('weekSelect');
        if (!weekSelect) return;

        const currentIndex = weekSelect.selectedIndex;
        const newIndex = currentIndex + direction;

        if (newIndex >= 0 && newIndex < weekSelect.options.length) {
            weekSelect.selectedIndex = newIndex;
            this.currentWeek = weekSelect.value;
            this.loadWeeklyAllocation();
        }
    }

    openAllocateModal(cell) {
        const employee = cell.dataset.employee;
        const day = cell.dataset.day;
        const currentHours = cell.querySelector('.hours-value').textContent;

        this.selectedCell = cell;

        document.getElementById('selectedEmployee').textContent = employee;
        document.getElementById('selectedDay').textContent = day;
        document.getElementById('hoursInput').value = parseInt(currentHours) || 0;

        ModalManager.show('allocateHoursModal');
    }

    async saveAllocation() {
        const project = document.getElementById('projectSelect').value;
        const hours = document.getElementById('hoursInput').value;
        const task = document.getElementById('taskInput').value;

        if (!project) {
            MessageManager.error('Please select a project');
            return;
        }

        if (hours < 0 || hours > 8) {
            MessageManager.error('Hours must be between 0 and 8');
            return;
        }

        try {
            ModalManager.hide('allocateHoursModal');
            ModalManager.showLoading();

            const data = {
                employee: document.getElementById('selectedEmployee').textContent,
                day: document.getElementById('selectedDay').textContent,
                project: project,
                hours: hours,
                task: task
            };

            await this.dataService.saveHourAllocation(data);

            // Update the cell
            if (this.selectedCell) {
                const hoursValue = this.selectedCell.querySelector('.hours-value');
                hoursValue.textContent = hours + 'h';

                // Update cell class
                this.selectedCell.classList.remove('full', 'partial', 'empty');
                if (hours == 8) {
                    this.selectedCell.classList.add('full');
                } else if (hours > 0) {
                    this.selectedCell.classList.add('partial');
                } else {
                    this.selectedCell.classList.add('empty');
                }
            }

            ModalManager.hideLoading();
            MessageManager.success('Hours allocated successfully');
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error saving allocation:', error);
            MessageManager.error('Failed to save allocation');
        }
    }

    openLogoutModal() {
        ModalManager.show('logoutModal');
    }

    async handleLogout() {
        ModalManager.hide('logoutModal');
        ModalManager.showLoading();
        
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