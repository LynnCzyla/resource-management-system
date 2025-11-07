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

// Helper functions
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
// MY PROJECTS APP
// ============================================

class MyProjectsApp {
    constructor() {
        this.allCards = [];
        this.debouncedSearch = debounce(() => this.filterProjects(), 300);
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

        // View project buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-view')) {
                const card = e.target.closest('.project-card');
                this.viewProject(card);
            }
        });

        // Edit project buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-edit')) {
                const card = e.target.closest('.project-card');
                this.editProject(card.dataset.id);
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

    filterProjects() {
        const searchTerm = document.getElementById('projectSearch').value.toLowerCase().trim();
        const status = document.getElementById('projectStatusFilter').value;

        let visibleCount = 0;

        this.allCards.forEach(card => {
            const name = card.dataset.name.toLowerCase();
            const description = card.dataset.description.toLowerCase();
            const cardStatus = card.dataset.status;

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

    viewProject(card) {
        const name = card.dataset.name;
        const status = card.dataset.status;
        const description = card.dataset.description;
        const deadline = card.dataset.deadline;
        const teamSize = card.dataset.teamsize;
        const budget = card.dataset.budget;
        const priority = card.dataset.priority;
        const progress = card.dataset.progress;

        // Populate modal
        document.getElementById('viewProjectName').textContent = name;
        
        const statusElem = document.getElementById('viewProjectStatus');
        statusElem.textContent = formatStatus(status);
        statusElem.className = `project-status ${status}`;
        
        document.getElementById('viewProjectDescription').textContent = description;
        document.getElementById('viewProjectDeadline').textContent = formatDate(deadline);
        document.getElementById('viewProjectTeamSize').textContent = `${teamSize} members`;
        document.getElementById('viewProjectBudget').textContent = budget;
        document.getElementById('viewProjectPriority').textContent = capitalize(priority);
        
        const progressFill = document.getElementById('viewProjectProgress');
        progressFill.style.width = `${progress}%`;
        document.getElementById('viewProjectProgressText').textContent = `${progress}% complete`;

        ModalManager.show('viewProjectModal');
    }

    editProject(id) {
        MessageManager.info('Edit project functionality will be implemented with backend integration');
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