// PROJECT MANAGER (PM) Resource Requests.js
import { supabase } from "../../supabaseClient.js";

// ============================================
// USER NAME DISPLAY UTILITY
// ============================================

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
        } else if (!userAvatarElement) {
            console.warn('[USER DISPLAY] user-avatar element not found in the DOM');
        }
    } catch (error) {
        console.error('[USER DISPLAY] Error updating user name:', error);
        if (userNameElement) {
            userNameElement.textContent = 'Project Manager';
        }
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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'fulfilled': 'Fulfilled',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

function calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return 'N/A';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
}

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
            console.log('[PM DATA SERVICE] Resource requests fetched:', data);
            return data || [];
        } catch (error) {
            console.error('[PM DATA SERVICE] Error fetching resource requests:', error);
            return [];
        }
    }

    async createResourceRequest(requestData) {
        try {
            // First, create project requirements
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

            // Create resource request
            const { data: request, error: requestError } = await supabase
                .from('resource_requests')
                .insert({
                    project_id: requestData.projectId,
                    requirement_id: requirementIds[0], // Link to first requirement
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

            console.log('[PM DATA SERVICE] Resource request created:', request);
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
            
            // Initialize data service first
            await this.dataService.initialize();

            // IMPORTANT: Call with await since it's async
            await updateUserNameDisplayEnhanced();
            
            this.setupEventListeners();
            await this.loadProjects();
            await this.loadRequests();
            
            ModalManager.hideLoading();
            
            console.log('[RESOURCE REQUESTS APP] Initialization complete');
        } catch (error) {
            ModalManager.hideLoading();
            console.error('[RESOURCE REQUESTS APP] Initialization error:', error);
            MessageManager.error('Failed to initialize. Please login again.');
            setTimeout(() => {
                window.location.href = "/login/HTML_Files/login.html";
            }, 2000);
        }
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        // New request button
        const newRequestBtn = document.getElementById('newRequestBtn');
        if (newRequestBtn) {
            newRequestBtn.addEventListener('click', () => this.openNewRequestModal());
        }

        // Status filter
        const statusFilter = document.getElementById('requestStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterRequests());
        }

        // New request modal
        const closeRequestModal = document.getElementById('closeRequestModal');
        const cancelFormBtn = document.getElementById('cancelFormBtn');
        const requestForm = document.getElementById('requestForm');

        if (closeRequestModal) {
            closeRequestModal.addEventListener('click', () => ModalManager.hide('newRequestModal'));
        }
        if (cancelFormBtn) {
            cancelFormBtn.addEventListener('click', () => ModalManager.hide('newRequestModal'));
        }
        if (requestForm) {
            requestForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitRequest();
            });
        }

        // Add resource button
        const addResourceBtn = document.getElementById('addResourceBtn');
        if (addResourceBtn) {
            addResourceBtn.addEventListener('click', () => this.addResourceRow());
        }

        // Detail modal
        const closeDetailModal = document.getElementById('closeDetailModal');
        const closeDetailBtn = document.getElementById('closeDetailBtn');
        
        if (closeDetailModal) {
            closeDetailModal.addEventListener('click', () => ModalManager.hide('requestDetailModal'));
        }
        if (closeDetailBtn) {
            closeDetailBtn.addEventListener('click', () => ModalManager.hide('requestDetailModal'));
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

        // View request buttons (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-view')) {
                const card = e.target.closest('.request-card');
                if (card) {
                    const requestId = parseInt(card.dataset.id);
                    this.viewRequestDetail(requestId);
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

        projectSelect.innerHTML = '<option value="">Select a project</option>';
        
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = `${project.name} - ${project.status}`;
            option.dataset.endDate = project.end_date || '';
            option.dataset.startDate = project.start_date || '';
            projectSelect.appendChild(option);
        });

        // Add change listener to auto-fill end dates
        projectSelect.addEventListener('change', (e) => {
            this.onProjectSelected(e.target.value);
        });
    }

    onProjectSelected(projectId) {
        if (!projectId) {
            document.querySelectorAll('.resource-end-date').forEach(input => {
                input.value = '';
            });
            return;
        }

        const projectSelect = document.getElementById('projectSelect');
        const selectedOption = projectSelect.querySelector(`option[value="${projectId}"]`);
        
        if (selectedOption) {
            const projectEndDate = selectedOption.dataset.endDate;
            const projectStartDate = selectedOption.dataset.startDate;

            document.querySelectorAll('.resource-end-date').forEach(input => {
                if (projectEndDate) {
                    input.value = projectEndDate;
                }
            });

            document.querySelectorAll('.resource-start-date').forEach(input => {
                if (projectStartDate) {
                    input.min = projectStartDate;
                }
                if (projectEndDate) {
                    input.max = projectEndDate;
                }
            });

            document.querySelectorAll('.resource-end-date').forEach(input => {
                if (projectEndDate) {
                    input.max = projectEndDate;
                }
                if (projectStartDate) {
                    input.min = projectStartDate;
                }
            });
        }
    }

    async loadRequests() {
        try {
            const rawRequests = await this.dataService.getResourceRequests();
            const groupedRequests = this.groupRequestsByProject(rawRequests);
            this.allRequests = groupedRequests;
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
                const projectInfo = {
                    projectName: request.projects?.name || 'Unknown Project',
                    projectDescription: request.projects?.description || 'No description'
                };
                
                groups[groupKey] = {
                    id: request.id,
                    groupKey: groupKey,
                    projectInfo: projectInfo,
                    status: request.status,
                    requested_at: request.requested_at,
                    approved_at: request.approved_at,
                    start_date: request.start_date,
                    end_date: request.end_date,
                    duration_days: request.duration_days,
                    projects: {
                        name: projectInfo.projectName,
                        description: projectInfo.projectDescription
                    },
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
            groups[groupKey].totalQuantity += resourceInfo.quantity || 1;
        });
        
        return Object.values(groups);
    }

    renderRequests(requests) {
        const requestsList = document.getElementById('requestsList');
        if (!requestsList) return;

        requestsList.innerHTML = '';

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

        requests.forEach(request => {
            const card = this.createRequestCard(request);
            requestsList.appendChild(card);
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

        const projectName = card.querySelector('.request-project-name');
        if (projectName) {
            projectName.textContent = request.projectInfo?.projectName || request.projects?.name || 'Unknown Project';
        }

        const metaProject = card.querySelector('.meta-project');
        const metaDate = card.querySelector('.meta-date');
        const metaResources = card.querySelector('.meta-resources');

        if (metaProject) {
            metaProject.textContent = request.projectInfo?.projectName || request.projects?.name || 'N/A';
        }
        if (metaDate) {
            metaDate.textContent = formatDate(request.requested_at);
        }
        if (metaResources) {
            metaResources.textContent = `${request.totalQuantity} resource(s)`;
        }

        const statusElem = card.querySelector('.request-status');
        if (statusElem) {
            statusElem.textContent = formatStatus(request.status);
            statusElem.className = `request-status ${request.status}`;
        }

        const skillsContainer = card.querySelector('.skills-tags');
        if (skillsContainer && request.resources) {
            const allSkills = new Set();
            request.resources.forEach(resource => {
                if (resource.skills) {
                    resource.skills.forEach(skill => allSkills.add(skill));
                }
            });
            
            const skillsArray = Array.from(allSkills);
            if (skillsArray.length > 0) {
                skillsContainer.innerHTML = skillsArray.slice(0, 5).map(skill => 
                    `<span class="skill-tag">${skill}</span>`
                ).join('');
                
                if (skillsArray.length > 5) {
                    skillsContainer.innerHTML += `<span class="skill-tag">+${skillsArray.length - 5} more</span>`;
                }
            } else {
                skillsContainer.innerHTML = '<span class="skill-tag">No skills specified</span>';
            }
        }

        const timelineValue = card.querySelector('.timeline-value');
        if (timelineValue && request.resources && request.resources.length > 0) {
            timelineValue.textContent = request.resources[0].assignmentType || 'Full-Time';
        }

        const durationValue = card.querySelector('.duration-value');
        if (durationValue) {
            durationValue.textContent = calculateDuration(request.start_date, request.end_date);
        }

        const startDateValue = card.querySelector('.start-date-value');
        if (startDateValue) {
            startDateValue.textContent = formatDate(request.start_date);
        }

        const endDateValue = card.querySelector('.end-date-value');
        if (endDateValue) {
            endDateValue.textContent = formatDate(request.end_date);
        }

        return card;
    }

    filterRequests() {
        const status = document.getElementById('requestStatusFilter').value;
        let filteredRequests = this.allRequests;

        if (status) {
            filteredRequests = filteredRequests.filter(req => req.status === status);
        }

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
        if (title) {
            title.textContent = `Resource #${this.resourceRowCount}`;
        }

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
        if (projectSelect && projectSelect.value) {
            this.onProjectSelected(projectSelect.value);
        }
    }

    updateResourceRowTitles() {
        const rows = document.querySelectorAll('.resource-row');
        rows.forEach((row, index) => {
            const title = row.querySelector('.resource-row-title');
            if (title) {
                title.textContent = `Resource #${index + 1}`;
            }
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

            const skills = skillsInput.split(',').map(s => s.trim()).filter(s => s);

            resources.push({
                position,
                quantity,
                experienceLevel,
                assignmentType,
                skills,
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
        const start = new Date(firstResource.startDate);
        const end = new Date(firstResource.endDate);
        const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

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

        document.getElementById('detailProjectName').textContent = request.projectInfo?.projectName || request.projects?.name || 'Unknown Project';
        document.getElementById('detailProjectDesc').textContent = request.projectInfo?.projectDescription || request.projects?.description || 'No description';

        const statusElem = document.getElementById('detailStatus');
        statusElem.textContent = formatStatus(request.status);
        statusElem.className = `request-status ${request.status}`;

        document.getElementById('detailSubmitted').textContent = formatDate(request.requested_at);
        document.getElementById('detailStartDate').textContent = formatDate(request.start_date);
        document.getElementById('detailEndDate').textContent = formatDate(request.end_date);
        document.getElementById('detailDuration').textContent = calculateDuration(request.start_date, request.end_date);

        const approvedRow = document.getElementById('detailApprovedRow');
        if (request.approved_at) {
            approvedRow.style.display = 'flex';
            document.getElementById('detailApproved').textContent = formatDate(request.approved_at);
        } else {
            approvedRow.style.display = 'none';
        }

        const tbody = document.getElementById('requirementsTableBody');
        tbody.innerHTML = '';
        
        if (request.resources && request.resources.length > 0) {
            request.resources.forEach((resource, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
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
                `;
                tbody.appendChild(row);
            });
        }

        const notesText = request.resources && request.resources.length > 0 && request.resources[0].justification
            ? request.resources.map((r, i) => `Resource ${i + 1}: ${r.justification || 'No justification'}`).join('\n\n')
            : 'No additional notes';
        
        document.getElementById('detailNotes').textContent = notesText;

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
    app = new ResourceRequestsApp();
    app.init();
});