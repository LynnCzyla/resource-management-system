// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatStatus(status) {
    return status.split('-').map(word => capitalize(word)).join(' ');
}

function validateRequestForm(formData) {
    const errors = [];
    
    if (!formData.project) errors.push('Project is required');
    if (!formData.resources || formData.resources.length === 0) errors.push('At least one resource is required');
    
    formData.resources.forEach((resource, index) => {
        const resourceNum = index + 1;
        if (!resource.position) errors.push(`Resource ${resourceNum}: Position is required`);
        if (!resource.skills || resource.skills.length === 0) errors.push(`Resource ${resourceNum}: Skills are required`);
        if (!resource.startDate) errors.push(`Resource ${resourceNum}: Start date is required`);
        if (!resource.endDate) errors.push(`Resource ${resourceNum}: End date is required`);
        if (!resource.duration) errors.push(`Resource ${resourceNum}: Duration is required`);
        if (!resource.hoursPerDay && !resource.totalHours) errors.push(`Resource ${resourceNum}: Hours required is required`);
    });
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function generateId() {
    return 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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
// MOCK DATA
// ============================================

function getMockProjects() {
    return [
        {
            id: 'PROJ001',
            name: 'Customer Portal Redesign',
            status: 'active'
        },
        {
            id: 'PROJ002',
            name: 'Mobile App Development',
            status: 'planning'
        },
        {
            id: 'PROJ003',
            name: 'API Integration',
            status: 'active'
        }
    ];
}

function getMockRequests() {
    return [
        {
            id: 'REQ001',
            project: 'Customer Portal Redesign',
            position: 'Frontend Developer',
            quantity: 2,
            skills: ['React', 'TypeScript', 'CSS'],
            experience: 'Intermediate',
            skillLevel: 'Intermediate',
            priority: 'high',
            startDate: '2025-11-15',
            endDate: '2026-05-15',
            duration: '6 months',
            hoursPerDay: 8,
            status: 'pending',
            submittedDate: '2025-10-20',
            justification: 'Need experienced frontend developers for portal redesign'
        },
        {
            id: 'REQ002',
            project: 'Mobile App Development',
            position: 'Mobile Developer',
            quantity: 1,
            skills: ['React Native', 'Swift', 'Kotlin'],
            experience: 'Advanced',
            skillLevel: 'Advanced',
            priority: 'medium',
            startDate: '2025-12-01',
            endDate: '2026-08-01',
            duration: '8 months',
            hoursPerDay: 8,
            status: 'approved',
            submittedDate: '2025-10-18',
            justification: 'Senior mobile developer for cross-platform app'
        },
        {
            id: 'REQ003',
            project: 'API Integration',
            position: 'Backend Developer',
            quantity: 1,
            skills: ['Node.js', 'REST API', 'PostgreSQL'],
            experience: 'Intermediate',
            skillLevel: 'Intermediate',
            priority: 'high',
            startDate: '2025-11-05',
            endDate: '2026-02-05',
            duration: '3 months',
            hoursPerDay: 8,
            status: 'pending',
            submittedDate: '2025-10-25',
            justification: 'Backend developer for API integration project'
        }
    ];
}

// ============================================
// DATA SERVICE
// ============================================

class PMDataService {
    constructor() {
        this.currentPMId = 'PM001';
    }

    async getProjects() {
        return getMockProjects();
    }

    async getRequests() {
        return getMockRequests();
    }

    async submitRequest(requestData) {
        console.log('Submitting request:', requestData);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { 
            success: true, 
            id: generateId(),
            message: 'Request submitted successfully'
        };
    }
}

// ============================================
// RESOURCE ROW MANAGER
// ============================================

class ResourceRowManager {
    constructor() {
        this.rowCounter = 0;
        this.container = null;
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        this.addResourceRow(); // Add first row by default
    }

    addResourceRow() {
        if (!this.container) return;

        this.rowCounter++;
        const rowId = `resource-row-${this.rowCounter}`;

        const rowElement = document.createElement('div');
        rowElement.className = 'resource-row';
        rowElement.id = rowId;
        rowElement.dataset.rowId = this.rowCounter;

        rowElement.innerHTML = `
            <div class="resource-row-header">
                <h3 class="resource-row-title">Resource #${this.rowCounter}</h3>
                ${this.rowCounter > 1 ? `
                    <button type="button" class="btn-remove-resource" data-row-id="${this.rowCounter}">
                        <i class="fas fa-times"></i> Remove
                    </button>
                ` : ''}
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="positionInput-${this.rowCounter}">Position/Role *</label>
                    <input type="text" id="positionInput-${this.rowCounter}" 
                           class="resource-position" 
                           placeholder="e.g., Frontend Developer" required>
                </div>
                <div class="form-group">
                    <label for="skillLevelSelect-${this.rowCounter}">Skill Level *</label>
                    <select id="skillLevelSelect-${this.rowCounter}" class="resource-skill-level" required>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate" selected>Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label for="skillsInput-${this.rowCounter}">Required Skills *</label>
                <input type="text" id="skillsInput-${this.rowCounter}" 
                       class="resource-skills"
                       placeholder="e.g., React, TypeScript, CSS (comma separated)" required>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="durationInput-${this.rowCounter}">Duration *</label>
                    <input type="text" id="durationInput-${this.rowCounter}" 
                           class="resource-duration"
                           placeholder="e.g., 3 months" required>
                </div>
                <div class="form-group">
                    <label for="startDateInput-${this.rowCounter}">Start Date *</label>
                    <input type="date" id="startDateInput-${this.rowCounter}" 
                           class="resource-start-date" required>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="endDateInput-${this.rowCounter}">End Date *</label>
                    <input type="date" id="endDateInput-${this.rowCounter}" 
                           class="resource-end-date" required>
                </div>
            </div>

            <div class="form-group">
                <label for="hoursRequired-${this.rowCounter}">Hours Required *</label>
                <div class="hours-options">
                    <label class="radio-option">
                        <input type="radio" name="hoursType-${this.rowCounter}" 
                               value="daily" 
                               class="resource-hours-type" 
                               data-row-id="${this.rowCounter}" 
                               checked>
                        <span>Hours per Day:</span>
                        <input type="number" id="hoursPerDay-${this.rowCounter}" 
                               class="hours-input resource-hours-per-day" 
                               min="1" max="8" value="8">
                        <small>hours/day (max 8)</small>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="hoursType-${this.rowCounter}" 
                               value="total" 
                               class="resource-hours-type" 
                               data-row-id="${this.rowCounter}">
                        <span>Total Hours:</span>
                        <input type="number" id="totalHours-${this.rowCounter}" 
                               class="hours-input resource-total-hours" 
                               min="1" disabled>
                        <small>total hours</small>
                    </label>
                </div>
            </div>

            <div class="form-group">
                <label for="justificationInput-${this.rowCounter}">Justification / Requirements</label>
                <textarea id="justificationInput-${this.rowCounter}" 
                          class="resource-justification"
                          rows="3" 
                          placeholder="Why do you need this resource? Provide details about the work they will be doing..."></textarea>
            </div>
        `;

        this.container.appendChild(rowElement);

        // Set min date for date inputs
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = rowElement.querySelector('.resource-start-date');
        const endDateInput = rowElement.querySelector('.resource-end-date');
        if (startDateInput) startDateInput.min = today;
        if (endDateInput) endDateInput.min = today;

        // Add event listeners for hours type radio buttons
        this.setupHoursTypeListeners(rowId);

        // Add event listener for remove button
        if (this.rowCounter > 1) {
            const removeBtn = rowElement.querySelector('.btn-remove-resource');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => this.removeResourceRow(this.rowCounter));
            }
        }

        this.updateRowNumbers();
    }

    setupHoursTypeListeners(rowId) {
        const row = document.getElementById(rowId);
        if (!row) return;

        const radioButtons = row.querySelectorAll('.resource-hours-type');
        const dailyInput = row.querySelector('.resource-hours-per-day');
        const totalInput = row.querySelector('.resource-total-hours');

        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'daily') {
                    dailyInput.disabled = false;
                    totalInput.disabled = true;
                    totalInput.value = '';
                } else {
                    dailyInput.disabled = true;
                    totalInput.disabled = false;
                }
            });
        });
    }

    removeResourceRow(rowId) {
        const row = document.getElementById(`resource-row-${rowId}`);
        if (row) {
            row.remove();
            this.updateRowNumbers();
        }
    }

    updateRowNumbers() {
        const rows = this.container.querySelectorAll('.resource-row');
        rows.forEach((row, index) => {
            const title = row.querySelector('.resource-row-title');
            if (title) {
                title.textContent = `Resource #${index + 1}`;
            }
        });
    }

    getResourcesData() {
        const rows = this.container.querySelectorAll('.resource-row');
        const resources = [];

        rows.forEach((row) => {
            const hoursType = row.querySelector('.resource-hours-type:checked')?.value;
            
            const resource = {
                position: row.querySelector('.resource-position')?.value || '',
                skillLevel: row.querySelector('.resource-skill-level')?.value || '',
                skills: (row.querySelector('.resource-skills')?.value || '').split(',').map(s => s.trim()).filter(s => s),
                duration: row.querySelector('.resource-duration')?.value || '',
                startDate: row.querySelector('.resource-start-date')?.value || '',
                endDate: row.querySelector('.resource-end-date')?.value || '',
                hoursType: hoursType,
                hoursPerDay: hoursType === 'daily' ? row.querySelector('.resource-hours-per-day')?.value : null,
                totalHours: hoursType === 'total' ? row.querySelector('.resource-total-hours')?.value : null,
                justification: row.querySelector('.resource-justification')?.value || ''
            };

            resources.push(resource);
        });

        return resources;
    }

    reset() {
        this.container.innerHTML = '';
        this.rowCounter = 0;
        this.addResourceRow();
    }
}

// ============================================
// RESOURCE REQUESTS APP
// ============================================

class ResourceRequestsApp {
    constructor() {
        this.dataService = new PMDataService();
        this.resourceRowManager = new ResourceRowManager();
        this.allRequests = [];
    }

    async init() {
        this.resourceRowManager.init('resourceRowsContainer');
        this.setupEventListeners();
        await this.loadRequests();
    }

    setupEventListeners() {
        // New request button
        document.getElementById('newRequestBtn')?.addEventListener('click', () => {
            this.openNewRequestModal();
        });

        // Close request modal
        document.getElementById('closeRequestModal')?.addEventListener('click', () => {
            ModalManager.hide('newRequestModal');
        });

        document.getElementById('cancelFormBtn')?.addEventListener('click', () => {
            ModalManager.hide('newRequestModal');
        });

        // Add resource button
        document.getElementById('addResourceBtn')?.addEventListener('click', () => {
            this.resourceRowManager.addResourceRow();
        });

        // Request form submit
        document.getElementById('requestForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitRequest();
        });

        // Status filter
        document.getElementById('requestStatusFilter')?.addEventListener('change', () => {
            this.filterRequests();
        });

        // View details buttons (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-view')) {
                MessageManager.info('Request details view functionality');
            }
        });

        // Close detail modal
        document.getElementById('closeDetailModal')?.addEventListener('click', () => {
            ModalManager.hide('requestDetailModal');
        });

        document.getElementById('closeDetailBtn')?.addEventListener('click', () => {
            ModalManager.hide('requestDetailModal');
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            ModalManager.show('logoutModal');
        });

        document.getElementById('cancelLogout')?.addEventListener('click', () => {
            ModalManager.hide('logoutModal');
        });

        document.getElementById('confirmLogout')?.addEventListener('click', () => {
            this.handleLogout();
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

    async loadRequests() {
        try {
            ModalManager.showLoading();
            
            this.allRequests = await this.dataService.getRequests();
            const projects = await this.dataService.getProjects();
            
            this.populateProjectSelect(projects);
            this.renderRequests(this.allRequests);
            
            ModalManager.hideLoading();
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error loading requests:', error);
            MessageManager.error('Failed to load requests');
        }
    }

    populateProjectSelect(projects) {
        const projectSelect = document.getElementById('projectSelect');
        if (!projectSelect) return;

        const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'planning');
        
        projectSelect.innerHTML = '<option value="">Select a project</option>' + 
            activeProjects.map(proj => 
                `<option value="${proj.id}">${proj.name}</option>`
            ).join('');
    }

    renderRequests(requests) {
        const container = document.getElementById('requestsList');
        if (!container) return;

        if (requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No Requests Found</h3>
                    <p>Submit a new resource request to get started</p>
                </div>
            `;
            return;
        }

        // Requests are already in HTML, this would update them dynamically
        // For now, keeping the static HTML
    }

    filterRequests() {
        const status = document.getElementById('requestStatusFilter')?.value;
        const cards = document.querySelectorAll('.request-card');

        cards.forEach(card => {
            const cardStatus = card.querySelector('.request-status')?.classList[1];
            
            if (!status || cardStatus === status) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    openNewRequestModal() {
        const form = document.getElementById('requestForm');
        if (form) {
            form.reset();
        }

        // Reset resource rows
        this.resourceRowManager.reset();

        ModalManager.show('newRequestModal');
    }

    async submitRequest() {
        const resources = this.resourceRowManager.getResourcesData();
        
        const formData = {
            project: document.getElementById('projectSelect').value,
            priority: document.getElementById('prioritySelect').value,
            resources: resources
        };

        const validation = validateRequestForm(formData);
        
        if (!validation.isValid) {
            MessageManager.error(validation.errors[0]); // Show first error
            return;
        }

        try {
            ModalManager.hide('newRequestModal');
            ModalManager.showLoading();
            
            const result = await this.dataService.submitRequest(formData);
            
            if (result.success) {
                ModalManager.hideLoading();
                MessageManager.success('Resource request submitted successfully!');
                await this.loadRequests();
            }
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error submitting request:', error);
            MessageManager.error('Failed to submit request');
        }
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
    app = new ResourceRequestsApp();
    app.init();
});