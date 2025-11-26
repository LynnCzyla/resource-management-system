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
        'planning': 'Planning',
        'completed': 'Completed',
        'on-hold': 'On Hold'
    };
    return statusMap[status] || status;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// MOCK DATA SERVICE
// ============================================

class PMDataService {
    constructor() {
        this.currentPMId = 'PM001';
    }

    async getTeamMembers() {
        return [
            { id: 'EMP001', name: 'John Doe', role: 'Senior Developer', utilization: 85 },
            { id: 'EMP002', name: 'Jane Smith', role: 'UI/UX Designer', utilization: 60 },
            { id: 'EMP003', name: 'Mike Johnson', role: 'Backend Developer', utilization: 100 },
            { id: 'EMP004', name: 'David Brown', role: 'DevOps Engineer', utilization: 95 }
        ];
    }

    async allocateHours(data) {
        console.log('Allocating hours:', data);
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
    }
}

// ============================================
// MY PROJECTS APP
// ============================================

class MyProjectsApp {
    constructor() {
        this.dataService = new PMDataService();
        this.allCards = [];
        this.debouncedSearch = debounce(() => this.filterProjects(), 300);
        this.currentProjectId = null;
    }

    init() {
        this.cacheElements();
        this.setupEventListeners();
    }

    cacheElements() {
        this.allCards = Array.from(document.querySelectorAll('.project-card'));
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        // Search
        const searchInput = document.getElementById('projectSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.debouncedSearch());
        }

        // Filter
        const statusFilter = document.getElementById('projectStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterProjects());
        }

        // Add project button
        const addBtn = document.getElementById('addProjectBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addProject());
        }

        // Allocate hours buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-allocate')) {
                const card = e.target.closest('.project-card');
                this.openAllocateModal(card);
            }
        });

        // View project buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-view')) {
                const card = e.target.closest('.project-card');
                this.viewProject(card);
            }
        });

        // Allocate hours modal
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

        // Employee select change
        const employeeSelect = document.getElementById('employeeSelect');
        if (employeeSelect) {
            employeeSelect.addEventListener('change', (e) => {
                this.updateAvailability(e.target.value);
            });
        }

        // View project modal
        const closeViewBtn = document.getElementById('closeViewProjectModal');
        const closeProjectBtn = document.getElementById('closeProjectBtn');
        
        if (closeViewBtn) {
            closeViewBtn.addEventListener('click', () => ModalManager.hide('viewProjectModal'));
        }
        if (closeProjectBtn) {
            closeProjectBtn.addEventListener('click', () => ModalManager.hide('viewProjectModal'));
        }

        // Logout modal
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

    filterProjects() {
        const searchTerm = document.getElementById('projectSearch').value.toLowerCase().trim();
        const status = document.getElementById('projectStatusFilter').value;

        let visibleCount = 0;

        this.allCards.forEach(card => {
            const name = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('.project-card-description').textContent.toLowerCase();
            const cardStatus = card.querySelector('.project-status').classList[1];

            // Search matching
            const matchesSearch = !searchTerm || 
                name.includes(searchTerm) ||
                description.includes(searchTerm);

            // Status filter
            const matchesStatus = !status || cardStatus === status;

            // Show/hide card
            if (matchesSearch && matchesStatus) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show empty state if no results
        const grid = document.getElementById('projectsGrid');
        let emptyState = grid.querySelector('.empty-state');
        
        if (visibleCount === 0) {
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = `
                    <i class="fas fa-folder-open"></i>
                    <h3>No Projects Found</h3>
                    <p>Try adjusting your search criteria</p>
                `;
                grid.appendChild(emptyState);
            }
        } else if (emptyState) {
            emptyState.remove();
        }
    }

    openAllocateModal(card) {
        const projectName = card.querySelector('h3').textContent;
        this.currentProjectId = card.dataset.id;

        document.getElementById('modalProjectName').textContent = projectName;
        
        // Reset form
        const form = document.getElementById('allocateForm');
        if (form) form.reset();
        
        // Hide availability display
        const availDisplay = document.getElementById('availabilityDisplay');
        if (availDisplay) availDisplay.style.display = 'none';

        ModalManager.show('allocateHoursModal');
    }

    updateAvailability(employeeId) {
        const availDisplay = document.getElementById('availabilityDisplay');
        if (!availDisplay) return;

        if (employeeId) {
            // Mock availability data
            const availabilityData = {
                john: { status: 'available', utilization: 60, available: 16 },
                jane: { status: 'available', utilization: 60, available: 16 },
                mike: { status: 'busy', utilization: 100, available: 0 },
                david: { status: 'available', utilization: 95, available: 2 }
            };

            const data = availabilityData[employeeId] || availabilityData.john;

            availDisplay.style.display = 'block';
            availDisplay.querySelector('.availability-badge').className = 
                `availability-badge ${data.status}`;
            availDisplay.querySelector('.availability-badge i').className = 
                data.status === 'available' ? 'fas fa-check-circle' : 'fas fa-times-circle';
            availDisplay.querySelector('.availability-badge').innerHTML = 
                `<i class="fas fa-${data.status === 'available' ? 'check' : 'times'}-circle"></i> ${capitalize(data.status)}`;
            
            const utilizationText = availDisplay.querySelectorAll('.availability-value')[0];
            if (utilizationText) {
                utilizationText.textContent = `${data.utilization}% (${data.utilization * 0.4}h/40h this week)`;
            }

            const availableText = availDisplay.querySelectorAll('.availability-value')[1];
            if (availableText) {
                availableText.textContent = `${data.available}h remaining`;
                availableText.className = data.available > 0 ? 'availability-value success' : 'availability-value';
            }
        } else {
            availDisplay.style.display = 'none';
        }
    }

    async submitAllocation() {
        const employee = document.getElementById('employeeSelect').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const hoursPerDay = document.getElementById('hoursPerDay').value;
        const projectPhase = document.getElementById('projectPhase').value;
        const taskDescription = document.getElementById('taskDescription').value;

        if (!employee) {
            MessageManager.error('Please select an employee');
            return;
        }

        if (!startDate || !endDate) {
            MessageManager.error('Please select start and end dates');
            return;
        }

        if (hoursPerDay < 0 || hoursPerDay > 8) {
            MessageManager.error('Hours per day must be between 0 and 8');
            return;
        }

        try {
            ModalManager.hide('allocateHoursModal');
            ModalManager.showLoading();

            const data = {
                projectId: this.currentProjectId,
                employee: employee,
                startDate: startDate,
                endDate: endDate,
                hoursPerDay: hoursPerDay,
                projectPhase: projectPhase,
                taskDescription: taskDescription
            };

            await this.dataService.allocateHours(data);

            ModalManager.hideLoading();
            MessageManager.success('Hours allocated successfully!');
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error allocating hours:', error);
            MessageManager.error('Failed to allocate hours');
        }
    }

    viewProject(card) {
        const name = card.querySelector('h3').textContent;
        const status = card.querySelector('.project-status').classList[1];
        const description = card.querySelector('.project-card-description').textContent;
        const metaSpans = card.querySelectorAll('.project-card-meta span');
        
        let deadline = '';
        let teamSize = '';
        let budget = '';

        metaSpans.forEach(span => {
            const text = span.textContent;
            if (text.includes('Dec') || text.includes('Nov') || text.includes('Jan')) {
                deadline = text.trim();
            } else if (text.includes('members')) {
                teamSize = text.trim();
            } else if (text.includes('$')) {
                budget = text.trim();
            }
        });

        // Populate modal
        document.getElementById('viewProjectName').textContent = name;
        
        const statusElem = document.getElementById('viewProjectStatus');
        statusElem.textContent = formatStatus(status);
        statusElem.className = `project-status ${status}`;
        
        document.getElementById('viewProjectDescription').textContent = description;
        document.getElementById('viewProjectDeadline').textContent = deadline;
        document.getElementById('viewProjectTeamSize').textContent = teamSize;
        document.getElementById('viewProjectBudget').textContent = budget;

        ModalManager.show('viewProjectModal');
    }

    addProject() {
        MessageManager.info('Add project functionality will be implemented with backend integration');
    }

    openLogoutModal() {
        ModalManager.show('logoutModal');
    }

    handleLogout() {
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
    app = new MyProjectsApp();
    app.init();
});