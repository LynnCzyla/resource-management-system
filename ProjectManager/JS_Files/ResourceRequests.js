// PROJECT MANAGER (PM) Resource Requests.js - OPTIMIZED
import { supabase } from "../../supabaseClient.js";

// ============================================
// USER NAME DISPLAY UTILITY
// ============================================

async function updateUserNameDisplayEnhanced() {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.querySelector('.user-avatar');
    
    if (!userNameElement) return;

    try {
        const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
        let displayName = loggedUser.name || '';
        
        if (!displayName && loggedUser.email) {
            try {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('name')
                    .eq('email', loggedUser.email)
                    .single();
                
                if (!error && userData?.name) {
                    displayName = userData.name;
                    loggedUser.name = displayName;
                    localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
                } else {
                    displayName = loggedUser.email.split('@')[0];
                }
            } catch {
                displayName = loggedUser.email.split('@')[0];
            }
        } else if (!displayName) {
            displayName = 'Project Manager';
        }
        
        userNameElement.textContent = displayName;
        
        if (userAvatarElement) {
            const initials = displayName.split(' ')
                .map(word => word.charAt(0).toUpperCase())
                .join('')
                .substring(0, 2);
            
            userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=000&color=fff`;
            userAvatarElement.alt = initials;
        }
    } catch (error) {
        console.error('[USER DISPLAY] Error:', error);
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
    static iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    static show(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

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
// UTILITY FUNCTIONS
// ============================================

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
};

const formatStatus = (status) => {
    const statusMap = {
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'fulfilled': 'Fulfilled',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
};

const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';
    const diffDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
};

// ============================================
// DATA SERVICE
// ============================================

class PMDataService {
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

        if (error) throw error;

        this.currentPMId = userData.id;
        console.log('[PM DATA SERVICE] Initialized for PM:', userData);
    }

    async getProjects() {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, description, status, start_date, end_date')
                .eq('created_by', this.currentPMId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[PM DATA SERVICE] Error fetching projects:', error);
            return [];
        }
    }

    async getResourceRequests() {
        try {
            const { data, error } = await supabase
                .from('resource_requests')
                .select(`
                    id,
                    status,
                    requested_at,
                    approved_at,
                    notes,
                    start_date,
                    end_date,
                    duration_days,
                    project_id,
                    projects (
                        id,
                        name,
                        description
                    ),
                    project_requirements (
                        id,
                        experience_level,
                        quantity_needed,
                        required_skills,
                        preferred_assignment_type
                    )
                `)
                .eq('requested_by', this.currentPMId)
                .order('requested_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[PM DATA SERVICE] Error fetching resource requests:', error);
            return [];
        }
    }

    async createResourceRequest(requestData) {
        try {
            const requirementIds = [];
            
            for (const resource of requestData.resources) {
                const { data: requirement, error: reqError } = await supabase
                    .from('project_requirements')
                    .insert({
                        project_id: requestData.projectId,
                        experience_level: resource.experienceLevel,
                        quantity_needed: resource.quantity,
                        required_skills: resource.skills,
                        preferred_assignment_type: resource.assignmentType
                    })
                    .select()
                    .single();

                if (reqError) throw reqError;
                requirementIds.push(requirement.id);
            }

            const { data: request, error: requestError } = await supabase
                .from('resource_requests')
                .insert({
                    project_id: requestData.projectId,
                    requirement_id: requirementIds[0],
                    requested_by: this.currentPMId,
                    status: 'pending',
                    notes: requestData.notes || null,
                    start_date: requestData.startDate,
                    end_date: requestData.endDate,
                    duration_days: requestData.durationDays
                })
                .select()
                .single();

            if (requestError) throw requestError;
            return request;
        } catch (error) {
            console.error('[PM DATA SERVICE] Error creating resource request:', error);
            throw error;
        }
    }
}

// ============================================
// RESOURCE REQUESTS APP
// ============================================

class ResourceRequestsApp {
    constructor() {
        this.dataService = new PMDataService();
        this.allRequests = [];
        this.projects = [];
        this.resourceRowCount = 0;
    }

    async init() {
        try {
            ModalManager.showLoading();
            
            await this.dataService.initialize();
            await updateUserNameDisplayEnhanced();
            
            this.setupEventListeners();
            
            // Parallel loading for better performance
            await Promise.all([
                this.loadProjects(),
                this.loadRequests()
            ]);
            
            ModalManager.hideLoading();
        } catch (error) {
            ModalManager.hideLoading();
            console.error('[RESOURCE REQUESTS APP] Initialization error:', error);
            MessageManager.error('Failed to initialize. Please login again.');
            setTimeout(() => window.location.href = "/login/HTML_Files/login.html", 2000);
        }
    }

    setupEventListeners() {
        const handlers = {
            logoutBtn: () => this.openLogoutModal(),
            newRequestBtn: () => this.openNewRequestModal(),
            requestStatusFilter: () => this.filterRequests(),
            closeRequestModal: () => ModalManager.hide('newRequestModal'),
            cancelFormBtn: () => ModalManager.hide('newRequestModal'),
            addResourceBtn: () => this.addResourceRow(),
            closeDetailModal: () => ModalManager.hide('requestDetailModal'),
            closeDetailBtn: () => ModalManager.hide('requestDetailModal'),
            cancelLogout: () => ModalManager.hide('logoutModal'),
            confirmLogout: () => this.handleLogout()
        };

        Object.entries(handlers).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = id === 'requestStatusFilter' ? 'change' : 'click';
                element.addEventListener(eventType, handler);
            }
        });

        const requestForm = document.getElementById('requestForm');
        if (requestForm) {
            requestForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitRequest();
            });
        }

        // Delegated event for view buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-view')) {
                const card = e.target.closest('.request-card');
                if (card) {
                    this.viewRequestDetail(parseInt(card.dataset.id));
                }
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

    async loadProjects() {
        try {
            this.projects = await this.dataService.getProjects();
            this.populateProjectDropdown();
        } catch (error) {
            console.error('[RESOURCE REQUESTS APP] Error loading projects:', error);
            MessageManager.error('Failed to load projects');
        }
    }

    populateProjectDropdown() {
        const projectSelect = document.getElementById('projectSelect');
        if (!projectSelect) return;

        projectSelect.innerHTML = '<option value="">Select a project</option>' + 
            this.projects.map(project => `
                <option value="${project.id}" 
                        data-end-date="${project.end_date || ''}" 
                        data-start-date="${project.start_date || ''}">
                    ${project.name} - ${project.status}
                </option>
            `).join('');

        projectSelect.addEventListener('change', (e) => this.onProjectSelected(e.target.value));
    }

    onProjectSelected(projectId) {
        if (!projectId) {
            document.querySelectorAll('.resource-end-date').forEach(input => input.value = '');
            return;
        }

        const projectSelect = document.getElementById('projectSelect');
        const selectedOption = projectSelect.querySelector(`option[value="${projectId}"]`);
        
        if (selectedOption) {
            const projectEndDate = selectedOption.dataset.endDate;
            const projectStartDate = selectedOption.dataset.startDate;

            document.querySelectorAll('.resource-end-date').forEach(input => {
                if (projectEndDate) input.value = projectEndDate;
                if (projectEndDate) input.max = projectEndDate;
                if (projectStartDate) input.min = projectStartDate;
            });

            document.querySelectorAll('.resource-start-date').forEach(input => {
                if (projectStartDate) input.min = projectStartDate;
                if (projectEndDate) input.max = projectEndDate;
            });
        }
    }

    async loadRequests() {
        try {
            const rawRequests = await this.dataService.getResourceRequests();
            this.allRequests = this.groupRequestsByProject(rawRequests);
            this.renderRequests(this.allRequests);
        } catch (error) {
            console.error('[RESOURCE REQUESTS APP] Error loading requests:', error);
            MessageManager.error('Failed to load resource requests');
        }
    }

    groupRequestsByProject(rawRequests) {
        const groups = {};
        
        rawRequests.forEach(request => {
            const groupKey = request.project_id;
            
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    id: request.id,
                    groupKey: groupKey,
                    projectInfo: {
                        projectName: request.projects?.name || 'Unknown Project',
                        projectDescription: request.projects?.description || 'No description'
                    },
                    status: request.status,
                    requested_at: request.requested_at,
                    approved_at: request.approved_at,
                    start_date: request.start_date,
                    end_date: request.end_date,
                    duration_days: request.duration_days,
                    projects: request.projects,
                    resources: [],
                    totalQuantity: 0
                };
            }
            
            const resourceInfo = {
                quantity: request.project_requirements?.quantity_needed || 1,
                experienceLevel: request.project_requirements?.experience_level || 'N/A',
                assignmentType: request.project_requirements?.preferred_assignment_type || 'Full-Time',
                skills: request.project_requirements?.required_skills || []
            };
            
            groups[groupKey].resources.push(resourceInfo);
            groups[groupKey].totalQuantity += resourceInfo.quantity;
        });
        
        return Object.values(groups);
    }

    renderRequests(requests) {
        const requestsList = document.getElementById('requestsList');
        if (!requestsList) return;

        if (requests.length === 0) {
            requestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No Resource Requests</h3>
                    <p>Create your first resource request to get started</p>
                </div>
            `;
            return;
        }

        requestsList.innerHTML = '';
        requests.forEach(request => {
            requestsList.appendChild(this.createRequestCard(request));
        });
    }

    createRequestCard(request) {
        const template = document.getElementById('requestCardTemplate');
        const card = document.createElement('div');
        card.className = 'request-card';
        card.dataset.id = request.id;
        card.dataset.groupKey = request.groupKey;
        card.dataset.status = request.status;
        card.innerHTML = template.innerHTML;

        const updates = {
            '.request-project-name': request.projectInfo?.projectName || request.projects?.name || 'Unknown Project',
            '.meta-project': request.projectInfo?.projectName || request.projects?.name || 'N/A',
            '.meta-date': formatDate(request.requested_at),
            '.meta-resources': `${request.totalQuantity} resource(s)`,
            '.timeline-value': request.resources?.[0]?.assignmentType || 'Full-Time',
            '.duration-value': calculateDuration(request.start_date, request.end_date),
            '.start-date-value': formatDate(request.start_date),
            '.end-date-value': formatDate(request.end_date)
        };

        Object.entries(updates).forEach(([selector, value]) => {
            const elem = card.querySelector(selector);
            if (elem) elem.textContent = value;
        });

        const statusElem = card.querySelector('.request-status');
        if (statusElem) {
            statusElem.textContent = formatStatus(request.status);
            statusElem.className = `request-status ${request.status}`;
        }

        const skillsContainer = card.querySelector('.skills-tags');
        if (skillsContainer && request.resources) {
            const allSkills = [...new Set(request.resources.flatMap(r => r.skills || []))];
            
            if (allSkills.length > 0) {
                skillsContainer.innerHTML = allSkills.slice(0, 5)
                    .map(skill => `<span class="skill-tag">${skill}</span>`)
                    .join('');
                
                if (allSkills.length > 5) {
                    skillsContainer.innerHTML += `<span class="skill-tag">+${allSkills.length - 5} more</span>`;
                }
            } else {
                skillsContainer.innerHTML = '<span class="skill-tag">No skills specified</span>';
            }
        }

        return card;
    }

    filterRequests() {
        const status = document.getElementById('requestStatusFilter').value;
        const filteredRequests = status 
            ? this.allRequests.filter(req => req.status === status)
            : this.allRequests;

        this.renderRequests(filteredRequests);
    }

    openNewRequestModal() {
        const form = document.getElementById('requestForm');
        if (form) form.reset();

        const container = document.getElementById('resourceRowsContainer');
        if (container) {
            container.innerHTML = '';
            this.resourceRowCount = 0;
        }

        this.addResourceRow();
        ModalManager.show('newRequestModal');
    }

    addResourceRow() {
        const template = document.getElementById('resourceRowTemplate');
        const container = document.getElementById('resourceRowsContainer');
        
        if (!template || !container) return;

        this.resourceRowCount++;
        
        const resourceRow = document.createElement('div');
        resourceRow.className = 'resource-row';
        resourceRow.dataset.rowId = this.resourceRowCount;
        resourceRow.innerHTML = template.innerHTML;

        const title = resourceRow.querySelector('.resource-row-title');
        if (title) title.textContent = `Resource #${this.resourceRowCount}`;

        if (this.resourceRowCount > 1) {
            const removeBtn = resourceRow.querySelector('.btn-remove-resource');
            if (removeBtn) {
                removeBtn.style.display = 'inline-flex';
                removeBtn.addEventListener('click', () => {
                    resourceRow.remove();
                    this.updateResourceRowTitles();
                });
            }
        }

        container.appendChild(resourceRow);

        const projectSelect = document.getElementById('projectSelect');
        if (projectSelect?.value) {
            this.onProjectSelected(projectSelect.value);
        }
    }

    updateResourceRowTitles() {
        const rows = document.querySelectorAll('.resource-row');
        rows.forEach((row, index) => {
            const title = row.querySelector('.resource-row-title');
            if (title) title.textContent = `Resource #${index + 1}`;
        });
        this.resourceRowCount = rows.length;
    }

    async submitRequest() {
        const projectId = document.getElementById('projectSelect').value;
        
        if (!projectId) {
            MessageManager.error('Please select a project');
            return;
        }

        const resourceRows = document.querySelectorAll('.resource-row');
        const resources = [];
        
        for (const row of resourceRows) {
            const position = row.querySelector('.resource-position').value.trim();
            const quantity = parseInt(row.querySelector('.resource-quantity').value);
            const experienceLevel = row.querySelector('.resource-skill-level').value;
            const assignmentType = row.querySelector('.resource-assignment-type').value;
            const skillsInput = row.querySelector('.resource-skills').value.trim();
            const startDate = row.querySelector('.resource-start-date').value;
            const endDate = row.querySelector('.resource-end-date').value;
            const justification = row.querySelector('.resource-justification').value.trim();

            if (!position || !skillsInput || !startDate || !endDate) {
                MessageManager.error('Please fill in all required fields for each resource');
                return;
            }

            resources.push({
                position,
                quantity,
                experienceLevel,
                assignmentType,
                skills: skillsInput.split(',').map(s => s.trim()).filter(s => s),
                startDate,
                endDate,
                justification
            });
        }

        if (resources.length === 0) {
            MessageManager.error('Please add at least one resource');
            return;
        }

        const firstResource = resources[0];
        const durationDays = Math.ceil(
            (new Date(firstResource.endDate) - new Date(firstResource.startDate)) / (1000 * 60 * 60 * 24)
        );

        const requestData = {
            projectId: parseInt(projectId),
            resources: resources,
            startDate: firstResource.startDate,
            endDate: firstResource.endDate,
            durationDays: durationDays,
            notes: resources.map(r => r.justification).filter(j => j).join('\n\n')
        };

        try {
            ModalManager.hide('newRequestModal');
            ModalManager.showLoading();

            await this.dataService.createResourceRequest(requestData);
            await this.loadRequests();

            ModalManager.hideLoading();
            MessageManager.success('Resource request submitted successfully!');
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error submitting request:', error);
            MessageManager.error('Failed to submit request: ' + error.message);
        }
    }

    viewRequestDetail(requestId) {
        const request = this.allRequests.find(r => r.id === requestId);
        if (!request) return;

        const detailUpdates = {
            detailProjectName: request.projectInfo?.projectName || request.projects?.name || 'Unknown Project',
            detailProjectDesc: request.projectInfo?.projectDescription || request.projects?.description || 'No description',
            detailSubmitted: formatDate(request.requested_at),
            detailStartDate: formatDate(request.start_date),
            detailEndDate: formatDate(request.end_date),
            detailDuration: calculateDuration(request.start_date, request.end_date),
            detailNotes: request.resources?.map((r, i) => 
                `Resource ${i + 1}: ${r.justification || 'No justification'}`
            ).join('\n\n') || 'No additional notes'
        };

        Object.entries(detailUpdates).forEach(([id, value]) => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = value;
        });

        const statusElem = document.getElementById('detailStatus');
        if (statusElem) {
            statusElem.textContent = formatStatus(request.status);
            statusElem.className = `request-status ${request.status}`;
        }

        const approvedRow = document.getElementById('detailApprovedRow');
        if (request.approved_at) {
            approvedRow.style.display = 'flex';
            document.getElementById('detailApproved').textContent = formatDate(request.approved_at);
        } else {
            approvedRow.style.display = 'none';
        }

        const tbody = document.getElementById('requirementsTableBody');
        tbody.innerHTML = (request.resources || []).map(resource => `
            <tr>
                <td>${resource.quantity || 1}</td>
                <td><span class="experience-badge ${resource.experienceLevel}">${resource.experienceLevel || 'N/A'}</span></td>
                <td>${resource.assignmentType || 'Full-Time'}</td>
                <td>
                    <div class="skills-tags">
                        ${(resource.skills || []).map(skill => 
                            `<span class="skill-tag">${skill}</span>`
                        ).join('')}
                    </div>
                </td>
            </tr>
        `).join('');

        ModalManager.show('requestDetailModal');
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
    app = new ResourceRequestsApp();
    app.init();
});