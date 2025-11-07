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
    if (!formData.position) errors.push('Position is required');
    if (!formData.quantity || formData.quantity < 1) errors.push('Valid quantity is required');
    if (!formData.skills || formData.skills.length === 0) errors.push('Skills are required');
    if (!formData.startDate) errors.push('Start date is required');
    if (!formData.duration) errors.push('Duration is required');
    
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

    async cancelRequest(requestId) {
        console.log('Cancelling request:', requestId);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true };
    }
}

// ============================================
// RESOURCE REQUESTS APP
// ============================================

class ResourceRequestsApp {
    constructor() {
        this.dataService = new PMDataService();
        this.allRequests = [];
        this.currentRequestId = null;
    }

    async init() {
        this.setupEventListeners();
        await this.loadRequests();
    }

    setupEventListeners() {
        document.getElementById('newRequestBtn')?.addEventListener('click', () => {
            this.openNewRequestModal();
        });

        document.getElementById('closeRequestModal')?.addEventListener('click', () => {
            ModalManager.hide('newRequestModal');
        });

        document.getElementById('cancelFormBtn')?.addEventListener('click', () => {
            ModalManager.hide('newRequestModal');
        });

        document.getElementById('closeDetailModal')?.addEventListener('click', () => {
            ModalManager.hide('requestDetailModal');
        });

        document.getElementById('closeDetailBtn')?.addEventListener('click', () => {
            ModalManager.hide('requestDetailModal');
        });

        document.getElementById('requestForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitRequest();
        });

        document.getElementById('requestStatusFilter')?.addEventListener('change', () => {
            this.filterRequests();
        });

        document.getElementById('cancelCancelRequest')?.addEventListener('click', () => {
            ModalManager.hide('cancelRequestModal');
        });

        document.getElementById('confirmCancelRequest')?.addEventListener('click', () => {
            this.confirmCancelRequest();
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            ModalManager.show('logoutModal');
        });

        document.getElementById('cancelLogout')?.addEventListener('click', () => {
            ModalManager.hide('logoutModal');
        });

        document.getElementById('confirmLogout')?.addEventListener('click', () => {
            this.handleLogout();
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        const startDateInput = document.getElementById('startDateInput');
        if (startDateInput) {
            const today = new Date().toISOString().split('T')[0];
            startDateInput.min = today;
        }
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

        container.innerHTML = '';
        
        requests.forEach(req => {
            const card = this.createRequestCard(req);
            container.appendChild(card);
        });
    }

    createRequestCard(req) {
        const card = document.createElement('div');
        card.className = 'request-card';
        card.dataset.requestId = req.id;

        const header = document.createElement('div');
        header.className = 'request-card-header';
        
        const headerContent = document.createElement('div');
        
        const title = document.createElement('h4');
        title.textContent = `${req.position} - ${req.project}`;
        
        const meta = document.createElement('div');
        meta.className = 'request-card-meta';
        meta.innerHTML = `
            <span><i class="fas fa-calendar"></i> Submitted: ${formatDate(req.submittedDate)}</span>
            <span><i class="fas fa-users"></i> Quantity: ${req.quantity}</span>
            <span><i class="fas fa-flag"></i> Priority: ${capitalize(req.priority)}</span>
        `;
        
        headerContent.appendChild(title);
        headerContent.appendChild(meta);
        
        const statusBadge = document.createElement('span');
        statusBadge.className = `request-status ${req.status}`;
        statusBadge.textContent = formatStatus(req.status);
        
        header.appendChild(headerContent);
        header.appendChild(statusBadge);

        const details = document.createElement('div');
        details.className = 'request-details';
        
        const skillsItem = document.createElement('div');
        skillsItem.className = 'detail-item';
        skillsItem.innerHTML = '<strong>Required Skills</strong>';
        
        const skillsTags = document.createElement('div');
        skillsTags.className = 'skills-tags';
        skillsTags.style.marginTop = '4px';
        req.skills.forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.textContent = skill;
            skillsTags.appendChild(tag);
        });
        skillsItem.appendChild(skillsTags);
        
        const experienceItem = document.createElement('div');
        experienceItem.className = 'detail-item';
        experienceItem.innerHTML = `<strong>Experience Level</strong>${req.experience}`;
        
        const startDateItem = document.createElement('div');
        startDateItem.className = 'detail-item';
        startDateItem.innerHTML = `<strong>Start Date</strong>${formatDate(req.startDate)}`;
        
        const durationItem = document.createElement('div');
        durationItem.className = 'detail-item';
        durationItem.innerHTML = `<strong>Duration</strong>${req.duration}`;
        
        details.appendChild(skillsItem);
        details.appendChild(experienceItem);
        details.appendChild(startDateItem);
        details.appendChild(durationItem);

        card.appendChild(header);
        card.appendChild(details);

        if (req.status === 'pending') {
            const actions = document.createElement('div');
            actions.style.marginTop = '12px';
            actions.style.display = 'flex';
            actions.style.gap = '8px';
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn-view';
            viewBtn.style.flex = '1';
            viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Details';
            viewBtn.addEventListener('click', () => this.viewRequestDetail(req.id));
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-edit';
            cancelBtn.style.flex = '1';
            cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
            cancelBtn.addEventListener('click', () => this.cancelRequest(req.id));
            
            actions.appendChild(viewBtn);
            actions.appendChild(cancelBtn);
            card.appendChild(actions);
        }

        return card;
    }

    filterRequests() {
        const status = document.getElementById('requestStatusFilter').value;
        
        let filtered = this.allRequests.filter(req => {
            return !status || req.status === status;
        });

        this.renderRequests(filtered);
    }

    openNewRequestModal() {
        const form = document.getElementById('requestForm');
        if (form) {
            form.reset();
        }
        ModalManager.show('newRequestModal');
    }

    async submitRequest() {
        const formData = {
            project: document.getElementById('projectSelect').value,
            position: document.getElementById('positionInput').value,
            quantity: parseInt(document.getElementById('quantityInput').value),
            priority: document.getElementById('prioritySelect').value,
            skills: document.getElementById('skillsInput').value.split(',').map(s => s.trim()).filter(s => s),
            experience: document.getElementById('experienceSelect').value,
            duration: document.getElementById('durationInput').value,
            startDate: document.getElementById('startDateInput').value,
            endDate: document.getElementById('endDateInput').value || null,
            description: document.getElementById('descriptionInput').value
        };

        const validation = validateRequestForm(formData);
        
        if (!validation.isValid) {
            MessageManager.error(validation.errors.join('\n'));
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

    viewRequestDetail(requestId) {
        const request = this.allRequests.find(r => r.id === requestId);
        
        if (!request) {
            MessageManager.error('Request not found');
            return;
        }

        const detailBody = document.getElementById('requestDetailBody');
        if (!detailBody) return;

        detailBody.innerHTML = '';

        const container = document.createElement('div');
        container.style.padding = '10px 0';

        const title = document.createElement('h3');
        title.style.marginBottom = '15px';
        title.style.fontSize = '18px';
        title.textContent = `${request.position} - ${request.project}`;
        container.appendChild(title);

        const infoSection = document.createElement('div');
        infoSection.style.marginBottom = '15px';
        infoSection.innerHTML = `
            <p style="margin-bottom: 8px;"><strong>Status:</strong> 
                <span class="request-status ${request.status}" style="margin-left: 8px;">
                    ${formatStatus(request.status)}
                </span>
            </p>
            <p style="margin-bottom: 8px;"><strong>Quantity:</strong> ${request.quantity} person(s)</p>
            <p style="margin-bottom: 8px;"><strong>Priority:</strong> ${capitalize(request.priority)}</p>
            <p style="margin-bottom: 8px;"><strong>Experience Level:</strong> ${request.experience}</p>
            <p style="margin-bottom: 8px;"><strong>Start Date:</strong> ${formatDate(request.startDate)}</p>
            <p style="margin-bottom: 8px;"><strong>Duration:</strong> ${request.duration}</p>
            <p style="margin-bottom: 8px;"><strong>Submitted:</strong> ${formatDate(request.submittedDate)}</p>
        `;
        container.appendChild(infoSection);

        const skillsSection = document.createElement('div');
        skillsSection.style.marginTop = '15px';
        skillsSection.innerHTML = '<strong>Required Skills:</strong>';
        
        const skillsTags = document.createElement('div');
        skillsTags.className = 'skills-tags';
        skillsTags.style.marginTop = '8px';
        request.skills.forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.textContent = skill;
            skillsTags.appendChild(tag);
        });
        skillsSection.appendChild(skillsTags);
        container.appendChild(skillsSection);

        if (request.description) {
            const descSection = document.createElement('div');
            descSection.style.marginTop = '15px';
            descSection.innerHTML = '<strong>Additional Details:</strong>';
            
            const descText = document.createElement('p');
            descText.style.marginTop = '8px';
            descText.style.color = 'var(--text-secondary)';
            descText.style.lineHeight = '1.6';
            descText.textContent = request.description;
            
            descSection.appendChild(descText);
            container.appendChild(descSection);
        }

        detailBody.appendChild(container);
        ModalManager.show('requestDetailModal');
    }

    cancelRequest(requestId) {
        this.currentRequestId = requestId;
        ModalManager.show('cancelRequestModal');
    }

    async confirmCancelRequest() {
        if (!this.currentRequestId) return;

        try {
            ModalManager.hide('cancelRequestModal');
            ModalManager.showLoading();
            
            await this.dataService.cancelRequest(this.currentRequestId);
            
            ModalManager.hideLoading();
            MessageManager.success('Request cancelled successfully');
            this.currentRequestId = null;
            await this.loadRequests();
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error cancelling request:', error);
            MessageManager.error('Failed to cancel request');
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