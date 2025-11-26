// newproject-modal.js 
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

function calculateDurationDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
// RESOURCE ROW MANAGER
// ============================================

class ResourceRowManager {
    constructor() {
        this.rowCounter = 0;
        this.container = null;
        this.template = null;
    }

    init(containerId) {
        this.container = document.getElementById(containerId);
        this.template = document.getElementById('projectResourceRowTemplate');
        if (this.container) {
            this.addResourceRow();
        }
    }

    addResourceRow() {
        if (!this.container || !this.template) return;

        this.rowCounter++;
        const rowId = `project-resource-row-${this.rowCounter}`;

        const rowElement = document.createElement('div');
        rowElement.className = 'project-resource-row';
        rowElement.id = rowId;
        rowElement.dataset.rowId = this.rowCounter;
        rowElement.innerHTML = this.template.innerHTML;

        const titleText = rowElement.querySelector('.resource-title-text');
        if (titleText) {
            titleText.textContent = `Resource Requirement #${this.rowCounter}`;
        }

        this.container.appendChild(rowElement);

        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = rowElement.querySelector('.project-resource-start-date');
        const endDateInput = rowElement.querySelector('.project-resource-end-date');
        if (startDateInput) startDateInput.min = today;
        if (endDateInput) endDateInput.min = today;

        if (this.rowCounter > 1) {
            const removeBtn = rowElement.querySelector('.project-btn-remove-resource');
            if (removeBtn) {
                removeBtn.style.display = '';
                removeBtn.addEventListener('click', () => this.removeResourceRow(this.rowCounter));
            }
        } else {
            const removeBtn = rowElement.querySelector('.project-btn-remove-resource');
            if (removeBtn) removeBtn.style.display = 'none';
        }

        this.updateRowNumbers();
    }

    removeResourceRow(rowId) {
        const row = document.getElementById(`project-resource-row-${rowId}`);
        if (row) {
            row.remove();
            this.updateRowNumbers();
        }
    }

    updateRowNumbers() {
        const rows = this.container.querySelectorAll('.project-resource-row');
        rows.forEach((row, index) => {
            const titleText = row.querySelector('.resource-title-text');
            if (titleText) {
                titleText.textContent = `Resource Requirement #${index + 1}`;
            }
        });
    }

    getResourcesData() {
        const rows = this.container.querySelectorAll('.project-resource-row');
        const resources = [];

        rows.forEach((row) => {
            const resource = {
                position: row.querySelector('.project-resource-position')?.value || '',
                quantity: row.querySelector('.project-resource-quantity')?.value || '1',
                skillLevel: row.querySelector('.project-resource-skill-level')?.value || '',
                assignmentType: row.querySelector('.project-resource-assignment-type')?.value || '',
                skills: (row.querySelector('.project-resource-skills')?.value || '').split(',').map(s => s.trim()).filter(s => s),
                justification: row.querySelector('.project-resource-justification')?.value || ''
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
// PROJECT REQUEST SERVICE
// ============================================

class ProjectRequestService {
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
            .select('id, name, email, role')
            .eq('email', this.currentPMEmail)
            .eq('role', 'project_manager')
            .single();

        if (error) {
            console.error('[PROJECT REQUEST SERVICE] Error fetching PM user:', error);
            throw error;
        }

        this.currentPMId = userData.id;
        console.log('[PROJECT REQUEST SERVICE] Initialized for PM:', userData);
    }

    async createProjectRequest(requestData) {
        try {
            console.log('[PROJECT REQUEST SERVICE] Creating project request:', requestData);

            const durationDays = calculateDurationDays(requestData.startDate, requestData.endDate);

            // Store project metadata in the notes field as JSON
            const projectMetadata = {
                projectName: requestData.name,
                projectDescription: requestData.description,
                teamSize: requestData.teamSize,
                priority: requestData.priority,
                startDate: requestData.startDate,
                endDate: requestData.endDate,
                durationDays: durationDays
            };

            // FIX: Generate ONE requestGroupId for ALL resources in this project request
            const requestGroupId = `PM${this.currentPMId}_${Date.now()}_GROUP`;
            
            console.log('[PROJECT REQUEST SERVICE] Using requestGroupId:', requestGroupId);

            // Create resource requests for each resource requirement
            const insertPromises = requestData.resources.map((resource, index) => {
                // Create resource request with embedded project info
                const resourceRequestData = {
                    project_id: null, // Will be set by RM when approving
                    requirement_id: null, // Will be created by RM
                    requested_by: this.currentPMId,
                    status: 'pending',
                    notes: JSON.stringify({
                        ...projectMetadata,
                        resourceDetails: {
                            position: resource.position,
                            quantity: parseInt(resource.quantity) || 1,
                            skillLevel: resource.skillLevel,
                            assignmentType: resource.assignmentType,
                            skills: resource.skills,
                            justification: resource.justification
                        },
                        requestGroupId: requestGroupId, // SAME for all resources!
                        resourceIndex: index,
                        totalResources: requestData.resources.length
                    }),
                    start_date: requestData.startDate,
                    end_date: requestData.endDate,
                    duration_days: durationDays
                };

                return supabase
                    .from('resource_requests')
                    .insert(resourceRequestData)
                    .select();
            });

            // Execute all inserts in parallel
            const results = await Promise.all(insertPromises);

            // Check for errors
            const hasError = results.some(result => result.error);
            if (hasError) {
                const firstError = results.find(r => r.error)?.error;
                console.error('[PROJECT REQUEST SERVICE] Error creating resource requests:', firstError);
                throw firstError;
            }

            const insertedRequests = results.map(r => r.data[0]);
            console.log('[PROJECT REQUEST SERVICE] Resource requests created:', insertedRequests);

            return { 
                success: true, 
                message: `Project request "${requestData.name}" submitted successfully! Waiting for Resource Manager approval.`,
                requestGroupId: requestGroupId,
                requestIds: insertedRequests.map(r => r.id)
            };
        } catch (error) {
            console.error('[PROJECT REQUEST SERVICE] Error creating project request:', error);
            throw error;
        }
    }
}

// ============================================
// NEW PROJECT MODAL CONTROLLER
// ============================================

class NewProjectModalController {
    constructor() {
        this.projectRequestService = new ProjectRequestService();
        this.resourceRowManager = new ResourceRowManager();
    }

    async initialize() {
        try {
            await this.projectRequestService.initialize();
            this.setupEventListeners();
            console.log('[NEW PROJECT MODAL] Initialized successfully');
        } catch (error) {
            console.error('[NEW PROJECT MODAL] Initialization error:', error);
            MessageManager.error('Failed to initialize. Please login again.');
        }
    }

    setupEventListeners() {
        // Open modal button
        const addProjectBtn = document.getElementById('addProjectBtn');
        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', () => this.openModal());
        }

        // Close modal buttons
        const closeModalBtn = document.getElementById('closeCreateProjectModal');
        const cancelBtn = document.getElementById('cancelCreateProjectBtn');
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeModal());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // Form submit
        const form = document.getElementById('createProjectForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitProjectRequest();
            });
        }

        // Add resource button
        const addResourceBtn = document.getElementById('addProjectResourceBtn');
        if (addResourceBtn) {
            addResourceBtn.addEventListener('click', () => this.resourceRowManager.addResourceRow());
        }

        // Date calculations
        const projectStartTime = document.getElementById('projectStartTime');
        const projectEndTime = document.getElementById('projectEndTime');
        const duration = document.getElementById('duration');

        if (projectStartTime && projectEndTime && duration) {
            const calculateDuration = () => {
                const start = projectStartTime.value;
                const end = projectEndTime.value;
                if (start && end) {
                    const days = calculateDurationDays(start, end);
                    if (days > 0) {
                        duration.value = days;
                    }
                }
            };

            projectStartTime.addEventListener('change', calculateDuration);
            projectEndTime.addEventListener('change', calculateDuration);
        }

        // Close on overlay click
        const modal = document.getElementById('createProjectModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    openModal() {
        const form = document.getElementById('createProjectForm');
        if (form) form.reset();
        
        // Initialize resource manager
        if (!this.resourceRowManager.container) {
            this.resourceRowManager.init('projectResourceRowsContainer');
        } else {
            this.resourceRowManager.reset();
        }
        
        // Set minimum dates to today
        const today = new Date().toISOString().split('T')[0];
        const projectStartTime = document.getElementById('projectStartTime');
        const projectEndTime = document.getElementById('projectEndTime');
        
        if (projectStartTime) projectStartTime.min = today;
        if (projectEndTime) projectEndTime.min = today;
        
        ModalManager.show('createProjectModal');
    }

    closeModal() {
        ModalManager.hide('createProjectModal');
    }

    async submitProjectRequest() {
        const resources = this.resourceRowManager.getResourcesData();
        
        const formData = {
            name: document.getElementById('projectName')?.value || '',
            description: document.getElementById('projectDescription')?.value || '',
            teamSize: document.getElementById('teamSize')?.value || '',
            duration: document.getElementById('duration')?.value || '',
            startDate: document.getElementById('projectStartTime')?.value || '',
            endDate: document.getElementById('projectEndTime')?.value || '',
            priority: document.getElementById('projectPriority')?.value || 'medium',
            resources: resources
        };

        // Validation
        const errors = [];
        
        if (!formData.name) errors.push('Project name is required');
        if (!formData.teamSize || formData.teamSize < 1) errors.push('Team size must be at least 1');
        if (!formData.duration || formData.duration < 1) errors.push('Duration must be at least 1 day');
        if (!formData.startDate) errors.push('Project start date is required');
        if (!formData.endDate) errors.push('Project end date is required');
        if (!formData.priority) errors.push('Priority is required');
        
        if (formData.startDate && formData.endDate) {
            if (new Date(formData.endDate) < new Date(formData.startDate)) {
                errors.push('End date must be after start date');
            }
        }
        
        if (!formData.resources || formData.resources.length === 0) {
            errors.push('At least one resource requirement is needed');
        }
        
        formData.resources.forEach((resource, index) => {
            const resourceNum = index + 1;
            if (!resource.position) errors.push(`Resource ${resourceNum}: Position is required`);
            if (!resource.quantity || resource.quantity < 1) errors.push(`Resource ${resourceNum}: Quantity must be at least 1`);
            if (!resource.skillLevel) errors.push(`Resource ${resourceNum}: Experience level is required`);
            if (!resource.assignmentType) errors.push(`Resource ${resourceNum}: Assignment type is required`);
            if (!resource.skills || resource.skills.length === 0) errors.push(`Resource ${resourceNum}: Skills are required`);
        });
        
        if (errors.length > 0) {
            MessageManager.error(errors[0]);
            return;
        }

        try {
            this.closeModal();
            ModalManager.showLoading();
            
            const result = await this.projectRequestService.createProjectRequest(formData);
            
            ModalManager.hideLoading();
            MessageManager.success(result.message);
            
            console.log('[NEW PROJECT MODAL] Request created with groupId:', result.requestGroupId);
            console.log('[NEW PROJECT MODAL] Request IDs:', result.requestIds);
            
            // Trigger refresh of resource requests page if available
            if (window.app && typeof window.app.loadProjects === 'function') {
                await window.app.loadProjects();
            }
        } catch (error) {
            ModalManager.hideLoading();
            console.error('[NEW PROJECT MODAL] Error creating project request:', error);
            MessageManager.error('Failed to create project request: ' + error.message);
        }
    }
}

// ============================================
// INITIALIZATION
// ============================================

let newProjectController;
document.addEventListener('DOMContentLoaded', () => {
    newProjectController = new NewProjectModalController();
    newProjectController.initialize();
    
    // Make it globally accessible
    window.newProjectController = newProjectController;
});