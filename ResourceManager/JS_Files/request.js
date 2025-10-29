// ============================================
// UTILITY FUNCTIONS
// ============================================

function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
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
// DATA SERVICE (In-Memory Storage)
// ============================================

class DataService {
    constructor() {
        this.requests = [];
        this.initializeMockData();
    }

    initializeMockData() {
        this.requests = [
            {
                id: 'REQ001',
                projectName: 'Project Zeta',
                requester: 'Michael Scott',
                department: 'Sales',
                position: 'Frontend Developer',
                skillsRequired: ['React', 'TypeScript', 'CSS'],
                experience: 'Mid-level (3-5 years)',
                quantity: 2,
                priority: 'High',
                startDate: '2025-11-15',
                duration: '6 months',
                status: 'pending',
                submittedDate: '2025-10-20'
            },
            {
                id: 'REQ002',
                projectName: 'Project Omega',
                requester: 'Dwight Schrute',
                department: 'Operations',
                position: 'Backend Developer',
                skillsRequired: ['Python', 'Django', 'PostgreSQL'],
                experience: 'Senior (5+ years)',
                quantity: 1,
                priority: 'Medium',
                startDate: '2025-12-01',
                duration: '4 months',
                status: 'pending',
                submittedDate: '2025-10-22'
            },
            {
                id: 'REQ003',
                projectName: 'Project Sigma',
                requester: 'Pam Beesly',
                department: 'Marketing',
                position: 'UI/UX Designer',
                skillsRequired: ['Figma', 'Adobe XD', 'User Research'],
                experience: 'Junior (1-3 years)',
                quantity: 1,
                priority: 'Low',
                startDate: '2025-11-25',
                duration: '3 months',
                status: 'approved',
                submittedDate: '2025-10-18'
            },
            {
                id: 'REQ004',
                projectName: 'Project Theta',
                requester: 'Jim Halpert',
                department: 'Engineering',
                position: 'DevOps Engineer',
                skillsRequired: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
                experience: 'Senior (5+ years)',
                quantity: 1,
                priority: 'High',
                startDate: '2025-11-20',
                duration: '8 months',
                status: 'pending',
                submittedDate: '2025-10-21'
            },
            {
                id: 'REQ005',
                projectName: 'Project Lambda',
                requester: 'Angela Martin',
                department: 'Finance',
                position: 'Data Analyst',
                skillsRequired: ['SQL', 'Excel', 'PowerBI'],
                experience: 'Mid-level (3-5 years)',
                quantity: 2,
                priority: 'Medium',
                startDate: '2025-12-10',
                duration: '5 months',
                status: 'rejected',
                submittedDate: '2025-10-19'
            }
        ];
    }

    async getAllRequests() {
        return Promise.resolve([...this.requests]);
    }

    async getRequestById(id) {
        return Promise.resolve(this.requests.find(req => req.id === id));
    }

    async updateRequestStatus(id, status) {
        const request = this.requests.find(req => req.id === id);
        if (request) {
            request.status = status;
        }
        return Promise.resolve({ success: true });
    }
}

// ============================================
// UI MANAGER
// ============================================

class UIManager {
    constructor() {}

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getPriorityColor(priority) {
        const colors = {
            High: '#D0021B',
            Medium: '#F5A623',
            Low: '#4A90E2'
        };
        return colors[priority] || '#6C757D';
    }

    renderRequests(requests) {
        const container = document.getElementById('requestsList');
        
        if (!container) return;

        if (requests.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6C757D; padding: 40px;">No requests found</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        requests.forEach(req => {
            const card = this.createRequestCard(req);
            fragment.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    createRequestCard(req) {
        const card = document.createElement('div');
        card.className = 'request-card';
        card.dataset.id = req.id;

        const header = this.createRequestHeader(req);
        card.appendChild(header);

        const content = this.createRequestContent(req);
        card.appendChild(content);

        if (req.status === 'pending') {
            const actions = this.createRequestActions(req);
            card.appendChild(actions);
        }

        return card;
    }

    createRequestHeader(req) {
        const header = document.createElement('div');
        header.className = 'request-header';

        const info = document.createElement('div');
        info.className = 'request-info';

        const h3 = document.createElement('h3');
        h3.textContent = req.projectName;

        const meta = document.createElement('div');
        meta.className = 'request-meta';
        
        const metaItems = [
            { icon: 'fa-user', text: req.requester },
            { icon: 'fa-building', text: req.department },
            { icon: 'fa-calendar', text: this.formatDate(req.submittedDate) }
        ];

        metaItems.forEach(item => {
            const span = document.createElement('span');
            const icon = document.createElement('i');
            icon.className = `fas ${item.icon}`;
            span.appendChild(icon);
            span.appendChild(document.createTextNode(` ${item.text}`));
            meta.appendChild(span);
        });

        info.appendChild(h3);
        info.appendChild(meta);

        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${req.status}`;
        statusBadge.textContent = this.capitalize(req.status);

        header.appendChild(info);
        header.appendChild(statusBadge);

        return header;
    }

    createRequestContent(req) {
        const content = document.createElement('div');
        content.className = 'request-content';

        const details = document.createElement('div');
        details.className = 'request-details';

        const detailItems = [
            { label: 'Position', value: req.position },
            { label: 'Quantity', value: req.quantity },
            { label: 'Experience', value: req.experience },
            { label: 'Priority', value: req.priority },
            { label: 'Start Date', value: this.formatDate(req.startDate) },
            { label: 'Duration', value: req.duration }
        ];

        detailItems.forEach(item => {
            const detailItem = document.createElement('div');
            detailItem.className = 'detail-item';

            const label = document.createElement('span');
            label.className = 'detail-label';
            label.textContent = item.label;

            const value = document.createElement('span');
            value.className = 'detail-value';
            value.textContent = item.value;

            detailItem.appendChild(label);
            detailItem.appendChild(value);
            details.appendChild(detailItem);
        });

        content.appendChild(details);

        // Skills section
        const skillsSection = document.createElement('div');
        skillsSection.className = 'skills-section';

        const skillsLabel = document.createElement('span');
        skillsLabel.className = 'detail-label';
        skillsLabel.textContent = 'Required Skills:';

        const skillsList = document.createElement('div');
        skillsList.className = 'skills-list';

        req.skillsRequired.forEach(skill => {
            const skillTag = document.createElement('span');
            skillTag.className = 'skill-tag';
            skillTag.textContent = skill;
            skillsList.appendChild(skillTag);
        });

        skillsSection.appendChild(skillsLabel);
        skillsSection.appendChild(skillsList);
        content.appendChild(skillsSection);

        return content;
    }

    createRequestActions(req) {
        const actions = document.createElement('div');
        actions.className = 'request-actions';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-view';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Details';
        viewBtn.onclick = () => window.requestController.viewRequest(req.id);

        const approveBtn = document.createElement('button');
        approveBtn.className = 'btn-approve';
        approveBtn.innerHTML = '<i class="fas fa-check"></i> Approve';
        approveBtn.onclick = () => window.requestController.openApproveModal(req.id);

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn-reject';
        rejectBtn.innerHTML = '<i class="fas fa-times"></i> Reject';
        rejectBtn.onclick = () => window.requestController.openRejectModal(req.id);

        actions.appendChild(viewBtn);
        actions.appendChild(approveBtn);
        actions.appendChild(rejectBtn);

        return actions;
    }
}

// ============================================
// REQUEST CONTROLLER
// ============================================

class RequestController {
    constructor() {
        this.dataService = new DataService();
        this.uiManager = new UIManager();
        this.currentRequestId = null;
        this.currentFilter = '';
    }

    async initialize() {
        await this.loadRequests();
        this.setupEventListeners();
    }

    async loadRequests(filter = '') {
        try {
            ModalManager.showLoading();
            let requests = await this.dataService.getAllRequests();

            if (filter) {
                requests = requests.filter(req => req.status === filter);
            }

            this.uiManager.renderRequests(requests);
        } catch (error) {
            MessageManager.error('Failed to load requests');
            console.error(error);
        } finally {
            ModalManager.hideLoading();
        }
    }

    async viewRequest(id) {
        try {
            const request = await this.dataService.getRequestById(id);
            if (!request) {
                MessageManager.error('Request not found');
                return;
            }

            document.getElementById('viewRequestProjectName').textContent = request.projectName;
            document.getElementById('viewRequestRequester').textContent = request.requester;
            document.getElementById('viewRequestDepartment').textContent = request.department;
            document.getElementById('viewRequestPosition').textContent = request.position;
            document.getElementById('viewRequestQuantity').textContent = request.quantity;
            document.getElementById('viewRequestExperience').textContent = request.experience;
            document.getElementById('viewRequestPriority').textContent = request.priority;
            document.getElementById('viewRequestStartDate').textContent = this.uiManager.formatDate(request.startDate);
            document.getElementById('viewRequestDuration').textContent = request.duration;

            const skillsContainer = document.getElementById('viewRequestSkills');
            skillsContainer.innerHTML = '';
            request.skillsRequired.forEach(skill => {
                const badge = document.createElement('span');
                badge.className = 'skill-badge';
                badge.textContent = skill;
                skillsContainer.appendChild(badge);
            });

            ModalManager.show('viewRequestModal');
        } catch (error) {
            MessageManager.error('Failed to load request details');
            console.error(error);
        }
    }

    openApproveModal(id) {
        this.currentRequestId = id;
        ModalManager.show('approveRequestModal');
    }

    openRejectModal(id) {
        this.currentRequestId = id;
        document.getElementById('rejectReason').value = '';
        ModalManager.show('rejectRequestModal');
    }

    async approveRequest() {
        if (!this.currentRequestId) return;

        try {
            ModalManager.hide('approveRequestModal');
            ModalManager.showLoading();

            await this.dataService.updateRequestStatus(this.currentRequestId, 'approved');
            
            MessageManager.success('Request approved successfully');
            await this.loadRequests(this.currentFilter);
            this.currentRequestId = null;
        } catch (error) {
            MessageManager.error('Failed to approve request');
            console.error(error);
        } finally {
            ModalManager.hideLoading();
        }
    }

    async rejectRequest() {
        if (!this.currentRequestId) return;

        const reason = document.getElementById('rejectReason').value.trim();

        try {
            ModalManager.hide('rejectRequestModal');
            ModalManager.showLoading();

            await this.dataService.updateRequestStatus(this.currentRequestId, 'rejected');
            
            MessageManager.success('Request rejected');
            await this.loadRequests(this.currentFilter);
            this.currentRequestId = null;
        } catch (error) {
            MessageManager.error('Failed to reject request');
            console.error(error);
        } finally {
            ModalManager.hideLoading();
        }
    }

    handleLogout() {
        ModalManager.show('logoutModal');
    }

    async confirmLogout() {
        ModalManager.hide('logoutModal');
        ModalManager.showLoading();
        
        setTimeout(() => {
            ModalManager.hideLoading();
            MessageManager.success('Logged out successfully');
            // Redirect to login page
            // window.location.href = 'login.html';
        }, 1000);
    }

    setupEventListeners() {
        // Filter
        const filterSelect = document.getElementById('requestStatusFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.loadRequests(this.currentFilter);
            });
        }

        // View Request Modal
        const closeViewBtn = document.getElementById('closeViewRequest');
        const closeViewModalBtn = document.getElementById('closeViewRequestModal');
        if (closeViewBtn) {
            closeViewBtn.addEventListener('click', () => ModalManager.hide('viewRequestModal'));
        }
        if (closeViewModalBtn) {
            closeViewModalBtn.addEventListener('click', () => ModalManager.hide('viewRequestModal'));
        }

        // Approve Modal
        const cancelApproveBtn = document.getElementById('cancelApprove');
        const confirmApproveBtn = document.getElementById('confirmApprove');
        if (cancelApproveBtn) {
            cancelApproveBtn.addEventListener('click', () => {
                ModalManager.hide('approveRequestModal');
                this.currentRequestId = null;
            });
        }
        if (confirmApproveBtn) {
            confirmApproveBtn.addEventListener('click', () => this.approveRequest());
        }

        // Reject Modal
        const cancelRejectBtn = document.getElementById('cancelReject');
        const confirmRejectBtn = document.getElementById('confirmReject');
        if (cancelRejectBtn) {
            cancelRejectBtn.addEventListener('click', () => {
                ModalManager.hide('rejectRequestModal');
                this.currentRequestId = null;
            });
        }
        if (confirmRejectBtn) {
            confirmRejectBtn.addEventListener('click', () => this.rejectRequest());
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        const cancelLogoutBtn = document.getElementById('cancelLogout');
        const confirmLogoutBtn = document.getElementById('confirmLogout');
        if (cancelLogoutBtn) {
            cancelLogoutBtn.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogoutBtn) {
            confirmLogoutBtn.addEventListener('click', () => this.confirmLogout());
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
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const controller = new RequestController();
    window.requestController = controller;
    controller.initialize();
});